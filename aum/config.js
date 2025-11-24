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
  {
    title: "Tiered SMA With Hurdle",
    category: "client",
    text: `Client: Global Endowment. Strategy: Multi-Asset. AUM: $750M. Management Fee: 50 bps on first $500M, 40 bps thereafter. Performance Fee: 15% of returns above 6% hurdle, subject to high-water mark. Cash sweep excluded from AUM.`,
  },
  {
    title: "European UCITS Fee Share",
    category: "client",
    text: `Fund: UCITS European Credit. AUM: EUR 1.2B. Base Fee: 45 bps, paid monthly in arrears. Distribution Fee Share: 20% of platform rebates. Currency: EUR; FX for reporting at ECB reference rate. Fee waivers: 10 bps for seed investors for first 12 months.`,
  },
  {
    title: "Vendor Seats + API Calls",
    category: "vendor",
    text: `Vendor: AlphaSignals. Term: 12 months. Fixed Fee: $90,000/year includes 25 seats. API usage capped at 10M calls/month; overage $0.005 per call. Redistribution permitted to affiliates within same holding company; external redistribution prohibited.`,
  },
  {
    title: "Index Data With Redistribution",
    category: "vendor",
    text: `Vendor: BenchMarkCo. License: real-time index levels + constituents. Fee: $180,000/year. Redistribution allowed to paying clients via research notes (derived data). Entitlements: 200 indices; add-ons $200/index/month. Named user cap 150.`,
  },
  {
    title: "SMAs With Carve-outs",
    category: "client",
    text: `Client: Sovereign Wealth SMA. AUM: $5B. Mgmt Fee: 30 bps, transaction cost pass-through. Carve-outs: $1B in Treasuries excluded from performance fee. Overlay: 5 bps for risk overlay on remaining AUM. Performance: 12% of excess return vs custom benchmark, annual crystallization.`,
  }
];

export const systemPrompt = `You are a contract analyst for an investment manager (PIMCO). Given a contract text in either category:\n\n1) Market Data Vendor (e.g., S&P, Moody's)\n2) Institutional Client Fee Contract\n\nProduce a clear, business-readable allocation summary:\n- Identify fee drivers (fixed, variable, per-instrument, per-user)\n- Derive pricing allocation across business units or strategies\n- Estimate AUM-linked revenue or cost impact\n- Present readable markdown: tables + narrative (no raw JSON)\n- Always call out assumptions and exceptions.`;

export const models = [
  "gpt-5-mini",
  "gpt-4o-mini",
  "claude-3-5-sonnet",
  "gemini-1.5-flash",
];
