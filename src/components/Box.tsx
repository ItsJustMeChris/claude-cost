import React from "react";
import { Box as InkBox, Text } from "ink";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  width?: number | string;
  borderColor?: string;
  titleColor?: string;
}

export function Card({ title, children, width, borderColor = "gray", titleColor = "white" }: CardProps) {
  return (
    <InkBox
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      width={width}
    >
      {title && (
        <InkBox marginBottom={0}>
          <Text color={titleColor} bold>
            {title}
          </Text>
        </InkBox>
      )}
      {children}
    </InkBox>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  width?: number;
  color?: string;
  showPercent?: boolean;
}

export function ProgressBar({ value, max, width = 20, color = "green", showPercent = false }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(value / max, 1) : 0;
  const filled = Math.round(percent * width);
  const empty = width - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);

  return (
    <InkBox>
      <Text color={color}>{bar}</Text>
      {showPercent && (
        <Text color="gray"> {(percent * 100).toFixed(0)}%</Text>
      )}
    </InkBox>
  );
}

interface SparklineProps {
  data: number[];
  width?: number;
  color?: string;
}

const SPARK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

export function Sparkline({ data, width = 20, color = "cyan" }: SparklineProps) {
  if (data.length === 0) {
    return <Text color="gray">{"─".repeat(width)}</Text>;
  }

  // Sample data to fit width
  const sampled: number[] = [];
  const step = Math.max(1, Math.floor(data.length / width));
  for (let i = 0; i < data.length; i += step) {
    const slice = data.slice(i, Math.min(i + step, data.length));
    sampled.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }

  // Normalize
  const max = Math.max(...sampled, 0.001);
  const min = Math.min(...sampled, 0);
  const range = max - min || 1;

  const sparkline = sampled
    .slice(-width)
    .map((v) => {
      const normalized = (v - min) / range;
      const index = Math.min(Math.floor(normalized * SPARK_CHARS.length), SPARK_CHARS.length - 1);
      return SPARK_CHARS[index];
    })
    .join("");

  // Pad if needed
  const padded = sparkline.padStart(width, " ");

  return <Text color={color}>{padded}</Text>;
}

interface StatProps {
  label: string;
  value: string;
  valueColor?: string;
  subValue?: string;
}

export function Stat({ label, value, valueColor = "white", subValue }: StatProps) {
  return (
    <InkBox flexDirection="column">
      <Text color="gray">{label}</Text>
      <Text color={valueColor} bold>
        {value}
      </Text>
      {subValue && <Text color="gray" dimColor>{subValue}</Text>}
    </InkBox>
  );
}

interface HorizontalRuleProps {
  char?: string;
  color?: string;
}

export function HorizontalRule({ char = "─", color = "gray" }: HorizontalRuleProps) {
  return (
    <InkBox width="100%">
      <Text color={color}>{char.repeat(60)}</Text>
    </InkBox>
  );
}
