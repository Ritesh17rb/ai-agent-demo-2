// recon/script.js
import { openaiConfig } from "bootstrap-llm-provider";
import saveform from "saveform";
import { bootstrapAlert } from "bootstrap-alert";
import { asyncLLM } from "asyncllm";
import { Marked } from "marked";
import { systemPrompt, examples, models } from "./config.js";

const marked = new Marked();
const $results = document.getElementById('results');
const $llmStatus = document.getElementById('llm-status');
const $configure = document.getElementById('configure-provider');
const $exampleList = document.getElementById('example-list');
const $aborFile = document.getElementById('abor-file');
const $iborFile = document.getElementById('ibor-file');

saveform('#task-form', { exclude: '[type="file"]' });

// Populate examples
examples.forEach(ex => {
  const btn = document.createElement('button');
  btn.className = 'list-group-item list-group-item-action';
  btn.textContent = ex.title;
  btn.addEventListener('click', () => {
    document.getElementById('abor').value = ex.abor;
    document.getElementById('ibor').value = ex.ibor;
  });
  $exampleList.appendChild(btn);
});

// Shared provider across modules
let provider = JSON.parse(localStorage.getItem('bootstrap-llm-provider') || 'null');

$configure.addEventListener('click', async () => {
  try {
    provider = await openaiConfig({
      defaultBaseUrls: [
        'https://llmfoundry.straive.com/openai/v1',
        'https://llmfoundry.straivedemo.com/openai/v1',
      ],
      help: '<div class="alert alert-info">Stored in browser; shared across demos (AUM & Recon).</div>',
      show: true,
    });
    localStorage.setItem('bootstrap-llm-provider', JSON.stringify(provider));
    bootstrapAlert({ title: 'Provider Saved', body: 'Provider available across AUM and Recon.', color: 'success' });
  } catch (err) {
    bootstrapAlert({ title: 'Provider Error', body: err.message, color: 'danger' });
  }
});

// PDF text extraction
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}
async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text.trim();
}

// File inputs (CSV or PDF)
$aborFile?.addEventListener('change', async (e) => {
  try {
    const f = e.target.files?.[0]; if (!f) return;
    const text = f.name.toLowerCase().endsWith('.pdf') ? await extractPdfText(f) : await f.text();
    document.getElementById('abor').value = text;
    bootstrapAlert({ title: 'ABOR Loaded', body: `Parsed ${f.name}.`, color: 'success' });
  } catch (err) { bootstrapAlert({ title: 'File Error', body: err.message, color: 'warning' }); }
});
$iborFile?.addEventListener('change', async (e) => {
  try {
    const f = e.target.files?.[0]; if (!f) return;
    const text = f.name.toLowerCase().endsWith('.pdf') ? await extractPdfText(f) : await f.text();
    document.getElementById('ibor').value = text;
    bootstrapAlert({ title: 'IBOR Loaded', body: `Parsed ${f.name}.`, color: 'success' });
  } catch (err) { bootstrapAlert({ title: 'File Error', body: err.message, color: 'warning' }); }
});

// Submit: LLM builds the table and narrative
document.getElementById('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const abor = document.getElementById('abor').value.trim();
    const ibor = document.getElementById('ibor').value.trim();
    const threshold = parseFloat(document.getElementById('threshold').value || '0.01');

    if (!abor || !ibor) {
      bootstrapAlert({ title: 'Input Required', body: 'Provide ABOR and IBOR (CSV or PDF).', color: 'warning' });
      return;
    }
    if (!provider?.baseUrl) {
      bootstrapAlert({ title: 'LLM Required', body: 'Click Configure LLM to set provider.', color: 'warning' });
      return;
    }

    $llmStatus.textContent = 'Starting LLM stream...';
    const baseUrl = provider.baseUrl;
    const apiKey = provider.apiKey || '';
    const model = (provider.models && provider.models[0]) || models[0];
    const request = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    if (apiKey) request.headers['Authorization'] = `Bearer ${apiKey}`;

    let content = '';
    let chunks = 0;
    const t0 = Date.now();
    const llmSystem = 'Compute ABOR vs IBOR reconciliation and render a clear Markdown table and short summary for business users. No raw JSON.';
    const userMsg = [
      `Exception Threshold (fraction of AUM): ${threshold}`,
      'Required table columns:',
      'Instrument | ABOR Qty | IBOR Qty | Diff Qty | ABOR Notional | IBOR Notional | Diff Notional',
      'Use price * qty for notional; compute AUM from ABOR; consider threshold to identify material exceptions; include a brief summary above the table.',
      '',
      'ABOR Data:', abor,
      '',
      'IBOR Data:', ibor,
    ].join('\n');

    for await (const event of asyncLLM(`${baseUrl}/chat/completions`, {
      ...request,
      body: JSON.stringify({ model, stream: true, messages: [
        { role: 'system', content: llmSystem },
        { role: 'user', content: userMsg },
      ]}),
      fetch: (url, options) => { $llmStatus.textContent = `Fetching ${url}...`; return fetch(url, options); },
    })) {
      if (event.error) { $llmStatus.textContent = `Stream error: ${event.error}`; throw new Error(event.error); }
      content = event.content ?? content;
      $results.innerHTML = marked.parse(content);
      if (event.type === 'open') { $llmStatus.textContent = `Streaming started (model: ${model})...`; }
      else if (event.delta) { chunks += 1; const elapsed = ((Date.now() - t0)/1000).toFixed(1); $llmStatus.textContent = `Streaming... chunks: ${chunks}, elapsed: ${elapsed}s`; }
      else if (event.type === 'response') { $llmStatus.textContent = 'Finalizing response...'; }
      else if (event.type === 'close') { const elapsed = ((Date.now() - t0)/1000).toFixed(1); $llmStatus.textContent = `Completed (${chunks} chunks, ${elapsed}s)`; }
    }
  } catch (err) {
    $llmStatus.textContent = '';
    bootstrapAlert({ title: 'Error', body: err.message, color: 'danger' });
  }
});
