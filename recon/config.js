// recon/config.js
export const systemPrompt = `You reconcile ABOR vs IBOR positions. Given two CSVs:\n\n- Compute instrument-level diffs in quantity and notional\n- Flag exceptions over a threshold (user provided)\n- Summarize by asset class if recognizable (equity, bond, derivative)\n- Output a Markdown table and a JSON block: \n  \`\`\`json\n  { exceptions: [...], totals: {...}, notes: [...] }\n  \`\`\`\n- If output=json, only emit the JSON object.\n- Call out data quality issues (missing price, malformed rows).\n`;

export const examples = {
  abor: `instrument,qty,price\nAAPL,100,195.3\nTSLA,50,250.1\nMSFT,75,410.2`,
  ibor: `instrument,qty,price\nAAPL,100,195.3\nTSLA,40,260.0\nMSFT,80,409.7`,
};

export const models = [
  "gpt-5-mini",
  "gpt-4o-mini",
  "claude-3-5-sonnet",
  "gemini-1.5-flash",
];

