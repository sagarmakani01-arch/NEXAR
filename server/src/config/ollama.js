// AI Model Configuration — Ollama (local) + Groq + OpenRouter (all free)

import { rateMonitor } from '../services/ProviderRateMonitor.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

function env(key) { return process.env[key] || ''; }

function groqEnabled()      { return !!env('GROQ_API_KEY'); }
function openrouterEnabled() { return !!env('OPENROUTER_API_KEY'); }

const FREE_PROVIDER_CONFIG = {
  ollama: {
    apiKey: 'ollama',
    baseURL: OLLAMA_BASE_URL,
    model: OLLAMA_MODEL,
    defaultParams: { temperature: 0.3, top_p: 0.95, max_tokens: 8192, stream: true }
  },
  groq: {
    apiKey: () => env('GROQ_API_KEY'),
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    defaultParams: { temperature: 0.3, top_p: 0.95, max_tokens: 2048, stream: true }
  },
  openrouter: {
    apiKey: () => env('OPENROUTER_API_KEY'),
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'openrouter/free',
    defaultParams: { temperature: 0.3, top_p: 0.95, max_tokens: 8192, stream: true }
  }
};

const OPENROUTER_FREE_MODELS = [
  { id: 'openrouter-free', model: 'openrouter/free', label: 'OpenRouter auto (best free model)' },
  { id: 'or-nemotron-ultra', model: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra 550B' },
  { id: 'or-nemotron-super', model: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B' },
  { id: 'or-nemotron-nano-omni', model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', label: 'Nemotron 3 Nano Omni 30B' },
  { id: 'or-nemotron-nano', model: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano 30B' },
  { id: 'or-nemotron-nano-12b', model: 'nvidia/nemotron-nano-12b-v2-vl:free', label: 'Nemotron Nano 12B VL' },
  { id: 'or-nemotron-nano-9b', model: 'nvidia/nemotron-nano-9b-v2:free', label: 'Nemotron Nano 9B' },
  { id: 'or-gpt-oss-120b', model: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B' },
  { id: 'or-gpt-oss-20b', model: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B' },
  { id: 'or-llama-3.3-70b', model: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B' },
  { id: 'or-llama-3.2-3b', model: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B' },
  { id: 'or-hermes-405b', model: 'nousresearch/hermes-3-llama-3.1-405b:free', label: 'Hermes 3 405B' },
  { id: 'or-nex-n2-pro', model: 'nex-agi/nex-n2-pro:free', label: 'Nex AGI N2 Pro 397B' },
  { id: 'or-laguna-m1', model: 'poolside/laguna-m.1:free', label: 'Poolside Laguna M.1' },
  { id: 'or-laguna-xs2', model: 'poolside/laguna-xs.2:free', label: 'Poolside Laguna XS.2' },
  { id: 'or-qwen3-coder', model: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder' },
  { id: 'or-qwen3-next-80b', model: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next 80B' },
  { id: 'or-gemma-4-31b', model: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B' },
  { id: 'or-gemma-4-26b', model: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B' },
  { id: 'or-cohere-north', model: 'cohere/north-mini-code:free', label: 'Cohere North Mini Code' },
  { id: 'or-dolphin-24b', model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', label: 'Dolphin Mistral 24B' },
  { id: 'or-liquid-1.2b', model: 'liquid/lfm-2.5-1.2b-instruct:free', label: 'Liquid LFM 1.2B' },
  { id: 'or-liquid-thinking', model: 'liquid/lfm-2.5-1.2b-thinking:free', label: 'Liquid LFM 1.2B (thinking)' },
];

function resolveProviderConfig(provider) {
  const cfg = FREE_PROVIDER_CONFIG[provider];
  if (!cfg) return FREE_PROVIDER_CONFIG.ollama;
  const apiKey = typeof cfg.apiKey === 'function' ? cfg.apiKey() : cfg.apiKey;
  return { ...cfg, apiKey };
}

function getActiveProviders() {
  const active = { ollama: resolveProviderConfig('ollama') };
  if (groqEnabled())      active.groq      = resolveProviderConfig('groq');
  if (openrouterEnabled()) active.openrouter = resolveProviderConfig('openrouter');
  return active;
}

function getModels() {
  const models = {
    'ollama-default': { provider: 'ollama', model: OLLAMA_MODEL, label: `${OLLAMA_MODEL} (Ollama)` }
  };
  if (groqEnabled()) {
    models['groq-llama3-70b'] = { provider: 'groq', model: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq — free)' };
    models['groq-llama3-8b'] = { provider: 'groq', model: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq — free)' };
  }
  if (openrouterEnabled()) {
    for (const m of OPENROUTER_FREE_MODELS) {
      models[m.id] = { provider: 'openrouter', model: m.model, label: m.label };
    }
  }
  return models;
}

function getDefaultParams() {
  return getActiveProviders().ollama.defaultParams;
}

const systemPrompts = {
  codeGeneration: `You are an expert full-stack developer. Generate production-ready, clean, well-documented code.
Guidelines:
- Write modern ES6+/TypeScript code
- Use best practices (error handling, validation, security)
- Include meaningful comments
- Follow project structure conventions
- Optimize for performance and accessibility
- No placeholder code - everything must work
- No watermarks, attribution text, or branding of any kind
- Output each file using this format:

===FILE: path/to/file.ext===
<file content here>
===ENDFILE===

Example:
===FILE: src/App.jsx===
import React from 'react';
export default function App() { return <div>Hello</div>; }
===ENDFILE===`,

  codeReview: `You are a senior code reviewer. Analyze code for:
- Security vulnerabilities
- Performance issues
- Best practice violations
- Bugs and edge cases
- Maintainability concerns
Provide specific, actionable feedback with line references.`,

  debugging: `You are a debugging expert. Given code and error messages:
1. Identify the root cause
2. Explain why it happens
3. Provide the fix with explanation
4. Suggest prevention strategies`,

  architecture: `You are a software architect. Design scalable, maintainable systems.
Consider: separation of concerns, design patterns, scalability, testing, deployment.`,

  fullStack: `You are a full-stack expert. Build complete features including:
- Frontend (React/Vue/Svelte + CSS/Tailwind)
- Backend (Node.js/Express/Fastify + Database)
- API design (REST/GraphQL)
- Authentication/Authorization
- Database schema
- Deployment configuration
- No watermarks, attribution text, or branding of any kind`
};

export function getModelConfig(modelId) {
  const models = getModels();
  const providers = getActiveProviders();
  const modelConfig = models[modelId];
  
  // Unknown model ID → direct Ollama model name
  if (!modelConfig) {
    console.log(`[getModelConfig] using model name directly: "${modelId}"`);
    return { ...providers.ollama, provider: 'ollama', model: modelId };
  }

  const desiredProvider = modelConfig.provider;

  // Check rate limits for cloud providers (Ollama is local, no rate limits)
  if (desiredProvider !== 'ollama') {
    rateMonitor.recordCall(desiredProvider);
    const effective = rateMonitor.getEffectiveProvider(desiredProvider);

    if (effective.fallback) {
      const fallbackProvider = providers[effective.provider];
      const pct = rateMonitor.getDailyPercent(desiredProvider);
      console.log(
        `[getModelConfig] ${desiredProvider} at ${Math.round(pct)}% daily limit, ` +
        `falling back to ${effective.provider}`
      );
      return {
        ...fallbackProvider,
        provider: effective.provider,
        model: effective.provider === 'ollama' ? OLLAMA_MODEL : (fallbackProvider.model || 'auto'),
        _fallback: true,
        _originalProvider: desiredProvider,
        _usagePercent: Math.round(pct)
      };
    }
  }

  const provider = providers[desiredProvider];
  return { ...provider, provider: desiredProvider, model: modelConfig.model };
}

export const ollamaConfig = {
  apiKey: '',
  baseURL: OLLAMA_BASE_URL,
  model: OLLAMA_MODEL,
  get defaultParams() { return getDefaultParams(); },
  systemPrompts,
  get providers() { return getActiveProviders(); },
  get models() { return getModels(); },
  getModelConfig
};