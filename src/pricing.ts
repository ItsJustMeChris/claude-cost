// LiteLLM pricing data for Claude models (prices per million tokens)
// Source: https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json

export interface ModelPricing {
  input: number;        // $ per million input tokens
  output: number;       // $ per million output tokens
  cacheWrite: number;   // $ per million cache creation tokens
  cacheRead: number;    // $ per million cache read tokens
}

// Prices from LiteLLM (converted from per-token to per-million)
// e.g., 5e-06 per token = $5 per million tokens
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude Opus 4.5 - $5/$25 with caching
  "claude-opus-4-5-20251101": {
    input: 5,
    output: 25,
    cacheWrite: 6.25,   // cache_creation_input_token_cost: 6.25e-06
    cacheRead: 0.5,     // cache_read_input_token_cost: 5e-07
  },
  // Claude Sonnet 4.5 - $3/$15 with caching
  "claude-sonnet-4-5-20250929": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  // Claude Haiku 4.5 - $0.80/$4 with caching
  "claude-haiku-4-5-20251001": {
    input: 0.8,
    output: 4,
    cacheWrite: 1,
    cacheRead: 0.08,
  },
  // Claude Opus 4
  "claude-opus-4-20250514": {
    input: 15,
    output: 75,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  // Claude Sonnet 4.5 (older date)
  "claude-sonnet-4-5-20241022": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  // Claude Sonnet 4
  "claude-sonnet-4-20250514": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  // Claude 3.7 Sonnet
  "claude-3-7-sonnet-20250219": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  // Claude 3.5 Sonnet (latest)
  "claude-3-5-sonnet-20241022": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  // Claude 3.5 Sonnet (June)
  "claude-3-5-sonnet-20240620": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  // Claude 3.5 Haiku / Haiku 4.5
  "claude-3-5-haiku-20241022": {
    input: 0.8,
    output: 4,
    cacheWrite: 1,
    cacheRead: 0.08,
  },
  // Claude 3 Opus
  "claude-3-opus-20240229": {
    input: 15,
    output: 75,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
  // Claude 3 Sonnet
  "claude-3-sonnet-20240229": {
    input: 3,
    output: 15,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  // Claude 3 Haiku
  "claude-3-haiku-20240307": {
    input: 0.25,
    output: 1.25,
    cacheWrite: 0.3,
    cacheRead: 0.03,
  },
};

// Fallback pricing for unknown models (use Sonnet pricing as default)
export const DEFAULT_PRICING: ModelPricing = {
  input: 3,
  output: 15,
  cacheWrite: 3.75,
  cacheRead: 0.3,
};

export function getPricing(model: string): ModelPricing {
  // Try exact match first
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model]!;
  }

  // Try partial match
  const modelLower = model.toLowerCase();
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelLower.includes(key.toLowerCase()) || key.toLowerCase().includes(modelLower)) {
      return pricing;
    }
  }

  // Infer from model name
  if (modelLower.includes("opus-4-5") || modelLower.includes("opus-4.5") || modelLower.includes("opus4.5")) {
    return MODEL_PRICING["claude-opus-4-5-20251101"]!;
  }
  if (modelLower.includes("sonnet-4-5") || modelLower.includes("sonnet-4.5") || modelLower.includes("sonnet4.5")) {
    return MODEL_PRICING["claude-sonnet-4-5-20241022"]!;
  }
  if (modelLower.includes("haiku-4-5") || modelLower.includes("haiku-4.5") || modelLower.includes("haiku4.5")) {
    return MODEL_PRICING["claude-3-5-haiku-20241022"]!;
  }
  if (modelLower.includes("opus-4") || modelLower.includes("opus4")) {
    return MODEL_PRICING["claude-opus-4-20250514"]!;
  }
  if (modelLower.includes("sonnet-4") || modelLower.includes("sonnet4")) {
    return MODEL_PRICING["claude-sonnet-4-20250514"]!;
  }
  if (modelLower.includes("3-5-haiku") || modelLower.includes("3.5-haiku")) {
    return MODEL_PRICING["claude-3-5-haiku-20241022"]!;
  }
  if (modelLower.includes("haiku")) {
    return MODEL_PRICING["claude-3-haiku-20240307"]!;
  }
  if (modelLower.includes("opus")) {
    return MODEL_PRICING["claude-3-opus-20240229"]!;
  }
  if (modelLower.includes("sonnet")) {
    return MODEL_PRICING["claude-3-5-sonnet-20241022"]!;
  }

  return DEFAULT_PRICING;
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0
): number {
  const pricing = getPricing(model);

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const cacheWriteCost = (cacheCreationTokens / 1_000_000) * pricing.cacheWrite;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.cacheRead;

  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

export function getModelDisplayName(model: string): string {
  const modelLower = model.toLowerCase();

  if (modelLower.includes("opus-4-5") || modelLower.includes("opus-4.5")) return "Opus 4.5";
  if (modelLower.includes("sonnet-4-5") || modelLower.includes("sonnet-4.5")) return "Sonnet 4.5";
  if (modelLower.includes("haiku-4-5") || modelLower.includes("haiku-4.5")) return "Haiku 4.5";
  if (modelLower.includes("opus-4") || modelLower.includes("opus4")) return "Opus 4";
  if (modelLower.includes("sonnet-4") || modelLower.includes("sonnet4")) return "Sonnet 4";
  if (modelLower.includes("3-7-sonnet") || modelLower.includes("3.7")) return "Sonnet 3.7";
  if (modelLower.includes("3-5-sonnet") || modelLower.includes("3.5-sonnet")) return "Sonnet 3.5";
  if (modelLower.includes("3-5-haiku") || modelLower.includes("3.5-haiku")) return "Haiku 3.5";
  if (modelLower.includes("opus")) return "Opus 3";
  if (modelLower.includes("sonnet")) return "Sonnet 3";
  if (modelLower.includes("haiku")) return "Haiku 3";

  return model.slice(0, 20);
}
