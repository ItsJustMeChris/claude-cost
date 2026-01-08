#!/usr/bin/env bun
import React from "react";
import { render } from "ink";
import { App } from "./components/App.js";

// Parse CLI args
const args = process.argv.slice(2);
const jsonMode = args.includes("--json") || args.includes("-j");
const helpMode = args.includes("--help") || args.includes("-h");

if (helpMode) {
  console.log(`
\x1b[1m\x1b[36mCLAUDE COST\x1b[0m - Beautiful Claude Code Usage Analytics

\x1b[33mUsage:\x1b[0m
  claude-cost          Launch interactive TUI dashboard
  claude-cost --json   Output stats as JSON (for scripts)
  claude-cost --help   Show this help message

\x1b[33mKeyboard Controls (TUI):\x1b[0m
  ↑/↓         Scroll through lists
  Tab         Switch between views (overview/sessions/daily)
  1/2/3/4     Filter by time (today/week/month/all)
  r           Refresh data
  q           Quit

\x1b[33mData Source:\x1b[0m
  Reads from ~/.claude/projects/*/\*.jsonl

\x1b[90mPricing based on LiteLLM model costs\x1b[0m
`);
  process.exit(0);
}

// Check if running in a TTY
const isTTY = process.stdin.isTTY && process.stdout.isTTY;

if (!isTTY || jsonMode) {
  // Non-interactive mode - output stats
  const { parseAllUsage, formatCost, formatTokens } = await import("./parser.js");
  const stats = parseAllUsage();

  const output = {
    totalCost: formatCost(stats.totalCost),
    totalTokens: formatTokens(
      stats.totalTokens.inputTokens + stats.totalTokens.outputTokens +
      stats.totalTokens.cacheCreationTokens + stats.totalTokens.cacheReadTokens
    ),
    sessions: stats.sessions.length,
    messages: stats.entries.length,
    breakdown: Object.fromEntries(
      Object.entries(stats.byModel).map(([model, data]) => [
        data.displayName,
        { cost: formatCost(data.cost), tokens: formatTokens(
          data.tokens.inputTokens + data.tokens.outputTokens +
          data.tokens.cacheCreationTokens + data.tokens.cacheReadTokens
        )}
      ])
    )
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(0);
}

// Clear screen and render TUI
console.clear();
render(<App />);
