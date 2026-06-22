import { ollamaConfig } from '../config/ollama.js';
import { rateMonitor } from './ProviderRateMonitor.js';

class OllamaService {
  constructor() {
    this.config = ollamaConfig;
  }

  getConfig(modelId) {
    return this.config.getModelConfig(modelId);
  }

  async fetchStream(baseURL, apiKey, body, timeoutMs) {
    const url = baseURL.replace(/\/+$/, '') + '/chat/completions';
    const controller = new AbortController();
    if (timeoutMs) setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`API error ${resp.status}: ${text.slice(0, 200)}`);
    }
    return resp;
  }

  async *streamSSE(resp) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.text || '';
            if (content) yield content;
          } catch {}
        }
      }
    }
  }

  async *generateCode(prompt, context = {}, options = {}) {
    const modelId = options.modelId || 'ollama-default';
    const cfg = this.getConfig(modelId);
    const systemPrompt = options.systemPrompt || this.config.systemPrompts.codeGeneration;
    const { timeout, ...apiParams } = options.params || {};

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(context.previousMessages || []),
      { role: 'user', content: this.buildPrompt(prompt, context) }
    ];

    const body = {
      model: cfg.model,
      messages,
      stream: true,
      ...cfg.defaultParams,
      ...apiParams,
    };

    const resp = await this.fetchStream(cfg.baseURL, cfg.apiKey, body, timeout);
    yield* this.streamSSE(resp);
  }

  async generateComplete(prompt, context = {}, options = {}) {
    let fullResponse = '';
    for await (const chunk of this.generateCode(prompt, context, options)) {
      fullResponse += chunk;
    }
    return fullResponse;
  }

  buildPrompt(userPrompt, context) {
    let prompt = userPrompt;

    if (context.projectFiles) {
      prompt += '\n\n--- PROJECT CONTEXT ---\n';
      for (const [path, content] of Object.entries(context.projectFiles)) {
        prompt += `\n// File: ${path}\n${content}\n`;
      }
    }

    if (context.currentFile) {
      prompt += `\n\n--- CURRENT FILE (${context.currentFile.path}) ---\n${context.currentFile.content}`;
    }

    if (context.error) {
      prompt += `\n\n--- ERROR TO FIX ---\n${context.error}`;
    }

    return prompt;
  }

  async *generateProject(specification, options = {}) {
    const prompt = `
Create a complete, production-ready project based on this specification:

${specification}

Requirements:
1. Modern tech stack (React + Vite + Express or Next.js)
2. Responsive, accessible UI
3. Proper error handling
4. Environment configuration
5. README with setup instructions
6. Docker support
7. No watermarks, no attribution required

Return as a file manifest with paths and contents.
Format each file as:
===FILE: path/to/file.ext===
<content>
===ENDFILE===
`;

    const { timeout: _timeout, ...restParams } = options.params || {};
    yield* this.generateCode(prompt, {}, {
      systemPrompt: this.config.systemPrompts.fullStack,
      modelId: options.modelId,
      params: { ...restParams, max_tokens: restParams?.max_tokens || 4096 }
    });
  }

  async *chat(messages, options = {}) {
    const modelId = options.modelId || 'ollama-default';
    let cfg = this.getConfig(modelId);
    const { timeout, ...apiParams } = options.params || {};
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      try {
        const hasSystem = messages.some(m => m.role === 'system');
        const fullMessages = hasSystem ? messages : [
          { role: 'system', content: options.systemPrompt || this.config.systemPrompts.codeGeneration },
          ...messages
        ];

        const body = {
          model: cfg.model,
          messages: fullMessages,
          stream: true,
          ...cfg.defaultParams,
          ...apiParams,
        };

        const resp = await this.fetchStream(cfg.baseURL, cfg.apiKey, body, timeout);
        yield* this.streamSSE(resp);
        return;
      } catch (error) {
        const is429 = error.status === 429 || (error.message && error.message.includes('429'));
        if (is429 && attempt === 0) {
          console.log(`[OllamaService] 429 rate limit on ${cfg.provider}, falling back to ollama`);
          rateMonitor.recordRateLimit(cfg.provider);
          cfg = this.getConfig('ollama-default');
          attempt++;
          continue;
        }
        throw error;
      }
    }
  }
}

export const ollamaService = new OllamaService();
export default ollamaService;
