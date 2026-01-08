# claude-cost

Beautiful TUI dashboard for Claude Code usage analytics.

## Install

```bash
npm install -g claude-cost
# or
bun install -g claude-cost
```

## Usage

```bash
# Run the interactive TUI dashboard
claude-cost

# Or run directly without installing
npx claude-cost
bunx claude-cost

# Output stats as JSON (for scripts)
claude-cost --json
```

## Keyboard Controls

| Key | Action |
|-----|--------|
| `↑/↓` | Scroll through lists |
| `Tab` | Switch between views |
| `1/2/3/4` | Filter by time (today/week/month/all) |
| `r` | Refresh data |
| `q` | Quit |

## Data Source

Reads usage data from `~/.claude/projects/*/*.jsonl`
