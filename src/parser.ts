import { homedir } from "os";
import { join } from "path";
import { readdirSync, existsSync, readFileSync, statSync } from "fs";
import { calculateCost, getModelDisplayName } from "./pricing";

// File-level cache to avoid re-parsing unchanged files
interface FileCache {
  mtime: number;
  entries: UsageEntry[];
}
const fileCache = new Map<string, FileCache>();

// Computed stats cache
interface StatsCache {
  timestamp: number;
  stats: UsageStats;
}
let allEntriesCache: { mtime: number; entries: UsageEntry[] } | null = null;
const statsCache = new Map<string, StatsCache>();
const STATS_CACHE_TTL = 4000; // 4 seconds (refresh is 5s)

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface UsageEntry {
  timestamp: Date;
  model: string;
  usage: TokenUsage;
  cost: number;
  sessionId: string;
  project: string;
  messageId: string;
}

export interface SessionSummary {
  sessionId: string;
  project: string;
  firstMessage: Date;
  lastMessage: Date;
  totalCost: number;
  totalTokens: TokenUsage;
  messageCount: number;
  model: string;
}

export interface DailySummary {
  date: string;
  totalCost: number;
  totalTokens: TokenUsage;
  sessionCount: number;
  messageCount: number;
  byModel: Record<string, { cost: number; tokens: TokenUsage }>;
}

export interface HourlySummary {
  hour: number;
  cost: number;
  tokens: number;
  messageCount: number;
}

export interface UsageStats {
  messageCount: number; // Changed from entries[] to just count - prevents memory leak
  sessions: SessionSummary[];
  daily: DailySummary[];
  hourly: HourlySummary[];
  totalCost: number;
  totalTokens: TokenUsage;
  byModel: Record<string, { cost: number; tokens: TokenUsage; displayName: string }>;
}

const CLAUDE_DIR = join(homedir(), ".claude");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");

function parseJsonlFile(filePath: string): UsageEntry[] {
  try {
    // Check cache first - use mtime to detect changes
    const stat = statSync(filePath);
    const mtime = stat.mtimeMs;
    const cached = fileCache.get(filePath);

    if (cached && cached.mtime === mtime) {
      return cached.entries;
    }

    const entries: UsageEntry[] = [];
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        // Skip non-assistant messages
        if (data.type !== "assistant") continue;

        const message = data.message;
        if (!message?.usage || !message?.model) continue;

        const usage = message.usage;

        // Extract token counts
        const inputTokens = usage.input_tokens || 0;
        const outputTokens = usage.output_tokens || 0;
        const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
        const cacheReadTokens = usage.cache_read_input_tokens || 0;

        // Skip entries with no tokens
        if (inputTokens === 0 && outputTokens === 0 && cacheCreationTokens === 0 && cacheReadTokens === 0) {
          continue;
        }

        const cost = calculateCost(
          message.model,
          inputTokens,
          outputTokens,
          cacheCreationTokens,
          cacheReadTokens
        );

        entries.push({
          timestamp: new Date(data.timestamp),
          model: message.model,
          usage: {
            inputTokens,
            outputTokens,
            cacheCreationTokens,
            cacheReadTokens,
          },
          cost,
          sessionId: data.sessionId || "unknown",
          project: data.cwd || "unknown",
          messageId: message.id || data.uuid || "unknown",
        });
      } catch {
        // Skip malformed lines
      }
    }

    // Cache the result
    fileCache.set(filePath, { mtime, entries });
    return entries;
  } catch {
    // File doesn't exist or can't be read - remove from cache
    fileCache.delete(filePath);
    return [];
  }
}

export function getAllJsonlFiles(): string[] {
  const files: string[] = [];

  if (!existsSync(PROJECTS_DIR)) {
    return files;
  }

  function scanDir(dirPath: string) {
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith(".jsonl")) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  scanDir(PROJECTS_DIR);
  return files;
}

// Get max mtime from all files to detect any changes
function getMaxMtime(files: string[]): number {
  let maxMtime = 0;
  for (const file of files) {
    try {
      const stat = statSync(file);
      if (stat.mtimeMs > maxMtime) {
        maxMtime = stat.mtimeMs;
      }
    } catch {
      // Ignore missing files
    }
  }
  return maxMtime;
}

export function parseAllUsage(since?: Date, until?: Date): UsageStats {
  const now = Date.now();

  // Create cache key based on date range
  const cacheKey = `${since?.getTime() ?? "all"}-${until?.getTime() ?? "all"}`;

  // Check stats cache first
  const cached = statsCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < STATS_CACHE_TTL) {
    return cached.stats;
  }

  const files = getAllJsonlFiles();

  // Check if any files have changed since last cache
  const maxMtime = getMaxMtime(files);
  if (cached && allEntriesCache && allEntriesCache.mtime >= maxMtime) {
    // Files haven't changed, but cache expired - refresh timestamp and return
    statsCache.set(cacheKey, { timestamp: now, stats: cached.stats });
    return cached.stats;
  }

  const allEntries: UsageEntry[] = [];

  for (const file of files) {
    const entries = parseJsonlFile(file);
    allEntries.push(...entries);
  }

  // Update the all-entries cache mtime
  allEntriesCache = { mtime: maxMtime, entries: allEntries };

  // Filter by date range if specified
  let filtered = allEntries;
  if (since) {
    filtered = filtered.filter((e) => e.timestamp >= since);
  }
  if (until) {
    filtered = filtered.filter((e) => e.timestamp <= until);
  }

  // Deduplicate by messageId (same message can appear multiple times during streaming)
  const seenMessages = new Set<string>();
  const deduplicated: UsageEntry[] = [];

  // Sort by timestamp descending to keep latest version of each message
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  for (const entry of filtered) {
    const key = `${entry.sessionId}-${entry.messageId}`;
    if (!seenMessages.has(key)) {
      seenMessages.add(key);
      deduplicated.push(entry);
    }
  }

  // Re-sort by timestamp ascending
  deduplicated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const stats = computeStats(deduplicated);

  // Cache the computed stats
  statsCache.set(cacheKey, { timestamp: now, stats });

  return stats;
}

function computeStats(entries: UsageEntry[]): UsageStats {
  const totalTokens: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };
  let totalCost = 0;

  const byModel: Record<string, { cost: number; tokens: TokenUsage; displayName: string }> = {};
  const sessionMap = new Map<string, UsageEntry[]>();
  const dailyMap = new Map<string, UsageEntry[]>();
  const hourlyMap = new Map<number, { cost: number; tokens: number; messageCount: number }>();

  // Calculate today's start for hourly filtering
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  for (const entry of entries) {
    // Aggregate totals
    totalCost += entry.cost;
    totalTokens.inputTokens += entry.usage.inputTokens;
    totalTokens.outputTokens += entry.usage.outputTokens;
    totalTokens.cacheCreationTokens += entry.usage.cacheCreationTokens;
    totalTokens.cacheReadTokens += entry.usage.cacheReadTokens;

    // Group by model
    if (!byModel[entry.model]) {
      byModel[entry.model] = {
        cost: 0,
        tokens: { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 },
        displayName: getModelDisplayName(entry.model),
      };
    }
    const modelEntry = byModel[entry.model]!;
    modelEntry.cost += entry.cost;
    modelEntry.tokens.inputTokens += entry.usage.inputTokens;
    modelEntry.tokens.outputTokens += entry.usage.outputTokens;
    modelEntry.tokens.cacheCreationTokens += entry.usage.cacheCreationTokens;
    modelEntry.tokens.cacheReadTokens += entry.usage.cacheReadTokens;

    // Group by session
    if (!sessionMap.has(entry.sessionId)) {
      sessionMap.set(entry.sessionId, []);
    }
    sessionMap.get(entry.sessionId)!.push(entry);

    // Group by day (local timezone)
    const day = `${entry.timestamp.getFullYear()}-${String(entry.timestamp.getMonth() + 1).padStart(2, "0")}-${String(entry.timestamp.getDate()).padStart(2, "0")}`;
    if (!dailyMap.has(day)) {
      dailyMap.set(day, []);
    }
    dailyMap.get(day)!.push(entry);

    // Group by hour (only for today's entries)
    if (entry.timestamp >= todayStart) {
      const hour = entry.timestamp.getHours();
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, { cost: 0, tokens: 0, messageCount: 0 });
      }
      const hourlyEntry = hourlyMap.get(hour)!;
      hourlyEntry.cost += entry.cost;
      hourlyEntry.tokens += entry.usage.inputTokens + entry.usage.outputTokens +
        entry.usage.cacheCreationTokens + entry.usage.cacheReadTokens;
      hourlyEntry.messageCount += 1;
    }
  }

  // Build session summaries
  const sessions: SessionSummary[] = [];
  for (const [sessionId, sessionEntries] of sessionMap) {
    const sorted = sessionEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const tokens: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    };
    let cost = 0;

    for (const e of sorted) {
      cost += e.cost;
      tokens.inputTokens += e.usage.inputTokens;
      tokens.outputTokens += e.usage.outputTokens;
      tokens.cacheCreationTokens += e.usage.cacheCreationTokens;
      tokens.cacheReadTokens += e.usage.cacheReadTokens;
    }

    const firstEntry = sorted[0]!;
    const lastEntry = sorted[sorted.length - 1]!;
    sessions.push({
      sessionId,
      project: firstEntry.project,
      firstMessage: firstEntry.timestamp,
      lastMessage: lastEntry.timestamp,
      totalCost: cost,
      totalTokens: tokens,
      messageCount: sorted.length,
      model: lastEntry.model,
    });
  }

  // Sort sessions by last message (most recent first)
  sessions.sort((a, b) => b.lastMessage.getTime() - a.lastMessage.getTime());

  // Build daily summaries
  const daily: DailySummary[] = [];
  for (const [date, dayEntries] of dailyMap) {
    const tokens: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    };
    let cost = 0;
    const dayByModel: Record<string, { cost: number; tokens: TokenUsage }> = {};
    const daySessions = new Set<string>();

    for (const e of dayEntries) {
      cost += e.cost;
      tokens.inputTokens += e.usage.inputTokens;
      tokens.outputTokens += e.usage.outputTokens;
      tokens.cacheCreationTokens += e.usage.cacheCreationTokens;
      tokens.cacheReadTokens += e.usage.cacheReadTokens;
      daySessions.add(e.sessionId);

      if (!dayByModel[e.model]) {
        dayByModel[e.model] = {
          cost: 0,
          tokens: { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 },
        };
      }
      const dayModelEntry = dayByModel[e.model]!;
      dayModelEntry.cost += e.cost;
      dayModelEntry.tokens.inputTokens += e.usage.inputTokens;
      dayModelEntry.tokens.outputTokens += e.usage.outputTokens;
      dayModelEntry.tokens.cacheCreationTokens += e.usage.cacheCreationTokens;
      dayModelEntry.tokens.cacheReadTokens += e.usage.cacheReadTokens;
    }

    daily.push({
      date,
      totalCost: cost,
      totalTokens: tokens,
      sessionCount: daySessions.size,
      messageCount: dayEntries.length,
      byModel: dayByModel,
    });
  }

  // Sort daily by date (most recent first)
  daily.sort((a, b) => b.date.localeCompare(a.date));

  // Build hourly summaries
  const hourly: HourlySummary[] = [];
  for (const [hour, data] of hourlyMap) {
    hourly.push({
      hour,
      cost: data.cost,
      tokens: data.tokens,
      messageCount: data.messageCount,
    });
  }
  // Sort by hour
  hourly.sort((a, b) => a.hour - b.hour);

  return {
    messageCount: entries.length,
    sessions,
    daily,
    hourly,
    totalCost,
    totalTokens,
    byModel,
  };
}

export function formatCost(cost: number): string {
  if (cost >= 1000) {
    return `$${(cost / 1000).toFixed(2)}K`;
  }
  if (cost >= 1) {
    return `$${cost.toFixed(2)}`;
  }
  if (cost >= 0.01) {
    return `$${cost.toFixed(2)}`;
  }
  // Less than 1 cent
  return `${(cost * 100).toFixed(2)}¢`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export function getProjectName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}
