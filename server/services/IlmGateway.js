/**
 * @fileoverview LLM Gateway Service
 * Manages multiple LLM providers with fallback logic, caching, and cost tracking.
 */

const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * @typedef {Object} LLMResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} text - The generated text content
 * @property {string} provider - The provider used (openai, anthropic, gemini)
 * @property {string} model - The specific model name
 * @property {Object} usage - Token usage statistics
 * @property {number} usage.promptTokens - Number of tokens in the prompt
 * @property {number} usage.completionTokens - Number of tokens in the completion
 * @property {number} usage.totalTokens - Total tokens used
 * @property {number} usage.cost - Calculated cost in USD
 * @property {boolean} cached - Whether the response was served from cache
 */

/**
 * @typedef {Object} LLMOptions
 * @property {string} [prompt] - The input prompt
 * @property {Array<Object>} [messages] - Chat messages format
 * @property {number} [temperature] - Sampling temperature (0-2)
 * @property {number} [maxTokens] - Maximum tokens to generate
 * @property {string[]} [stop] - Stop sequences
 * @property {boolean} [useCache] - Whether to use the internal cache
 * @property {string[]} [fallbackOrder] - Priority list of providers to try
 */

/**
 * Multi-LLM API Gateway with fallback, caching, and cost tracking.
 * @extends EventEmitter
 */
class LLMGateway extends EventEmitter {
    /**
     * @param {Object} config - Configuration object
     * @param {Object} config.keys - API keys for providers
     * @param {string} [config.keys.openai] - OpenAI API Key
     * @param {string} [config.keys.anthropic] - Anthropic API Key
     * @param {string} [config.keys.gemini] - Google Gemini API Key
     * @param {Object} [config.cacheOptions] - Cache configuration
     * @param {number} [config.cacheOptions.ttl] - Cache Time To Live in ms
     */
    constructor(config = {}) {
        super();
        this.keys = config.keys || {};
        this.cache = new Map();
        this.cacheTTL = config.cacheOptions?.ttl || 3600000; // Default 1 hour

        // Model pricing per 1k tokens (Input / Output)
        this.pricing = {
            'gpt-4o': { input: 0.005, output: 0.015 },
            'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
            'claude-3-opus': { input: 0.015, output: 0.075 },
            'claude-3-sonnet': { input: 0.003, output: 0.015 },
            'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
            'gemini-1.5-flash': { input: 0.00035, output: 0.00105 }
        };

        // Rate limiting tracking
        this.rateLimits = new Map();

        this.initializeProviders();
    }

    /**
     * Initializes the individual LLM SDKs if keys are provided.
     * @private
     */
    initializeProviders() {
        if (this.keys.openai) {
            const OpenAI = require('openai');
            this.openai = new OpenAI({ apiKey: this.keys.openai });
        }
        if (this.keys.anthropic) {
            const Anthropic = require('@anthropic-ai/sdk');
            this.anthropic = new Anthropic({ apiKey: this.keys.anthropic });
        }
        if (this.keys.gemini) {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            this.gemini = new GoogleGenerativeAI(this.keys.gemini);
        }
    }

    /**
     * Core generation method with fallback logic.
     * @param {LLMOptions} options - Generation options
     * @returns {Promise<LLMResponse>}
     */
    async generate(options) {
        const {
            prompt,
            messages,
            useCache = true,
            fallbackOrder = ['openai', 'anthropic', 'gemini']
        } = options;

        const inputHash = this.generateHash(prompt || JSON.stringify(messages));

        // 1. Check Cache
        if (useCache) {
            const cachedResponse = this.getFromCache(inputHash);
            if (cachedResponse) {
                return { ...cachedResponse, cached: true };
            }
        }

        let lastError = null;

        // 2. Try Providers in Order
        for (const provider of fallbackOrder) {
            try {
                if (!this.canUseProvider(provider)) continue;

                const response = await this.executeWithProvider(provider, options);

                // Enrich usage with cost
                response.usage.cost = this.calculateCost(response.model, response.usage);

                // Cache result
                if (useCache) {
                    this.setToCache(inputHash, response);
                }

                this.emit('generation:success', response);
                return { ...response, cached: false };

            } catch (error) {
                lastError = error;
                this.emit('generation:error', { provider, error: error.message });
                console.warn(`LLMGateway: ${provider} failed, trying next...`, error.message);

                // Handle specific rate limits
                if (error.status === 429) {
                    this.handleRateLimit(provider);
                }
            }
        }

        throw new Error(`All providers failed. Last error: ${lastError?.message}`);
    }

    /**
     * Executes a specific provider's API call.
     * @private
     */
    async executeWithProvider(provider, options) {
        switch (provider) {
            case 'openai':
                return this.callOpenAI(options);
            case 'anthropic':
                return this.callAnthropic(options);
            case 'gemini':
                return this.callGemini(options);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * OpenAI Adapter
     * @private
     */
    async callOpenAI(options) {
        if (!this.openai) throw new Error('OpenAI key not configured');

        const model = options.model || 'gpt-4o';
        const completion = await this.openai.chat.completions.create({
            model,
            messages: options.messages || [{ role: 'user', content: options.prompt }],
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
            stop: options.stop
        });

        return {
            success: true,
            text: completion.choices[0].message.content,
            provider: 'openai',
            model,
            usage: {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens,
                totalTokens: completion.usage.total_tokens
            }
        };
    }

    /**
     * Anthropic Adapter
     * @private
     */
    async callAnthropic(options) {
        if (!this.anthropic) throw new Error('Anthropic key not configured');

        const model = options.model || 'claude-3-sonnet-20240229';
        const response = await this.anthropic.messages.create({
            model,
            max_tokens: options.maxTokens || 1024,
            messages: options.messages || [{ role: 'user', content: options.prompt }],
            temperature: options.temperature ?? 0.7,
            stop_sequences: options.stop
        });

        return {
            success: true,
            text: response.content[0].text,
            provider: 'anthropic',
            model,
            usage: {
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens
            }
        };
    }

    /**
     * Gemini Adapter
     * @private
     */
    async callGemini(options) {
        if (!this.gemini) throw new Error('Gemini key not configured');

        const modelName = options.model || 'gemini-1.5-flash';
        const model = this.gemini.getGenerativeModel({ model: modelName });

        const prompt = options.prompt || options.messages?.map(m => m.content).join('\n');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Gemini token counting is separate, using estimates or countTokens API
        // For this gateway, we'll use a simplified estimate if not provided
        const metadata = result.response.usageMetadata || {
            promptTokenCount: Math.ceil(prompt.length / 4),
            candidatesTokenCount: Math.ceil(text.length / 4),
            totalTokenCount: Math.ceil((prompt.length + text.length) / 4)
        };

        return {
            success: true,
            text,
            provider: 'gemini',
            model: modelName,
            usage: {
                promptTokens: metadata.promptTokenCount,
                completionTokens: metadata.candidatesTokenCount,
                totalTokens: metadata.totalTokenCount
            }
        };
    }

    /**
     * Calculates estimated cost in USD.
     * @private
     */
    calculateCost(model, usage) {
        const pricing = this.pricing[model] || this.pricing['gpt-3.5-turbo']; // Fallback pricing
        const inputCost = (usage.promptTokens / 1000) * pricing.input;
        const outputCost = (usage.completionTokens / 1000) * pricing.output;
        return parseFloat((inputCost + outputCost).toFixed(6));
    }

    /**
     * SHA256 Hashing for cache keys.
     * @private
     */
    generateHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Simple internal cache retrieval.
     * @private
     */
    getFromCache(hash) {
        const entry = this.cache.get(hash);
        if (!entry) return null;
        if (Date.now() > entry.expiry) {
            this.cache.delete(hash);
            return null;
        }
        return entry.data;
    }

    /**
     * Simple internal cache storage.
     * @private
     */
    setToCache(hash, data) {
        this.cache.set(hash, {
            expiry: Date.now() + this.cacheTTL,
            data
        });
    }

    /**
     * Check if a provider is currently available (not rate limited).
     * @private
     */
    canUseProvider(provider) {
        const limit = this.rateLimits.get(provider);
        if (limit && Date.now() < limit) {
            return false;
        }
        return true;
    }

    /**
     * Mark a provider as rate limited for 60 seconds.
     * @private
     */
    handleRateLimit(provider) {
        this.rateLimits.set(provider, Date.now() + 60000);
    }

    /**
     * Utility to clear expired cache entries.
     */
    pruneCache() {
        const now = Date.now();
        for (const [hash, entry] of this.cache.entries()) {
            if (now > entry.expiry) this.cache.delete(hash);
        }
    }

    /**
     * Generates text embeddings using OpenAI or Gemini.
     * @param {string} text - The text to embed
     * @param {Object} [options] - Embedding options
     * @returns {Promise<number[]>}
     */
    async embed(text, options = {}) {
        const provider = options.provider || (this.keys.openai ? 'openai' : 'gemini');
        
        try {
            if (provider === 'openai') {
                if (!this.openai) throw new Error('OpenAI key not configured');
                const response = await this.openai.embeddings.create({
                    model: options.model || 'text-embedding-3-small',
                    input: text.replace(/\n/g, ' '),
                });
                return response.data[0].embedding;
            } 
            
            if (provider === 'gemini') {
                if (!this.gemini) throw new Error('Gemini key not configured');
                const model = this.gemini.getGenerativeModel({ model: options.model || 'text-embedding-004' });
                const result = await model.embedContent(text);
                return result.embedding.values;
            }
            
            throw new Error(`Unsupported embedding provider: ${provider}`);
        } catch (error) {
            this.emit('embedding:error', { provider, error: error.message });
            console.error(`LLMGateway: Embedding failed for ${provider}`, error.message);
            throw error;
        }
    }

    /**
     * Returns current stats for tracking.
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            rateLimitedProviders: Array.from(this.rateLimits.entries())
                .filter(([, expiry]) => Date.now() < expiry)
                .map(([p]) => p)
        };
    }
}

/**
 * EXAMPLE USAGE:
 * 
 * const gateway = new LLMGateway({
 *   keys: {
 *     openai: process.env.OPENAI_API_KEY,
 *     anthropic: process.env.ANTHROPIC_API_KEY,
 *     gemini: process.env.GEMINI_API_KEY
 *   }
 * });
 * 
 * async function run() {
 *   try {
 *     const response = await gateway.generate({
 *       prompt: "Tell me a short story about an AI learning to code.",
 *       temperature: 0.8,
 *       maxTokens: 500,
 *       fallbackOrder: ['openai', 'gemini']
 *     });
 *     
 *     console.log('Text:', response.text);
 *     console.log('Tokens:', response.usage.totalTokens);
 *     console.log('Cost:', `$${response.usage.cost}`);
 *     console.log('From Cache:', response.cached);
 *   } catch (err) {
 *     console.error('Failed to generate:', err.message);
 *   }
 * }
 */

module.exports = LLMGateway;
