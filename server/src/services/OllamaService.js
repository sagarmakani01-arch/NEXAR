import OpenAI from 'openai';
import { ollamaConfig } from '../config/ollama.js';
import { rateMonitor } from './ProviderRateMonitor.js';

class OllamaService {
  constructor() {
    this.config = ollamaConfig;
    this.clients = {};
  }

  getClient(provider) {
    if (!this.clients[provider]) {
      this.clients[provider] = new OpenAI({
        apiKey: this.config.providers[provider].apiKey,
        baseURL: this.config.providers[provider].baseURL,
        timeout: 600000,
        maxRetries: 0,
      });
    }
    return this.clients[provider];
  }

  getConfig(modelId) {
    return this.config.getModelConfig(modelId);
  }

  async *generateCode(prompt, context = {}, options = {}) {
    const modelId = options.modelId || 'ollama-default';
    const cfg = this.getConfig(modelId);
    const client = this.getClient(cfg.provider || 'ollama');
    const systemPrompt = options.systemPrompt || this.config.systemPrompts.codeGeneration;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(context.previousMessages || []),
      { role: 'user', content: this.buildPrompt(prompt, context) }
    ];

    const stream = await client.chat.completions.create({
      model: cfg.model,
      messages,
      ...cfg.defaultParams,
      ...options.params,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) yield content;
    }
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

    yield* this.generateCode(prompt, {}, {
      systemPrompt: this.config.systemPrompts.fullStack,
      modelId: options.modelId,
      params: { max_tokens: 16384 }
    });
  }

  async *chat(messages, options = {}) {
    const modelId = options.modelId || 'ollama-default';
    let cfg = this.getConfig(modelId);
    let client = this.getClient(cfg.provider || 'ollama');
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      try {
        // Only prepend a system prompt if messages don't already have one
        const hasSystem = messages.some(m => m.role === 'system');
        const fullMessages = hasSystem ? messages : [
          { role: 'system', content: options.systemPrompt || this.config.systemPrompts.codeGeneration },
          ...messages
        ];

        const stream = await client.chat.completions.create({
          model: cfg.model,
          messages: fullMessages,
          ...cfg.defaultParams,
          ...options.params,
          stream: true
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) yield content;
        }
        return; // Success — exit generator
      } catch (error) {
        const is429 = error.status === 429 || (error.message && error.message.includes('429'));
        if (is429 && attempt === 0) {
          console.log(`[OllamaService] 429 rate limit on ${cfg.provider}, falling back to ollama`);
          rateMonitor.recordRateLimit(cfg.provider);
          cfg = this.getConfig('ollama-default');
          client = this.getClient('ollama');
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
