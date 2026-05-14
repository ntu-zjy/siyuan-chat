import "server-only";

import { LanguageModelV2, openrouter } from "@openrouter/ai-sdk-provider";
import { LanguageModel } from "ai";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";
import {
  DEFAULT_FILE_PART_MIME_TYPES,
  OPENAI_FILE_MIME_TYPES,
  GEMINI_FILE_MIME_TYPES,
  ANTHROPIC_FILE_MIME_TYPES,
  XAI_FILE_MIME_TYPES,
} from "./file-support";

// CN deploy: every provider group is routed through OpenRouter so a single
// OPENROUTER_API_KEY covers all models. Group keys (openai/google/anthropic/...)
// are kept identical to upstream so plan patterns in seed-plans.ts and the
// image-input registry references below still hold.
const staticModels = {
  openai: {
    "gpt-4.1": openrouter("openai/gpt-4.1"),
    "gpt-4.1-mini": openrouter("openai/gpt-4.1-mini"),
    "o4-mini": openrouter("openai/o4-mini"),
    o3: openrouter("openai/o3"),
    "gpt-5.1-chat": openrouter("openai/gpt-5.1-chat"),
    "gpt-5.1": openrouter("openai/gpt-5.1"),
  },
  google: {
    "gemini-2.5-flash-lite": openrouter("google/gemini-2.5-flash-lite"),
    "gemini-2.5-flash": openrouter("google/gemini-2.5-flash"),
    "gemini-3-pro": openrouter("google/gemini-3-pro-preview"),
    "gemini-2.5-pro": openrouter("google/gemini-2.5-pro"),
  },
  anthropic: {
    "sonnet-4.5": openrouter("anthropic/claude-sonnet-4.5"),
    "sonnet-4.6": openrouter("anthropic/claude-sonnet-4.6"),
    "haiku-4.5": openrouter("anthropic/claude-haiku-4.5"),
    "opus-4.5": openrouter("anthropic/claude-opus-4.5"),
    "opus-4.7": openrouter("anthropic/claude-opus-4.7"),
  },
  xai: {
    "grok-4-1-fast": openrouter("x-ai/grok-4-1-fast"),
    "grok-4-1": openrouter("x-ai/grok-4-1"),
    "grok-3-mini": openrouter("x-ai/grok-3-mini"),
  },
  groq: {
    // Group name retained; Moonshot Kimi served via OpenRouter.
    "kimi-k2-instruct": openrouter("moonshotai/kimi-k2"),
  },
  openRouter: {
    "gpt-oss-20b:free": openrouter("openai/gpt-oss-20b:free"),
    "qwen3-8b:free": openrouter("qwen/qwen3-8b:free"),
    "qwen3-14b:free": openrouter("qwen/qwen3-14b:free"),
    "qwen3-coder:free": openrouter("qwen/qwen3-coder:free"),
    "deepseek-r1:free": openrouter("deepseek/deepseek-r1-0528:free"),
    "deepseek-v3:free": openrouter("deepseek/deepseek-chat-v3-0324:free"),
    "deepseek-v4-flash:free": openrouter("deepseek/deepseek-v4-flash:free"),
    "deepseek-v4-pro": openrouter("deepseek/deepseek-v4-pro"),
    "gemini-2.0-flash-exp:free": openrouter("google/gemini-2.0-flash-exp:free"),
  },
};

const staticUnsupportedModels = new Set([
  staticModels.openai["o4-mini"],
  staticModels.openRouter["gpt-oss-20b:free"],
  staticModels.openRouter["qwen3-8b:free"],
  staticModels.openRouter["qwen3-14b:free"],
  staticModels.openRouter["deepseek-r1:free"],
  staticModels.openRouter["gemini-2.0-flash-exp:free"],
]);

const staticSupportImageInputModels = {
  ...staticModels.google,
  ...staticModels.xai,
  ...staticModels.openai,
  ...staticModels.anthropic,
};

const staticFilePartSupportByModel = new Map<
  LanguageModel,
  readonly string[]
>();

const registerFileSupport = (
  model: LanguageModel | undefined,
  mimeTypes: readonly string[] = DEFAULT_FILE_PART_MIME_TYPES,
) => {
  if (!model) return;
  staticFilePartSupportByModel.set(model, Array.from(mimeTypes));
};

registerFileSupport(staticModels.openai["gpt-4.1"], OPENAI_FILE_MIME_TYPES);
registerFileSupport(
  staticModels.openai["gpt-4.1-mini"],
  OPENAI_FILE_MIME_TYPES,
);
registerFileSupport(staticModels.openai["gpt-5"], OPENAI_FILE_MIME_TYPES);
registerFileSupport(staticModels.openai["gpt-5-mini"], OPENAI_FILE_MIME_TYPES);
registerFileSupport(staticModels.openai["gpt-5-nano"], OPENAI_FILE_MIME_TYPES);

registerFileSupport(
  staticModels.google["gemini-2.5-flash-lite"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-2.5-flash"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-2.5-pro"],
  GEMINI_FILE_MIME_TYPES,
);

registerFileSupport(
  staticModels.anthropic["sonnet-4.5"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["sonnet-4.6"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["opus-4.5"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["opus-4.7"],
  ANTHROPIC_FILE_MIME_TYPES,
);

registerFileSupport(staticModels.xai["grok-4-fast"], XAI_FILE_MIME_TYPES);
registerFileSupport(staticModels.xai["grok-4"], XAI_FILE_MIME_TYPES);
registerFileSupport(staticModels.xai["grok-3"], XAI_FILE_MIME_TYPES);
registerFileSupport(staticModels.xai["grok-3-mini"], XAI_FILE_MIME_TYPES);
registerFileSupport(
  staticModels.openRouter["gemini-2.0-flash-exp:free"],
  GEMINI_FILE_MIME_TYPES,
);

const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

const allModels = { ...openaiCompatibleModels, ...staticModels };

const allUnsupportedModels = new Set([
  ...openaiCompatibleUnsupportedModels,
  ...staticUnsupportedModels,
]);

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return allUnsupportedModels.has(model);
};

const isImageInputUnsupportedModel = (model: LanguageModelV2) => {
  return !(
    Object.values(staticSupportImageInputModels) as LanguageModelV2[]
  ).includes(model);
};

export const getFilePartSupportedMimeTypes = (model: LanguageModel) => {
  return staticFilePartSupportByModel.get(model) ?? [];
};

const fallbackModel = staticModels.openai["gpt-4.1"];

export const customModelProvider = {
  modelsInfo: Object.entries(allModels).map(([provider, models]) => ({
    provider,
    models: Object.entries(models).map(([name, model]) => ({
      name,
      isToolCallUnsupported: isToolCallUnsupportedModel(model),
      isImageInputUnsupported: isImageInputUnsupportedModel(model),
      supportedFileMimeTypes: [...getFilePartSupportedMimeTypes(model)],
    })),
    hasAPIKey: checkProviderAPIKey(provider as keyof typeof staticModels),
  })),
  getModel: (model?: ChatModel): LanguageModel => {
    if (!model) return fallbackModel;
    return allModels[model.provider]?.[model.model] || fallbackModel;
  },
};

function checkProviderAPIKey(_provider: keyof typeof staticModels) {
  // Every provider group is routed through OpenRouter — single key gates them all.
  const key = process.env.OPENROUTER_API_KEY;
  return !!key && key !== "****";
}
