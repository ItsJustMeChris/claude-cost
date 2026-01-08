import React from "react";
import { Box, Text } from "ink";

const LOGO = [
  "┌─────────────────────────────────────────────────────────────┐",
  "│   ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗         │",
  "│  ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝         │",
  "│  ██║     ██║     ███████║██║   ██║██║  ██║█████╗           │",
  "│  ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝           │",
  "│  ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗         │",
  "│   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝         │",
  "│             ██████╗ ██████╗ ███████╗████████╗              │",
  "│            ██╔════╝██╔═══██╗██╔════╝╚══██╔══╝              │",
  "│            ██║     ██║   ██║███████╗   ██║                 │",
  "│            ██║     ██║   ██║╚════██║   ██║                 │",
  "│            ╚██████╗╚██████╔╝███████║   ██║                 │",
  "│             ╚═════╝ ╚═════╝ ╚══════╝   ╚═╝                 │",
  "└─────────────────────────────────────────────────────────────┘",
];

const COLORS = [
  "#FF6B6B", // coral red
  "#FF8E53", // orange
  "#FFBA49", // yellow
  "#7BED9F", // green
  "#70A1FF", // blue
  "#5352ED", // indigo
  "#A29BFE", // purple
  "#FD79A8", // pink
];

export function Header() {
  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      {LOGO.map((line, i) => {
        const colorIndex = Math.floor((i / LOGO.length) * COLORS.length);
        const color = COLORS[colorIndex] || "#FFF";
        return (
          <Text key={i} color={color}>
            {line}
          </Text>
        );
      })}
      <Box marginTop={0}>
        <Text color="gray">Usage Analytics Dashboard • </Text>
        <Text color="cyan">Live Updates</Text>
        <Text color="gray"> • Press </Text>
        <Text color="yellow">q</Text>
        <Text color="gray"> to quit</Text>
      </Box>
    </Box>
  );
}

export function CompactHeader() {
  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      <Box>
        <Text color="#FF6B6B" bold>C</Text>
        <Text color="#FF8E53" bold>L</Text>
        <Text color="#FFBA49" bold>A</Text>
        <Text color="#7BED9F" bold>U</Text>
        <Text color="#70A1FF" bold>D</Text>
        <Text color="#5352ED" bold>E</Text>
        <Text color="white"> </Text>
        <Text color="#A29BFE" bold>C</Text>
        <Text color="#FD79A8" bold>O</Text>
        <Text color="#FF6B6B" bold>S</Text>
        <Text color="#FF8E53" bold>T</Text>
        <Text color="gray" dimColor> │ Usage Analytics Dashboard</Text>
      </Box>
      <Box>
        <Text color="gray">Press </Text>
        <Text color="yellow">↑↓</Text>
        <Text color="gray"> scroll • </Text>
        <Text color="yellow">tab</Text>
        <Text color="gray"> switch view • </Text>
        <Text color="yellow">r</Text>
        <Text color="gray"> refresh • </Text>
        <Text color="yellow">q</Text>
        <Text color="gray"> quit</Text>
      </Box>
    </Box>
  );
}
