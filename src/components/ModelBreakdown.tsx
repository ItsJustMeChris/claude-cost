import React from "react";
import { Box, Text } from "ink";
import { Card, ProgressBar } from "./Box.js";
import type { UsageStats } from "../parser.js";
import { formatCost, formatTokens } from "../parser.js";

const MODEL_COLORS: Record<string, string> = {
  "Opus 4.5": "#FF6B6B",
  "Opus 4": "#FF8E53",
  "Opus 3": "#FFBA49",
  "Sonnet 4": "#70A1FF",
  "Sonnet 3.7": "#5352ED",
  "Sonnet 3.5": "#A29BFE",
  "Sonnet 3": "#B8B5FF",
  "Haiku 3.5": "#7BED9F",
  "Haiku 3": "#2ECC71",
};

interface ModelBreakdownProps {
  stats: UsageStats;
}

export function ModelBreakdown({ stats }: ModelBreakdownProps) {
  const models = Object.entries(stats.byModel)
    .sort(([, a], [, b]) => b.cost - a.cost);

  const maxCost = Math.max(...models.map(([, m]) => m.cost), 0.01);

  return (
    <Card title="📊 Cost by Model" borderColor="cyan" titleColor="cyan">
      <Box flexDirection="column" gap={0}>
        {models.length === 0 ? (
          <Text color="gray" dimColor>No usage data</Text>
        ) : (
          models.map(([model, data]) => {
            const color = MODEL_COLORS[data.displayName] || "#888";
            const totalTokens = data.tokens.inputTokens + data.tokens.outputTokens +
              data.tokens.cacheCreationTokens + data.tokens.cacheReadTokens;

            return (
              <Box key={model} flexDirection="column" marginBottom={0}>
                <Box>
                  <Box width={12}>
                    <Text color={color} bold>{data.displayName}</Text>
                  </Box>
                  <Box width={10}>
                    <Text color="white" bold>{formatCost(data.cost)}</Text>
                  </Box>
                  <ProgressBar
                    value={data.cost}
                    max={maxCost}
                    width={16}
                    color={color}
                  />
                  <Text color="gray" dimColor> {formatTokens(totalTokens)} tok</Text>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Card>
  );
}

export function TokenBreakdown({ stats }: ModelBreakdownProps) {
  const { totalTokens } = stats;
  const total = totalTokens.inputTokens + totalTokens.outputTokens +
    totalTokens.cacheCreationTokens + totalTokens.cacheReadTokens;

  const breakdown = [
    { label: "Input", value: totalTokens.inputTokens, color: "#70A1FF" },
    { label: "Output", value: totalTokens.outputTokens, color: "#FF6B6B" },
    { label: "Cache Write", value: totalTokens.cacheCreationTokens, color: "#FFBA49" },
    { label: "Cache Read", value: totalTokens.cacheReadTokens, color: "#7BED9F" },
  ].filter(b => b.value > 0);

  return (
    <Card title="🔢 Token Distribution" borderColor="magenta" titleColor="magenta">
      <Box flexDirection="column" gap={0}>
        {breakdown.map((item) => (
          <Box key={item.label}>
            <Box width={12}>
              <Text color={item.color}>{item.label}</Text>
            </Box>
            <Box width={10}>
              <Text color="white">{formatTokens(item.value)}</Text>
            </Box>
            <ProgressBar
              value={item.value}
              max={total}
              width={14}
              color={item.color}
              showPercent
            />
          </Box>
        ))}
        <Box marginTop={1} borderStyle="single" borderColor="gray" borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingTop={0}>
          <Text color="gray">Total: </Text>
          <Text color="white" bold>{formatTokens(total)}</Text>
          <Text color="gray"> tokens</Text>
        </Box>
      </Box>
    </Card>
  );
}
