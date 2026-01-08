import React from "react";
import { Box, Text } from "ink";
import { Card } from "./Box.js";
import { formatTokens, formatCost } from "../parser.js";
import { format, startOfWeek, eachDayOfInterval, subDays } from "date-fns";

// GitHub-style contribution colors (green shades)
const CONTRIB_COLORS = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

function getContribColor(value: number, max: number): string {
  if (value === 0) return CONTRIB_COLORS[0]!;
  const normalized = value / max;
  if (normalized < 0.25) return CONTRIB_COLORS[1]!;
  if (normalized < 0.5) return CONTRIB_COLORS[2]!;
  if (normalized < 0.75) return CONTRIB_COLORS[3]!;
  return CONTRIB_COLORS[4]!;
}

const BLOCK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
const BAR_COLORS = ["#2ECC71", "#7BED9F", "#70A1FF", "#5352ED", "#A29BFE", "#FF6B6B", "#FF8E53", "#FFBA49"];

interface DataPoint {
  label: string;
  value: number;
  tokens: number;
}

interface FlowChartProps {
  title: string;
  data: DataPoint[];
  width?: number;
  showLabels?: boolean;
  valueFormatter?: (v: number) => string;
}

export function FlowChart({ title, data, width = 50, showLabels = true, valueFormatter = formatCost }: FlowChartProps) {
  if (data.length === 0) {
    return (
      <Card title={title} borderColor="blue" titleColor="blue">
        <Text color="gray" dimColor>No data available</Text>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 0.001);
  const barWidth = Math.max(1, Math.floor((width - 10) / data.length));

  return (
    <Card title={title} borderColor="blue" titleColor="blue">
      <Box flexDirection="column">
        {/* Chart area */}
        <Box flexDirection="row" height={8}>
          {data.map((point, i) => {
            const normalizedHeight = point.value / maxValue;
            const barHeight = Math.max(0, Math.round(normalizedHeight * 7));
            const color = BAR_COLORS[i % BAR_COLORS.length];

            return (
              <Box key={`${point.label}-${i}`} flexDirection="column" width={barWidth} alignItems="center">
                {/* Empty space above bar */}
                {Array.from({ length: 7 - barHeight }).map((_, j) => (
                  <Text key={`empty-${j}`} color="gray"> </Text>
                ))}
                {/* Bar */}
                {Array.from({ length: barHeight }).map((_, j) => (
                  <Text key={`bar-${j}`} color={color}>█</Text>
                ))}
                {/* Baseline */}
                <Text color="gray">─</Text>
              </Box>
            );
          })}
        </Box>

        {/* Labels */}
        {showLabels && (
          <Box flexDirection="row">
            {data.map((point, i) => (
              <Box key={`label-${point.label}-${i}`} width={barWidth} justifyContent="center">
                <Text color="gray" dimColor>
                  {point.label.slice(0, barWidth - 1)}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Summary */}
        <Box marginTop={1} flexDirection="row" gap={2}>
          <Text color="gray">Peak: </Text>
          <Text color="green" bold>{valueFormatter(maxValue)}</Text>
          <Text color="gray"> Total: </Text>
          <Text color="cyan" bold>{valueFormatter(data.reduce((sum, d) => sum + d.value, 0))}</Text>
          <Text color="gray"> ({formatTokens(data.reduce((sum, d) => sum + d.tokens, 0))} tokens)</Text>
        </Box>
      </Box>
    </Card>
  );
}

interface SparkBarProps {
  data: number[];
  width?: number;
  color?: string;
  label?: string;
}

export function SparkBar({ data, width = 24, color = "#70A1FF", label }: SparkBarProps) {
  if (data.length === 0) {
    return <Text color="gray">{"─".repeat(width)}</Text>;
  }

  const max = Math.max(...data, 0.001);

  // Resample data to fit width
  const resampled: number[] = [];
  const step = data.length / width;
  for (let i = 0; i < width; i++) {
    const startIdx = Math.floor(i * step);
    const endIdx = Math.floor((i + 1) * step);
    const slice = data.slice(startIdx, Math.max(startIdx + 1, endIdx));
    resampled.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }

  const bars = resampled.map(v => {
    const normalized = v / max;
    const charIdx = Math.min(Math.floor(normalized * BLOCK_CHARS.length), BLOCK_CHARS.length - 1);
    return BLOCK_CHARS[charIdx];
  }).join("");

  return (
    <Box>
      {label && <Text color="gray">{label}: </Text>}
      <Text color={color}>{bars}</Text>
    </Box>
  );
}

interface HourlyData {
  hour: number;
  cost: number;
  tokens: number;
}

interface DailyFlowProps {
  hourlyData: HourlyData[];
}

export function DailyFlowChart({ hourlyData }: DailyFlowProps) {
  // Fill in missing hours with zeros
  const filledData: DataPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const hourData = hourlyData.find(d => d.hour === h);
    filledData.push({
      label: h.toString().padStart(2, "0"),
      value: hourData?.cost || 0,
      tokens: hourData?.tokens || 0,
    });
  }

  return (
    <FlowChart
      title="📈 Hourly Cost Flow (Today)"
      data={filledData}
      width={72}
      showLabels={true}
    />
  );
}

interface WeeklyData {
  day: string;
  cost: number;
  tokens: number;
}

interface WeeklyFlowProps {
  dailyData: WeeklyData[];
}

export function WeeklyFlowChart({ dailyData }: WeeklyFlowProps) {
  const data: DataPoint[] = dailyData.slice(0, 7).reverse().map(d => ({
    label: d.day,
    value: d.cost,
    tokens: d.tokens,
  }));

  return (
    <FlowChart
      title="📈 Daily Cost Flow (Week)"
      data={data}
      width={56}
      showLabels={true}
    />
  );
}

interface MonthlyData {
  day: string;
  cost: number;
  tokens: number;
}

interface MonthlyFlowProps {
  dailyData: MonthlyData[];
}

export function MonthlyFlowChart({ dailyData }: MonthlyFlowProps) {
  // Show daily data for the month, reversed so oldest is on left
  const data: DataPoint[] = dailyData.reverse().map(d => ({
    label: d.day.slice(8), // DD only
    value: d.cost,
    tokens: d.tokens,
  }));

  // Sample to show ~15 bars max if there's a lot of data
  let displayData = data;
  if (data.length > 15) {
    const sampled: DataPoint[] = [];
    const step = Math.max(1, Math.floor(data.length / 15));
    for (let i = 0; i < data.length; i += step) {
      const slice = data.slice(i, i + step);
      sampled.push({
        label: slice[0]?.label || "",
        value: slice.reduce((sum, d) => sum + d.value, 0),
        tokens: slice.reduce((sum, d) => sum + d.tokens, 0),
      });
    }
    displayData = sampled;
  }

  return (
    <FlowChart
      title="📈 Daily Cost Flow (Month)"
      data={displayData}
      width={60}
      showLabels={true}
    />
  );
}

interface AllTimeData {
  day: string; // YYYY-MM-DD format
  cost: number;
  tokens: number;
}

interface AllTimeFlowProps {
  dailyData: AllTimeData[];
}

export function AllTimeFlowChart({ dailyData }: AllTimeFlowProps) {
  if (dailyData.length === 0) {
    return (
      <FlowChart
        title="📈 Cost Flow (All Time)"
        data={[]}
        width={60}
        showLabels={true}
      />
    );
  }

  // Sort by date ascending (oldest first)
  const sorted = [...dailyData].sort((a, b) => a.day.localeCompare(b.day));

  // Determine aggregation level based on data span
  const dayCount = sorted.length;

  let data: DataPoint[];
  let title: string;

  if (dayCount > 60) {
    // Group by month for large date ranges
    const monthMap = new Map<string, { cost: number; tokens: number }>();
    for (const d of sorted) {
      const monthKey = d.day.slice(0, 7); // YYYY-MM
      const existing = monthMap.get(monthKey) || { cost: 0, tokens: 0 };
      existing.cost += d.cost;
      existing.tokens += d.tokens;
      monthMap.set(monthKey, existing);
    }

    data = Array.from(monthMap.entries()).map(([month, vals]) => ({
      label: month.slice(5), // MM
      value: vals.cost,
      tokens: vals.tokens,
    }));
    title = "📈 Monthly Cost Flow (All Time)";
  } else if (dayCount > 14) {
    // Group by week for medium date ranges
    const weekMap = new Map<string, { cost: number; tokens: number; label: string }>();
    for (const d of sorted) {
      const date = new Date(d.day);
      // Get week start (Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      const existing = weekMap.get(weekKey) || { cost: 0, tokens: 0, label: weekKey.slice(5) };
      existing.cost += d.cost;
      existing.tokens += d.tokens;
      weekMap.set(weekKey, existing);
    }

    data = Array.from(weekMap.entries()).map(([_, vals]) => ({
      label: vals.label,
      value: vals.cost,
      tokens: vals.tokens,
    }));
    title = "📈 Weekly Cost Flow (All Time)";
  } else {
    // Show daily for small date ranges
    data = sorted.map(d => ({
      label: d.day.slice(5), // MM-DD
      value: d.cost,
      tokens: d.tokens,
    }));
    title = "📈 Daily Cost Flow (All Time)";
  }

  // Sample if still too many bars
  if (data.length > 15) {
    const sampled: DataPoint[] = [];
    const step = Math.max(1, Math.floor(data.length / 15));
    for (let i = 0; i < data.length; i += step) {
      const slice = data.slice(i, i + step);
      sampled.push({
        label: slice[0]?.label || "",
        value: slice.reduce((sum, d) => sum + d.value, 0),
        tokens: slice.reduce((sum, d) => sum + d.tokens, 0),
      });
    }
    data = sampled;
  }

  return (
    <FlowChart
      title={title}
      data={data}
      width={60}
      showLabels={true}
    />
  );
}

// ============ CONTRIBUTION GRAPHS ============

interface HourlyContribData {
  hour: number;
  cost: number;
}

interface HourlyContribProps {
  hourlyData: HourlyContribData[];
}

export function HourlyContribGraph({ hourlyData }: HourlyContribProps) {
  // Fill all 24 hours
  const hours: number[] = [];
  for (let h = 0; h < 24; h++) {
    const data = hourlyData.find(d => d.hour === h);
    hours.push(data?.cost || 0);
  }

  const max = Math.max(...hours, 0.01);
  const total = hours.reduce((sum, h) => sum + h, 0);
  const peakHour = hours.indexOf(Math.max(...hours));

  return (
    <Card title="Activity (Today)" borderColor="gray" titleColor="gray">
      <Box flexDirection="column">
        <Box flexDirection="row" gap={0}>
          {hours.map((cost, h) => (
            <Text key={h} color={getContribColor(cost, max)}>██</Text>
          ))}
        </Box>
        <Box marginTop={0}>
          <Text color="gray" dimColor>
            0           6           12          18        23
          </Text>
        </Box>
        <Box marginTop={0} gap={2}>
          <Text color="gray" dimColor>Total: </Text>
          <Text color="green">{formatCost(total)}</Text>
          <Text color="gray" dimColor> Peak hour: </Text>
          <Text color="cyan">{peakHour}:00</Text>
        </Box>
      </Box>
    </Card>
  );
}

interface DailyContribData {
  date: string;
  cost: number;
}

interface WeeklyContribProps {
  dailyData: DailyContribData[];
}

export function WeeklyContribGraph({ dailyData }: WeeklyContribProps) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: now });

  const dayData = days.map(day => {
    const dateStr = format(day, "yyyy-MM-dd");
    const found = dailyData.find(d => d.date === dateStr);
    return { day, cost: found?.cost || 0, label: format(day, "EEE") };
  });

  const max = Math.max(...dayData.map(d => d.cost), 0.01);
  const total = dayData.reduce((sum, d) => sum + d.cost, 0);

  return (
    <Card title="Activity (This Week)" borderColor="gray" titleColor="gray">
      <Box flexDirection="column">
        <Box flexDirection="row" gap={2}>
          {dayData.map((d, i) => (
            <Box key={i} flexDirection="column" alignItems="center">
              <Text color={getContribColor(d.cost, max)}>██████</Text>
              <Text color="gray" dimColor>{d.label}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1} gap={2}>
          <Text color="gray" dimColor>Total: </Text>
          <Text color="green">{formatCost(total)}</Text>
        </Box>
      </Box>
    </Card>
  );
}

interface MonthlyContribProps {
  dailyData: DailyContribData[];
}

export function MonthlyContribGraph({ dailyData }: MonthlyContribProps) {
  // Build a calendar grid for the current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Get first day of month and calculate offset
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0 = Sunday

  // Build grid: 7 columns (Sun-Sat), multiple rows
  const grid: Array<{ day: number | null; cost: number }> = [];

  // Add empty cells for offset
  for (let i = 0; i < startOffset; i++) {
    grid.push({ day: null, cost: 0 });
  }

  // Add days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const found = dailyData.find(data => data.date === dateStr);
    grid.push({ day: d, cost: found?.cost || 0 });
  }

  // Pad to complete last week
  while (grid.length % 7 !== 0) {
    grid.push({ day: null, cost: 0 });
  }

  const max = Math.max(...grid.map(g => g.cost), 0.01);
  const total = grid.reduce((sum, g) => sum + g.cost, 0);

  // Split into rows
  const rows: typeof grid[] = [];
  for (let i = 0; i < grid.length; i += 7) {
    rows.push(grid.slice(i, i + 7));
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Card title={`Activity (${format(now, "MMMM yyyy")})`} borderColor="gray" titleColor="gray">
      <Box flexDirection="column">
        {/* Day labels */}
        <Box flexDirection="row" gap={1}>
          {dayLabels.map((label, i) => (
            <Text key={i} color="gray" dimColor>{label} </Text>
          ))}
        </Box>
        {/* Calendar grid */}
        {rows.map((row, rowIdx) => (
          <Box key={rowIdx} flexDirection="row" gap={1}>
            {row.map((cell, colIdx) => (
              <Text key={colIdx} color={cell.day ? getContribColor(cell.cost, max) : "#0d1117"}>
                ██
              </Text>
            ))}
          </Box>
        ))}
        <Box marginTop={1} gap={2}>
          <Text color="gray" dimColor>Total: </Text>
          <Text color="green">{formatCost(total)}</Text>
          <Box marginLeft={1}>
            <Text color={CONTRIB_COLORS[0]}>█</Text>
            <Text color="gray" dimColor> Less </Text>
            <Text color={CONTRIB_COLORS[1]}>█</Text>
            <Text color={CONTRIB_COLORS[2]}>█</Text>
            <Text color={CONTRIB_COLORS[3]}>█</Text>
            <Text color={CONTRIB_COLORS[4]}>█</Text>
            <Text color="gray" dimColor> More</Text>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}

interface AllTimeContribProps {
  dailyData: DailyContribData[];
}

export function AllTimeContribGraph({ dailyData }: AllTimeContribProps) {
  // Show last 52 weeks (1 year) in GitHub style: 7 rows (days) x 52 cols (weeks)
  const now = new Date();
  const weeksToShow = Math.min(26, Math.ceil(dailyData.length / 7) || 12); // Up to 26 weeks

  // Build the grid: rows are days of week (Sun-Sat), cols are weeks
  const grid: number[][] = Array.from({ length: 7 }, () => []);

  // Go back weeksToShow weeks
  for (let w = weeksToShow - 1; w >= 0; w--) {
    const weekStart = startOfWeek(subDays(now, w * 7), { weekStartsOn: 0 });
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      const dateStr = format(date, "yyyy-MM-dd");
      const found = dailyData.find(data => data.date === dateStr);
      grid[d]!.push(found?.cost || 0);
    }
  }

  const allValues = grid.flat();
  const max = Math.max(...allValues, 0.01);
  const total = allValues.reduce((sum, v) => sum + v, 0);

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Card title="Activity (All Time)" borderColor="gray" titleColor="gray">
      <Box flexDirection="column">
        {/* Grid: each row is a day of week */}
        {grid.map((row, dayIdx) => (
          <Box key={dayIdx} flexDirection="row">
            <Text color="gray" dimColor>{dayLabels[dayIdx]} </Text>
            {row.map((cost, weekIdx) => (
              <Text key={weekIdx} color={getContribColor(cost, max)}>██</Text>
            ))}
          </Box>
        ))}
        <Box marginTop={1} gap={2}>
          <Text color="gray" dimColor>Total: </Text>
          <Text color="green">{formatCost(total)}</Text>
          <Text color="gray" dimColor> ({dailyData.length} days)</Text>
          <Box marginLeft={1}>
            <Text color={CONTRIB_COLORS[0]}>█</Text>
            <Text color="gray" dimColor> Less </Text>
            <Text color={CONTRIB_COLORS[1]}>█</Text>
            <Text color={CONTRIB_COLORS[2]}>█</Text>
            <Text color={CONTRIB_COLORS[3]}>█</Text>
            <Text color={CONTRIB_COLORS[4]}>█</Text>
            <Text color="gray" dimColor> More</Text>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
