// recon/script.js
import { openaiConfig } from "bootstrap-llm-provider";
import saveform from "saveform";
import { bootstrapAlert } from "bootstrap-alert";
import { asyncLLM } from "asyncllm";
import { Marked } from "marked";
import { systemPrompt, examples, models } from "./config.js";

const marked = new Marked();
const $form = document.querySelector('#task-form');
const $results = document.getElementById('results');
const $status = document.getElementById('status');
const $configure = document.getElementById('configure-provider');

saveform('#task-form', { exclude: '[type="file"]' });

document.getElementById('abor').value = examples.abor;
document.getElementById('ibor').value = examples.ibor;

let provider = null;
$configure.addEventListener('click', async () => {
  try {
    provider = await openaiConfig({
      defaultBaseUrls: [
        'https://api.openai.com/v1',
        'https://llmfoundry.straive.com/openai/v1',
        'https://llmfoundry.straivedemo.com/openai/v1',
      ],
      show: true,
    });
    bootstrapAlert({ title: 'Provider Saved', body: `Using ${provider.baseUrl}`, color: 'success' });
  } catch (err) {
    bootstrapAlert({ title: 'Provider Error', body: err.message, color: 'danger' });
  }
});

// Progress wrapper
globalThis.customFetch = function(url, options) {
  $status.classList.remove('d-none');
  $status.textContent = `Fetching ${url}...`;
  return fetch(url, options);
};

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(',').map(s=>s.trim().toLowerCase());
  const idx = {
    instrument: header.indexOf('instrument'),
    qty: header.indexOf('qty'),
    price: header.indexOf('price'),
  };
  const rows = [];
  for (const line of lines) {
    const cols = line.split(',').map(s=>s.trim());
    if (cols.length < 2) continue;
    const instrument = cols[idx.instrument] || cols[0];
    const qty = parseFloat(cols[idx.qty] || '0');
    const price = parseFloat(cols[idx.price] || '0');
    rows.push({ instrument, qty, price });
  }
  return rows;
}

function reconcileLocal(aborText, iborText, thresholdFrac) {
  const abor = parseCSV(aborText);
  const ibor = parseCSV(iborText);
  const mapA = new Map(abor.map(r=>[r.instrument, r]));
  const mapI = new Map(ibor.map(r=>[r.instrument, r]));
  const instruments = Array.from(new Set([...mapA.keys(), ...mapI.keys()])).sort();

  const totalAUM = abor.reduce((sum, r)=> sum + (r.qty * (r.price||0)), 0);
  const threshold = totalAUM * thresholdFrac; // fraction of AUM

  const rows = [];
  const exceptions = [];
  for (const inst of instruments) {
    const a = mapA.get(inst) || { qty: 0, price: 0 };
    const i = mapI.get(inst) || { qty: 0, price: 0 };
    const notionalA = a.qty * (a.price || i.price || 0);
    const notionalI = i.qty * (i.price || a.price || 0);
    const diffQty = (a.qty || 0) - (i.qty || 0);
    const diffNotional = notionalA - notionalI;
    const row = { instrument: inst, aborQty: a.qty||0, iborQty: i.qty||0, diffQty, aborNotional: +notionalA.toFixed(2), iborNotional: +notionalI.toFixed(2), diffNotional: +diffNotional.toFixed(2) };
    rows.push(row);
    if (Math.abs(diffNotional) >= threshold) exceptions.push(row);
  }
  const totals = {
    aumApprox: +totalAUM.toFixed(2),
    totalDiffNotional: +rows.reduce((s,r)=> s + r.diffNotional, 0).toFixed(2),
    exceptionsCount: exceptions.length,
    threshold: +threshold.toFixed(2),
  };
  return { rows, exceptions, totals, notes: [] };
}

$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const abor = document.getElementById('abor').value.trim();
    const ibor = document.getElementById('ibor').value.trim();
    const threshold = parseFloat(document.getElementById('threshold').value || '0.01');
    const output = document.getElementById('output').value;

    if (!abor || !ibor) {
      bootstrapAlert({ title: 'Input Required', body: 'Paste ABOR and IBOR CSVs (examples are prefilled).', color: 'warning' });
      return;
    }

    // Local reconciliation first
    $status.classList.remove('d-none');
    $status.textContent = 'Reconciling locally...';
    const result = reconcileLocal(abor, ibor, threshold);
    const md = () => {
      const header = '| Instrument | ABOR Qty | IBOR Qty | Diff Qty | ABOR Notional | IBOR Notional | Diff Notional |\n|---|---:|---:|---:|---:|---:|---:|';
      const body = result.rows.map(r => `| ${r.instrument} | ${r.aborQty} | ${r.iborQty} | ${r.diffQty} | ${r.aborNotional} | ${r.iborNotional} | ${r.diffNotional} |`).join('\n');
      const jsonBlock = '```json\n' + JSON.stringify({ exceptions: result.exceptions, totals: result.totals, notes: result.notes }, null, 2) + '\n```';
      return ['# ABOR <-> IBOR Reconciliation', '', header, body, '', jsonBlock].join('\n');
    };
    $results.innerHTML = marked.parse(output === 'json' ? '```json\n' + JSON.stringify(result, null, 2) + '\n```' : md());

    // If provider configured, get LLM summary/validation
    if (provider) {
      $status.textContent = 'Reconciling via LLM...';
      const baseUrl = provider.baseUrl;
      const apiKey = provider.apiKey || '';
      const model = models[0];
      const request = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
      if (apiKey) request.headers['Authorization'] = `Bearer ${apiKey}`;

      let content = '';
      for await (const event of asyncLLM(`${baseUrl}/chat/completions`, {
        ...request,
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Threshold: ${threshold}\nOutput: ${output}\n\nABOR:\n${abor}\n\nIBOR:\n${ibor}\n\nLocal result:\n${JSON.stringify(result)}` },
          ],
        }),
        fetch: globalThis.customFetch,
      })) {
        if (event.error) throw new Error(event.error);
        content = event.content ?? content;
        $results.innerHTML = marked.parse(content);
      }
    }

    $status.classList.add('d-none');
  } catch (err) {
    $status.classList.add('d-none');
    bootstrapAlert({ title: 'Error', body: err.message, color: 'danger' });
  }
});
