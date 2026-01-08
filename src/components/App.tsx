import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { CompactHeader } from "./Header.js";
import { Summary, QuickStats } from "./Summary.js";
import { ModelBreakdown } from "./ModelBreakdown.js";
import { SessionList, DailyList } from "./SessionList.js";
import {
  DailyFlowChart, WeeklyFlowChart, MonthlyFlowChart, AllTimeFlowChart,
  HourlyContribGraph, WeeklyContribGraph, MonthlyContribGraph, AllTimeContribGraph
} from "./Charts.js";
import { parseAllUsage, type UsageStats } from "../parser.js";
import { startOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

type FocusedBlock = "sessions" | "daily";
type TimeRange = "today" | "week" | "month" | "all";

export function App() {
  const { exit } = useApp();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedBlock, setFocusedBlock] = useState<FocusedBlock>("sessions");
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [sessionsIndex, setSessionsIndex] = useState(0);
  const [dailyIndex, setDailyIndex] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(5);

  const REFRESH_INTERVAL = 5;

  const loadData = () => {
    setLoading(true);
    setError(null);

    try {
      let since: Date | undefined;
      let until: Date | undefined;
      const now = new Date();

      switch (timeRange) {
        case "today":
          since = new Date(now);
          since.setHours(0, 0, 0, 0);
          break;
        case "week":
          // Start of current week (Sunday)
          since = startOfWeek(now, { weekStartsOn: 0 });
          break;
        case "month":
          // Start of current calendar month
          since = startOfMonth(now);
          until = endOfMonth(now);
          break;
        case "all":
        default:
          since = undefined;
      }

      const data = parseAllUsage(since, until);
      setStats(data);

      // Always load all-time stats for QuickStats
      const allData = parseAllUsage();
      setAllTimeStats(allData);

      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  // Countdown timer - ticks every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadData();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRange]);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }

    if (input === "r") {
      loadData();
      setCountdown(REFRESH_INTERVAL);
      return;
    }

    // Tab to switch focused block
    if (key.tab || input === "\t") {
      setFocusedBlock(focusedBlock === "sessions" ? "daily" : "sessions");
      return;
    }

    // Number keys for time range
    if (input === "1") setTimeRange("today");
    if (input === "2") setTimeRange("week");
    if (input === "3") setTimeRange("month");
    if (input === "4") setTimeRange("all");

    // Arrow keys for scrolling within focused block
    if (key.upArrow) {
      if (focusedBlock === "sessions") {
        setSessionsIndex(Math.max(0, sessionsIndex - 1));
      } else {
        setDailyIndex(Math.max(0, dailyIndex - 1));
      }
    }
    if (key.downArrow) {
      if (focusedBlock === "sessions") {
        const maxIndex = (stats?.sessions.length || 1) - 1;
        setSessionsIndex(Math.min(maxIndex, sessionsIndex + 1));
      } else {
        const maxIndex = (stats?.daily.length || 1) - 1;
        setDailyIndex(Math.min(maxIndex, dailyIndex + 1));
      }
    }
  });

  if (loading && !stats) {
    return (
      <Box flexDirection="column" alignItems="center" padding={2}>
        <CompactHeader />
        <Text color="cyan">Loading usage data...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" alignItems="center" padding={2}>
        <CompactHeader />
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press r to retry</Text>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box flexDirection="column" alignItems="center" padding={2}>
        <CompactHeader />
        <Text color="yellow">No usage data found</Text>
      </Box>
    );
  }

  const periodLabel = {
    today: "Today",
    week: "This Week",
    month: format(new Date(), "MMMM yyyy"),
    all: "All Time",
  }[timeRange];

  return (
    <Box flexDirection="column" padding={1}>
      <CompactHeader />

      {/* Time range selector */}
      <Box marginBottom={1} gap={1}>
        <Text color="gray">Time: </Text>
        {(["today", "week", "month", "all"] as TimeRange[]).map((range, i) => (
          <Box key={range}>
            <Text
              color={timeRange === range ? "cyan" : "gray"}
              bold={timeRange === range}
              inverse={timeRange === range}
            >
              {` ${i + 1}:${range.charAt(0).toUpperCase() + range.slice(1)} `}
            </Text>
          </Box>
        ))}
        <Text color="gray"> │ Focus: </Text>
        {(["sessions", "daily"] as FocusedBlock[]).map((block) => (
          <Text
            key={block}
            color={focusedBlock === block ? "yellow" : "gray"}
            bold={focusedBlock === block}
          >
            {focusedBlock === block ? `[${block}]` : block}{" "}
          </Text>
        ))}
        <Text color="gray" dimColor>
          {" "}│ {lastRefresh.toLocaleTimeString()}
        </Text>
      </Box>

      {/* Quick stats bar - always shows all-time data for consistency */}
      <QuickStats stats={allTimeStats || stats} />

      {/* Main content - all blocks visible */}
      <Box flexDirection="column" marginTop={1} gap={1}>
        {/* Top row: Summary + Models | Sessions */}
        <Box flexDirection="row" gap={1}>
          <Box flexDirection="column" gap={1} width="50%">
            <Summary stats={stats} periodLabel={periodLabel} />
            <ModelBreakdown stats={stats} />
          </Box>
          <Box flexDirection="column" gap={1} width="50%">
            <SessionList
              sessions={stats.sessions}
              selectedIndex={focusedBlock === "sessions" ? sessionsIndex : -1}
              maxVisible={8}
              focused={focusedBlock === "sessions"}
            />
          </Box>
        </Box>

        {/* Middle row: Contribution Graph | Daily */}
        <Box flexDirection="row" gap={1}>
          <Box width="50%">
            {timeRange === "today" && (
              <HourlyContribGraph
                hourlyData={stats.hourly.map(h => ({
                  hour: h.hour,
                  cost: h.cost,
                }))}
              />
            )}
            {timeRange === "week" && (
              <WeeklyContribGraph
                dailyData={stats.daily.map(d => ({
                  date: d.date,
                  cost: d.totalCost,
                }))}
              />
            )}
            {timeRange === "month" && (
              <MonthlyContribGraph
                dailyData={stats.daily.map(d => ({
                  date: d.date,
                  cost: d.totalCost,
                }))}
              />
            )}
            {timeRange === "all" && (
              <AllTimeContribGraph
                dailyData={(allTimeStats || stats).daily.map(d => ({
                  date: d.date,
                  cost: d.totalCost,
                }))}
              />
            )}
          </Box>
          <Box width="50%">
            <DailyList
              daily={stats.daily}
              selectedIndex={focusedBlock === "daily" ? dailyIndex : -1}
              maxVisible={8}
              focused={focusedBlock === "daily"}
            />
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} justifyContent="center">
        <Text color="gray" dimColor>
          {stats.messageCount} messages from {stats.sessions.length} sessions
        </Text>
        <Text color="gray"> • </Text>
        {loading ? (
          <Text color="cyan">↻ Refreshing...</Text>
        ) : (
          <Text color="gray" dimColor>Next refresh in {countdown}s</Text>
        )}
      </Box>
    </Box>
  );
}
