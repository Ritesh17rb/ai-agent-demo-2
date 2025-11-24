// aum/config.js
export const examples = [
  {
    title: "Moody's Data License",
    category: "vendor",
    text: `Service: Moody's market data feed. Term: 24 months. Fee: $120,000 per annum. Users: 50 named. Usage: internal research across PIMCO strategies. Additional: per-CUSIP surcharge $0.002 for snapshots; redistribution prohibited.`,
  },
  {
    title: "S&P Market Data",
    category: "vendor",
    text: `S&P Global license for daily ratings & credit metrics. Term: 36 months. Base Fee: $240,000/year covering up to 100 internal users. Data entitlement cap at 1M instruments. Overages: $0.001 per instrument per day.`,
  },
  {
    title: "Institutional Client Fee",
    category: "client",
    text: `Client: ACME Pension. Strategy: Core Fixed Income. AUM: $2.5B. Base Mgmt Fee: 35 bps on average monthly AUM. Performance Fee: 10% of alpha over benchmark (Bloomberg Aggregate). Fee breakpoints: 30 bps over $5B.`,
  },
];

export const systemPrompt = `You are a contract analyst for an investment manager (PIMCO). Given a contract text in either category:\n\n1) Market Data Vendor (e.g., S&P, Moody's)\n2) Institutional Client Fee Contract\n\nExtract a clear allocation summary:\n- Identify fee drivers (fixed, variable, per-instrument, per-user)\n- Derive pricing allocation across business units or strategies\n- Estimate AUM-linked revenue or cost impact\n- Output markdown with a table AND a JSON block under \n  \`\`\`json\n  { allocation: [...], totals: {...}, assumptions: [...] }\n  \`\`\`\n- If output=json requested, emit only the JSON object.\n- Always call out assumptions and exceptions.\n`;

export const models = [
  "gpt-5-mini",
  "gpt-4o-mini",
  "claude-3-5-sonnet",
  "gemini-1.5-flash",
];

