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

let provider = null; // { baseUrl, apiKey, models }

$configure.addEventListener('click', async () => {
  try {
    provider = await openaiConfig({
      defaultBaseUrls: [
        'https://api.openai.com/v1',
        'https://llmfoundry.straive.com/openai/v1',
        'https://llmfoundry.straivedemo.com/openai/v1',
      ],
      help: '<div class="alert alert-info">Your key stays in browser storage. No server.</div>',
      show: true,
    });
    $providerStatus.textContent = `Using ${provider.baseUrl}. Models: ${provider.models.slice(0,4).join(', ')}`;
    bootstrapAlert({ title: 'Provider Saved', body: 'Configuration stored locally.', color: 'success' });
  } catch (err) {
    bootstrapAlert({ title: 'Provider Error', body: err.message, color: 'danger' });
  }
});

// Global fetch wrapper with status indicator
globalThis.customFetch = function(url, options) {
  $status.classList.remove('d-none');
  $status.textContent = `Fetching ${url}...`;
  return fetch(url, options);
};

$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const text = document.getElementById('contract').value.trim();
    const category = document.getElementById('category').value;
    const output = document.getElementById('output').value;

    if (!text) {
      bootstrapAlert({ title: 'Input Required', body: 'Please paste contract text or choose an example.', color: 'warning' });
      return;
    }

    // Progress: show streaming
    $status.classList.remove('d-none');
    $status.textContent = 'Analyzing with LLM...';

    const baseUrl = provider?.baseUrl || 'https://llmfoundry.straive.com/openai/v1';
    const apiKey = provider?.apiKey || '';
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
          { role: 'user', content: `Category: ${category}\nOutput: ${output}\n\nContract:\n${text}` },
        ],
      }),
      fetch: globalThis.customFetch,
    })) {
      if (event.error) throw new Error(event.error);
      content = event.content ?? content;
      $results.innerHTML = marked.parse(content);
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

    const allocation = [
      { unit: 'Core FI', basis: category==='vendor' ? 'users' : 'aum', amount: category==='vendor' ? Math.round(fee*0.4) : Math.round(aumB*1e9*0.0035) },
      { unit: 'Credit', basis: category==='vendor' ? 'users' : 'aum', amount: category==='vendor' ? Math.round(fee*0.3) : Math.round(aumB*1e9*0.0015) },
      { unit: 'Quant', basis: category==='vendor' ? 'users' : 'aum', amount: category==='vendor' ? Math.round(fee*0.3) : Math.round(aumB*1e9*0.0005) },
    ];
    const totals = {
      feeAnnualUSD: fee,
      users,
      aumUSD: Math.round(aumB*1e9),
    };

    const md = ['# Allocation (Heuristic)', '', '```json', JSON.stringify({ allocation, totals, assumptions: ['heuristic split 40/30/30'] }, null, 2), '```'].join('\n');
    $results.innerHTML = md.replace(/\n/g,'<br>');
  } catch (err) {
    bootstrapAlert({ title: 'Error', body: err.message, color: 'danger' });
  }
});

