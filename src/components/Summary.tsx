import React from "react";
import { Box, Text } from "ink";
import { Card, Sparkline } from "./Box.js";
import type { UsageStats } from "../parser.js";
import { formatCost, formatTokens } from "../parser.js";
import { startOfWeek, startOfMonth } from "date-fns";

interface SummaryProps {
  stats: UsageStats;
  periodLabel: string;
}

export function Summary({ stats, periodLabel }: SummaryProps) {
  const totalTokens = stats.totalTokens.inputTokens + stats.totalTokens.outputTokens +
    stats.totalTokens.cacheCreationTokens + stats.totalTokens.cacheReadTokens;

  // Calculate cache savings (assuming average Sonnet pricing)
  const regularInputCost = (stats.totalTokens.cacheReadTokens / 1_000_000) * 3;
  const actualCacheReadCost = (stats.totalTokens.cacheReadTokens / 1_000_000) * 0.3;
  const cacheSavings = Math.max(0, regularInputCost - actualCacheReadCost);

  // Get daily costs for sparkline
  const dailyCosts = stats.daily
    .slice()
    .reverse()
    .map(d => d.totalCost);

  return (
    <Card title={`💰 ${periodLabel} Summary`} borderColor="green" titleColor="green">
      <Box flexDirection="column" gap={0}>
        <Box>
          <Box width={18}>
            <Text color="gray">Total Cost</Text>
          </Box>
          <Text color="green" bold>{formatCost(stats.totalCost)}</Text>
        </Box>

        <Box>
          <Box width={18}>
            <Text color="gray">Total Tokens</Text>
          </Box>
          <Text color="cyan">{formatTokens(totalTokens)}</Text>
        </Box>

        <Box>
          <Box width={18}>
            <Text color="gray">Sessions</Text>
          </Box>
          <Text color="yellow">{stats.sessions.length}</Text>
        </Box>

        <Box>
          <Box width={18}>
            <Text color="gray">Messages</Text>
          </Box>
          <Text color="magenta">{stats.entries.length}</Text>
        </Box>

        {cacheSavings > 0 && (
          <Box>
            <Box width={18}>
              <Text color="gray">Cache Savings</Text>
            </Box>
            <Text color="#7BED9F">~{formatCost(cacheSavings)}</Text>
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="gray" dimColor>Daily trend: </Text>
          <Sparkline data={dailyCosts} width={18} color="#70A1FF" />
        </Box>
      </Box>
    </Card>
  );
}

interface QuickStatsProps {
  stats: UsageStats;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const now = new Date();
  // Use local date format to match parser's daily grouping
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayStats = stats.daily.find(d => d.date === today);

  // Current calendar week (Sunday start)
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekDays = stats.daily.filter(d => new Date(d.date) >= weekStart);
  const weekCost = weekDays.reduce((sum, d) => sum + d.totalCost, 0);
  const weekMsgs = weekDays.reduce((sum, d) => sum + d.messageCount, 0);

  // Current calendar month
  const monthStart = startOfMonth(now);
  const monthDays = stats.daily.filter(d => new Date(d.date) >= monthStart);
  const monthCost = monthDays.reduce((sum, d) => sum + d.totalCost, 0);
  const monthMsgs = monthDays.reduce((sum, d) => sum + d.messageCount, 0);

  return (
    <Box flexDirection="row" gap={2}>
      <Card title="Today" borderColor="cyan" titleColor="cyan">
        <Text color="green" bold>{formatCost(todayStats?.totalCost || 0)}</Text>
        <Text color="gray" dimColor> {todayStats?.messageCount || 0} msgs</Text>
      </Card>

      <Card title="This Week" borderColor="blue" titleColor="blue">
        <Text color="green" bold>{formatCost(weekCost)}</Text>
        <Text color="gray" dimColor> {weekMsgs} msgs</Text>
      </Card>

      <Card title="This Month" borderColor="magenta" titleColor="magenta">
        <Text color="green" bold>{formatCost(monthCost)}</Text>
        <Text color="gray" dimColor> {monthMsgs} msgs</Text>
      </Card>

      <Card title="All Time" borderColor="yellow" titleColor="yellow">
        <Text color="green" bold>{formatCost(stats.totalCost)}</Text>
        <Text color="gray" dimColor> {stats.entries.length} msgs</Text>
      </Card>
    </Box>
  );
}
