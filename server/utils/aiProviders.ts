import { useRuntimeConfig } from '#imports';

export type ProviderKey = 'deepseek' | 'qwen3';

// 单一来源：在此处集中定义 baseURL 与 defaultModel，并注入 apiKey
export function buildProviders() {
  const config = useRuntimeConfig();
  return {
    deepseek: {
      apiKey: config.deepseekApiKey as string | undefined,
      baseURL: 'https://api.deepseek.com/v1',
      defaultModel: 'deepseek-chat'
    },
    qwen3: {
      apiKey: config.dashscopeApiKey as string | undefined,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      defaultModel: 'qwen-plus'
    }
  } as const;
}

// 返回安全的公开模型映射：键为 providerKey，值包含 provider 与默认模型名
export function getPublicModels() {
  const providers = buildProviders();
  return {
    deepseek: { provider: 'deepseek', model: providers.deepseek.defaultModel },
    qwen3: { provider: 'qwen3', model: providers.qwen3.defaultModel }
  } as const;
}