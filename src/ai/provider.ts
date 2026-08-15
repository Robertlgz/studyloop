// AI 提供商抽象接口
// 可插拔设计：支持 DeepSeek / OpenAI / Groq / 自定义 URL

export interface AIProvider {
    id: string;
    name: string;
    generate(prompt: string, options?: AIOptions): Promise<string>;
}

export interface AIOptions {
    system?: string;
    maxTokens?: number;
    temperature?: number;
}

export interface AIProviderConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

/** 默认 AI 提供商配置 */
export function createDeepSeekProvider(config: AIProviderConfig): AIProvider {
    return {
        id: "deepseek",
        name: "DeepSeek",
        async generate(prompt: string, options?: AIOptions) {
            const resp = await fetch(`${config.baseUrl || "https://api.deepseek.com"}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.model || "deepseek-v4-flash",
                    messages: [
                        { role: "system", content: options?.system || "You are a helpful assistant." },
                        { role: "user", content: prompt },
                    ],
                    max_tokens: options?.maxTokens || 500,
                    temperature: options?.temperature ?? 0.7,
                }),
            });
            const data = await resp.json();
            return data.choices?.[0]?.message?.content || "";
        },
    };
}

/** 创建通用 OpenAI 兼容提供商 */
export function createOpenAIProvider(config: AIProviderConfig): AIProvider {
    return {
        id: "openai",
        name: "OpenAI",
        async generate(prompt: string, options?: AIOptions) {
            const resp = await fetch(`${config.baseUrl || "https://api.openai.com"}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.model || "gpt-4o-mini",
                    messages: [
                        { role: "system", content: options?.system || "You are a helpful assistant." },
                        { role: "user", content: prompt },
                    ],
                    max_tokens: options?.maxTokens || 500,
                    temperature: options?.temperature ?? 0.7,
                }),
            });
            const data = await resp.json();
            return data.choices?.[0]?.message?.content || "";
        },
    };
}

/** 创建 Groq 提供商 */
export function createGroqProvider(config: AIProviderConfig): AIProvider {
    return {
        id: "groq",
        name: "Groq",
        async generate(prompt: string, options?: AIOptions) {
            const resp = await fetch(`${config.baseUrl || "https://api.groq.com/openai"}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.model || "mixtral-8x7b-32768",
                    messages: [
                        { role: "system", content: options?.system || "You are a helpful assistant." },
                        { role: "user", content: prompt },
                    ],
                    max_tokens: options?.maxTokens || 500,
                    temperature: options?.temperature ?? 0.7,
                }),
            });
            const data = await resp.json();
            return data.choices?.[0]?.message?.content || "";
        },
    };
}

/** 根据 provider 类型创建提供商 */
export function createProvider(type: string, config: AIProviderConfig): AIProvider {
    switch (type) {
        case "deepseek": return createDeepSeekProvider(config);
        case "openai": return createOpenAIProvider(config);
        case "groq": return createGroqProvider(config);
        default: return createDeepSeekProvider(config);
    }
}