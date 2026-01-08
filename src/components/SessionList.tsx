import React from "react";
import { Box, Text } from "ink";
import { Card } from "./Box.js";
import type { SessionSummary } from "../parser.js";
import { formatCost, formatTokens, getProjectName } from "../parser.js";
import { formatDistanceToNow, format } from "date-fns";

interface SessionListProps {
  sessions: SessionSummary[];
  selectedIndex: number;
  maxVisible?: number;
  focused?: boolean;
}

const MODEL_BADGES: Record<string, { symbol: string; color: string }> = {
  "Opus 4.5": { symbol: "◆", color: "#FF6B6B" },
  "Opus 4": { symbol: "◆", color: "#FF8E53" },
  "Opus 3": { symbol: "◆", color: "#FFBA49" },
  "Sonnet 4": { symbol: "●", color: "#70A1FF" },
  "Sonnet 3.7": { symbol: "●", color: "#5352ED" },
  "Sonnet 3.5": { symbol: "●", color: "#A29BFE" },
  "Sonnet 3": { symbol: "●", color: "#B8B5FF" },
  "Haiku 3.5": { symbol: "○", color: "#7BED9F" },
  "Haiku 3": { symbol: "○", color: "#2ECC71" },
};

function getModelBadge(model: string): { symbol: string; color: string } {
  const modelLower = model.toLowerCase();
  if (modelLower.includes("opus-4-5") || modelLower.includes("opus-4.5")) return MODEL_BADGES["Opus 4.5"]!;
  if (modelLower.includes("opus-4") || modelLower.includes("opus4")) return MODEL_BADGES["Opus 4"]!;
  if (modelLower.includes("sonnet-4") || modelLower.includes("sonnet4")) return MODEL_BADGES["Sonnet 4"]!;
  if (modelLower.includes("3-7-sonnet") || modelLower.includes("3.7")) return MODEL_BADGES["Sonnet 3.7"]!;
  if (modelLower.includes("3-5-sonnet") || modelLower.includes("3.5-sonnet")) return MODEL_BADGES["Sonnet 3.5"]!;
  if (modelLower.includes("3-5-haiku") || modelLower.includes("3.5-haiku")) return MODEL_BADGES["Haiku 3.5"]!;
  if (modelLower.includes("opus")) return MODEL_BADGES["Opus 3"]!;
  if (modelLower.includes("sonnet")) return MODEL_BADGES["Sonnet 3"]!;
  if (modelLower.includes("haiku")) return MODEL_BADGES["Haiku 3"]!;
  return { symbol: "◯", color: "#888" };
}

export function SessionList({ sessions, selectedIndex, maxVisible = 8, focused = false }: SessionListProps) {
  // Calculate visible window
  const startIndex = Math.max(0, Math.min(selectedIndex - Math.floor(maxVisible / 2), sessions.length - maxVisible));
  const visibleSessions = sessions.slice(startIndex, startIndex + maxVisible);
  const showTopIndicator = startIndex > 0;
  const showBottomIndicator = startIndex + maxVisible < sessions.length;

  return (
    <Card
      title={`📝 Recent Sessions${focused ? " (↑↓)" : ""}`}
      borderColor={focused ? "cyan" : "yellow"}
      titleColor={focused ? "cyan" : "yellow"}
    >
      <Box flexDirection="column">
        {showTopIndicator && (
          <Box justifyContent="center">
            <Text color="gray">▲ {startIndex} more</Text>
          </Box>
        )}

        {visibleSessions.length === 0 ? (
          <Text color="gray" dimColor>No sessions found</Text>
        ) : (
          visibleSessions.map((session, i) => {
            const actualIndex = startIndex + i;
            const isSelected = actualIndex === selectedIndex;
            const badge = getModelBadge(session.model);
            const projectName = getProjectName(session.project);
            const timeAgo = formatDistanceToNow(session.lastMessage, { addSuffix: true });
            const totalTokens = session.totalTokens.inputTokens + session.totalTokens.outputTokens +
              session.totalTokens.cacheCreationTokens + session.totalTokens.cacheReadTokens;

            return (
              <Box
                key={`${session.sessionId}-${i}`}
                flexDirection="column"
                paddingX={1}
                paddingY={0}
                borderStyle={isSelected ? "round" : undefined}
                borderColor={isSelected ? "cyan" : undefined}
              >
                <Box>
                  <Text color={badge.color}>{badge.symbol} </Text>
                  <Text color={isSelected ? "cyan" : "white"} bold>
                    {projectName.slice(0, 24).padEnd(24)}
                  </Text>
                  <Text color="green" bold> {formatCost(session.totalCost).padStart(8)}</Text>
                </Box>
                <Box>
                  <Text color="gray">  </Text>
                  <Text color="gray" dimColor>{timeAgo.padEnd(20)}</Text>
                  <Text color="gray" dimColor>{formatTokens(totalTokens)} tok</Text>
                  <Text color="gray" dimColor> • {session.messageCount} msgs</Text>
                </Box>
              </Box>
            );
          })
        )}

        {showBottomIndicator && (
          <Box justifyContent="center">
            <Text color="gray">▼ {sessions.length - startIndex - maxVisible} more</Text>
          </Box>
        )}
      </Box>
    </Card>
  );
}

interface DailyListProps {
  daily: Array<{
    date: string;
    totalCost: number;
    totalTokens: { inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number };
    sessionCount: number;
    messageCount: number;
  }>;
  selectedIndex: number;
  maxVisible?: number;
  focused?: boolean;
}

export function DailyList({ daily, selectedIndex, maxVisible = 8, focused = false }: DailyListProps) {
  const startIndex = Math.max(0, Math.min(selectedIndex - Math.floor(maxVisible / 2), daily.length - maxVisible));
  const visibleDays = daily.slice(startIndex, startIndex + maxVisible);
  const maxCost = Math.max(...daily.map(d => d.totalCost), 0.01);
  const showTopIndicator = startIndex > 0;
  const showBottomIndicator = startIndex + maxVisible < daily.length;

  return (
    <Card
      title={`📅 Daily Costs${focused ? " (↑↓)" : ""}`}
      borderColor={focused ? "cyan" : "green"}
      titleColor={focused ? "cyan" : "green"}
    >
      <Box flexDirection="column">
        {showTopIndicator && (
          <Box justifyContent="center">
            <Text color="gray">▲ {startIndex} more</Text>
          </Box>
        )}

        {visibleDays.length === 0 ? (
          <Text color="gray" dimColor>No daily data</Text>
        ) : (
          visibleDays.map((day, i) => {
            const actualIndex = startIndex + i;
            const isSelected = actualIndex === selectedIndex;
            const isToday = day.date === new Date().toISOString().slice(0, 10);
            const barWidth = Math.max(1, Math.round((day.totalCost / maxCost) * 20));
            const bar = "█".repeat(barWidth);
            const totalTokens = day.totalTokens.inputTokens + day.totalTokens.outputTokens +
              day.totalTokens.cacheCreationTokens + day.totalTokens.cacheReadTokens;

            return (
              <Box
                key={`${day.date}-${i}`}
                paddingX={1}
                borderStyle={isSelected ? "round" : undefined}
                borderColor={isSelected ? "cyan" : undefined}
              >
                <Text color={isToday ? "cyan" : "gray"}>
                  {format(new Date(day.date), "MMM dd")}
                </Text>
                <Text color="green" bold> {formatCost(day.totalCost).padStart(8)} </Text>
                <Text color="#70A1FF">{bar.padEnd(20)}</Text>
                <Text color="gray" dimColor> {formatTokens(totalTokens)}</Text>
              </Box>
            );
          })
        )}

        {showBottomIndicator && (
          <Box justifyContent="center">
            <Text color="gray">▼ {daily.length - startIndex - maxVisible} more</Text>
          </Box>
        )}
      </Box>
    </Card>
  );
}
