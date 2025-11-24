// aum/script.js
import { openaiConfig } from "bootstrap-llm-provider";
import saveform from "saveform";
import { bootstrapAlert } from "bootstrap-alert";
import { asyncLLM } from "asyncllm";
import { Marked } from "marked";
import { examples, systemPrompt, models } from "./config.js";

const marked = new Marked();
const $form = document.querySelector('#task-form');
const $results = document.getElementById('results');
const $status = document.getElementById('status');
const $exampleList = document.getElementById('example-list');
const $configure = document.getElementById('configure-provider');
const $providerStatus = document.getElementById('provider-status');
const $runOffline = document.getElementById('run-offline');
const $file = document.getElementById('contract-file');
const $llmStatus = document.getElementById('llm-status');

// Persist form inputs
saveform('#task-form', { exclude: '[type="file"]' });

// Populate examples
examples.forEach((ex, i) => {
  const btn = document.createElement('button');
  btn.className = 'list-group-item list-group-item-action';
  btn.textContent = ex.title;
  btn.addEventListener('click', () => {
    document.getElementById('contract').value = ex.text;
    document.getElementById('category').value = ex.category;
  });
  $exampleList.appendChild(btn);
});

// Shared provider across pages: read persisted value first
let provider = JSON.parse(localStorage.getItem('bootstrap-llm-provider') || 'null');

$configure.addEventListener('click', async () => {
  try {
    provider = await openaiConfig({
      defaultBaseUrls: [
        'https://llmfoundry.straive.com/openai/v1',
        'https://llmfoundry.straivedemo.com/openai/v1',
      ],
      help: '<div class="alert alert-info">Your key is stored locally and reused across demos (AUM & Recon).</div>',
      show: true,
    });
    localStorage.setItem('bootstrap-llm-provider', JSON.stringify(provider));
    $providerStatus.textContent = `Using ${provider.baseUrl}. Models: ${provider.models.slice(0,4).join(', ')}`;
    bootstrapAlert({ title: 'Provider Saved', body: 'Configuration stored locally for reuse.', color: 'success' });
  } catch (err) {
    bootstrapAlert({ title: 'Provider Error', body: err.message, color: 'danger' });
  }
});

// Global fetch wrapper with status indicator
globalThis.customFetch = function(url, options) {
  $llmStatus.textContent = `Fetching ${url}...`;
  return fetch(url, options);
};

// Configure pdf.js worker if available
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// Read uploaded contract file (.txt, .pdf, .docx) and populate textarea
async function extractPdfText(arrayBuffer) {
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n\n';
  }
  return text.trim();
}

async function readContractFile(file) {
  const name = (file.name || '').toLowerCase();
  const ext = name.split('.').pop();
  if (ext === 'txt' || file.type === 'text/plain') {
    return await file.text();
  }
  if (ext === 'docx') {
    const buf = await file.arrayBuffer();
    if (!window.mammoth) throw new Error('DOCX reader not loaded');
    const res = await window.mammoth.extractRawText({ arrayBuffer: buf });
    return (res.value || '').trim();
  }
  if (ext === 'pdf') {
    const buf = await file.arrayBuffer();
    if (!window.pdfjsLib) throw new Error('PDF reader not loaded');
    return await extractPdfText(buf);
  }
  throw new Error('Unsupported file type. Please upload .txt, .pdf, or .docx');
}

$file?.addEventListener('change', async (e) => {
  try {
    const f = e.target.files?.[0];
    if (!f) return;
    $status.classList.remove('d-none');
    $status.textContent = `Reading ${f.name}...`;
    const text = await readContractFile(f);
    document.getElementById('contract').value = text;
    $status.classList.add('d-none');
    bootstrapAlert({ title: 'File Loaded', body: `Parsed ${f.name}.`, color: 'success' });
  } catch (err) {
    $status.classList.add('d-none');
    bootstrapAlert({ title: 'File Error', body: err.message, color: 'warning' });
  }
});

$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const text = document.getElementById('contract').value.trim();
    const category = document.getElementById('category').value;

    if (!text) {
      bootstrapAlert({ title: 'Input Required', body: 'Please paste contract text or upload a document.', color: 'warning' });
      return;
    }

    // Show streaming status using asyncllm events (no JSON output)
    $status.classList.remove('d-none');
    $status.textContent = 'Starting LLM stream...';

    const saved = JSON.parse(localStorage.getItem('bootstrap-llm-provider')||'{}');
    const baseUrl = (saved.baseUrl) || (provider?.baseUrl) || 'https://llmfoundry.straive.com/openai/v1';
    const apiKey = (saved.apiKey) || (provider?.apiKey) || '';
    const model = (saved.models && saved.models[0]) || (provider?.models && provider.models[0]) || 'gpt-5-mini';

    const request = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    if (apiKey) request.headers['Authorization'] = `Bearer ${apiKey}`;

    let content = '';
    let chunks = 0;
    const t0 = Date.now();
    const sys = systemPrompt.replace('```json','').replace('```',''); // remove JSON instruction

    for await (const event of asyncLLM(`${baseUrl}/chat/completions`, {
      ...request,
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: sys + '\nDo not output raw JSON. Present markdown tables and narrative only.' },
          { role: 'user', content: `Category: ${category}\n\nContract:\n${text}` },
        ],
      }),
      fetch: globalThis.customFetch,
    })) {
      if (event.error) {
        $llmStatus.textContent = `Stream error: ${event.error}`;
        throw new Error(event.error);
      }
      content = event.content ?? content;
      $results.innerHTML = marked.parse(content);
      if (event.type === 'open') {
        $llmStatus.textContent = `Streaming started (model: ${model})...`;
      } else if (event.delta) {
        chunks += 1;
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        $llmStatus.textContent = `Streaming... chunks: ${chunks}, elapsed: ${elapsed}s`;
      } else if (event.type === 'response') {
        $llmStatus.textContent = 'Finalizing response...';
      } else if (event.type === 'close') {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        $llmStatus.textContent = `Completed (${chunks} chunks, ${elapsed}s)`;
      }
    }

    $status.classList.add('d-none');
  } catch (err) {
    $status.classList.add('d-none');
    bootstrapAlert({ title: 'Error', body: err.message, color: 'danger' });
  }
});

// Offline run: simple heuristic parser so users can try without LLM
$runOffline.addEventListener('click', () => {
  try {
    const text = document.getElementById('contract').value.trim() || examples[0].text;
    const category = document.getElementById('category').value;
    const feeMatch = text.match(/\$([0-9,]+)\s*per\s*(annum|year)/i);
    const usersMatch = text.match(/(\d+)\s*(named|internal)\s*users/i);
    const aumMatch = text.match(/AUM:\s*\$?([0-9.]+)\s*B/i);

    const fee = feeMatch ? parseInt(feeMatch[1].replace(/,/g,''),10) : 0;
    const users = usersMatch ? parseInt(usersMatch[1],10) : 0;
    const aumB = aumMatch ? parseFloat(aumMatch[1]) : 2.5;

    const rows = [
      ['Unit','Basis','Amount'],
      ['Core FI', category==='vendor' ? 'users' : 'aum', (category==='vendor' ? Math.round(fee*0.4) : Math.round(aumB*1e9*0.0035)).toLocaleString()],
      ['Credit', category==='vendor' ? 'users' : 'aum', (category==='vendor' ? Math.round(fee*0.3) : Math.round(aumB*1e9*0.0015)).toLocaleString()],
      ['Quant', category==='vendor' ? 'users' : 'aum', (category==='vendor' ? Math.round(fee*0.3) : Math.round(aumB*1e9*0.0005)).toLocaleString()],
    ];
    const table = ['| ' + rows[0].join(' | ') + ' |', '|---|---|---|', rows.slice(1).map(r=>`| ${r.join(' | ')} |`).join('\n')].join('\n');
    const bullets = [
      `- Fee (annual): $${fee.toLocaleString()}`,
      `- Users: ${users}`,
      `- AUM: $${Math.round(aumB*1e9).toLocaleString()}`,
      `- Assumptions: heuristic split 40/30/30`,
    ].join('\n');
    const md = ['# Allocation (Heuristic)', '', table, '', '## Notes', bullets].join('\n');
    $results.innerHTML = marked.parse(md);
  } catch (err) {
    bootstrapAlert({ title: 'Error', body: err.message, color: 'danger' });
  }
});
