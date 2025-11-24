# Agentic AI: AUM Allocation & ABOR?IBOR Reconciliation

Front?end applications that showcase live LLM streaming, client?side parsing, and business?readable outputs.

- AUM / Pricing Allocator (aum/)
- ABOR ? IBOR Reconciliation (recon/)

Both pages run entirely in the browser, stream results via `asyncllm`, and share a single LLM provider configuration saved in browser storage.

## Features
- 100% client?side (no server): all text/file parsing and LLM calls happen in your browser.
- Live streaming: incremental updates from the model using `asyncllm`.
- Shared provider config: configured once, reused across AUM and Recon.
- File uploads:
  - AUM: `.txt`, `.pdf`, `.docx` (text extracted locally; no uploads)
  - Recon: `.csv` and `.pdf` (text extracted locally; LLM builds the table)
- Business?readable outputs: Markdown tables + narrative (no raw JSON in final output).
- Realistic examples: curated example inputs for quick testing.

## Quick Start
1. Clone or download this repository.
2. Open `index.html` in a modern browser (Chrome/Edge/Firefox). No build steps needed.
3. Select an application.
4. Configure the LLM provider once (OpenAI?compatible endpoint). The key/base URL are stored locally and reused across both pages.

Tip: If your browser blocks `file://` module imports, serve the folder with any static server (e.g., `npx http-server .`) and browse to `http://localhost:8080`.

## LLM Provider Configuration
Both AUM and Recon use the same provider configuration, stored under `localStorage['bootstrap-llm-provider']`.

- Click ?Configure Provider? on either page.
- Choose a base URL (OpenAI?compatible `/chat/completions`) and enter your API key.
- Your key is stored only in browser storage and added to the `Authorization: Bearer` header for requests from your browser.
- Defaults point to `https://llmfoundry.straive.com/openai/v1` and `https://llmfoundry.straivedemo.com/openai/v1`.

## AUM / Pricing Allocator
Path: `aum/`

Purpose
- Accept contract text (vendor or client) and produce an allocation summary (tables + narrative) suitable for business review.
- Live streaming results from the LLM.
- Offline ?Run Sample Without LLM? button for a quick heuristic output.

Inputs
- Paste text, or upload `.txt`, `.pdf`, or `.docx` (text extracted locally via `pdf.js` and `mammoth`).
- Choose category: `Market Data Vendor` or `Institutional Client`.

Output (no JSON)
- Readable Markdown only (tables + narrative). The prompt explicitly instructs the model to avoid raw JSON.
- In offline mode, a small Markdown table with bullet notes is generated heuristically.

Implementation
- UI: `aum/index.html` (sticky header; examples list; provider card)
- Logic: `aum/script.js`
  - Streaming with `asyncllm` (status in the blue alert + `#llm-status`)
  - File parsing: `pdf.js` for PDFs, `mammoth` for DOCX
  - Provider sharing: reads/saves config in `localStorage`
- Prompt/Examples: `aum/config.js`

## ABOR ? IBOR Reconciliation
Path: `recon/`

Purpose
- Build the reconciliation table and narrative via the LLM from ABOR and IBOR inputs.
- Stream results live; status shown below the results.
- Provide 8 realistic example data sets (equities/options, bonds/futures, FX rounding, credit/derivs, commodities/notes, ETF + corp actions, emerging, alternatives).

Inputs
- Paste or upload ABOR/IBOR as `.csv` or `.pdf` (PDF text extracted locally via `pdf.js`).
- Exception Threshold: fraction of AUM used to decide material exceptions (computed from ABOR notionals).

Output (no JSON)
- Business?readable Markdown: a short summary and a table with columns:
  `Instrument | ABOR Qty | IBOR Qty | Diff Qty | ABOR Notional | IBOR Notional | Diff Notional`.

Implementation
- UI: `recon/index.html` (sticky header; examples sidebar; file inputs accept `.csv,.pdf`; `#llm-status`)
- Logic: `recon/script.js`
  - Streaming with `asyncllm`; LLM builds the table from provided ABOR/IBOR
  - PDF text extraction via `pdf.js`
  - Provider sharing: reads/saves config in `localStorage`
- Prompt/Examples: `recon/config.js`

## Streaming and Status
Both pages stream model output via `asyncllm` with event?driven status updates:
- `open`: ?Streaming started ??
- `delta`: chunk counter and elapsed seconds
- `response`: ?Finalizing ??
- `close`: ?Completed ??
- `error`: shown in status and as a toast (via `bootstrap-alert`)

## Privacy & Security
- No server: documents and inputs are processed entirely in your browser.
- API keys: stored in `localStorage` (browser storage) under the `bootstrap-llm-provider` key and sent only to the configured base URL.

## File Structure
```
index.html          # Landing page linking to the two applications

aum/
  index.html        # UI: contract text, examples, provider config
  script.js         # Logic: uploads, streaming, status, shared provider
  config.js         # Prompt and example contracts (markdown-only output)

recon/
  index.html        # UI: ABOR/IBOR (CSV or PDF), options, examples, provider
  script.js         # Logic: PDF/CSV inputs, streaming, shared provider
  config.js         # Prompt and 8 realistic example pairs
```

## Troubleshooting
- No streaming or no output
  - Ensure you configured the provider (click ?Configure LLM?) and a valid model.
  - Verify base URL is OpenAI?compatible and your key is correct.
- Recon says ?LLM Required?
  - Recon builds the table via LLM; configure a provider first.
- PDF upload not parsed
  - Only text?based PDFs are supported; scanned PDFs require OCR (not included).
- Browser blocks modules from `file://`
  - Serve with any static server (e.g., `npx http-server .`) to avoid module import issues.

## Limitations
- No OCR for scanned PDFs; only text PDFs are supported.
- Provider must expose an OpenAI?compatible `/chat/completions` API.
- Outputs are intentionally narrative/markdown only; raw JSON is suppressed for business readability.

## Libraries
- UI: Bootstrap 5, Bootstrap Icons, `bootstrap-dark-theme`
- Streaming: [`asyncllm`](https://www.npmjs.com/package/asyncllm)
- Provider picker: [`bootstrap-llm-provider`](https://www.npmjs.com/package/bootstrap-llm-provider)
- Alerts: [`bootstrap-alert`](https://www.npmjs.com/package/bootstrap-alert)
- Text parsing: [`pdf.js`](https://mozilla.github.io/pdf.js/), [`mammoth`](https://github.com/mwilliamson/mammoth.js)
- Markdown: [`marked`](https://marked.js.org/)
- State: [`saveform`](https://www.npmjs.com/package/saveform)
