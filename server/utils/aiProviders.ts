import { useRuntimeConfig } from '#imports';

/**
 * 统一使用阿里 DashScope 兼容接口，便于扩展热门模型。
 * baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1
 */
export type ProviderKey = 'ali';

type AliModel = {
  key: string;
  model: string;
  label: string;
  tools?: Record<string,string>[]
};

// 当前验证可用的阿里模型（OpenAI 兼容）
const tools = [
        {"type": "web_search"},
        {"type": "code_interpreter"},
        {"type": "web_extractor"}
      ]
const ALI_MODELS: AliModel[] = [
  { key: 'qwen-plus', model: 'qwen-plus', label: 'Qwen Plus', tools},
  { key: 'qwen-max', model: 'qwen3-max', label: 'Qwen Max' ,tools}
];

// 单一来源：集中定义 baseURL 与默认模型，并注入 apiKey
export function buildProviders() {
  const config = useRuntimeConfig();
  return {
    ali: {
      apiKey: config.aliApiKey as string | undefined,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      defaultModel: ALI_MODELS[0].model,
    },
  } as const;
}

// 返回安全的公开模型映射：键为 modelKey，值包含 provider 与模型名
export function getPublicModels() {
  return ALI_MODELS.reduce((acc, cur) => {
    acc[cur.key] = { provider: 'ali', model: cur.model, label: cur.label, tools: cur.tools };
    return acc;
  }, {} as Record<string, { provider: ProviderKey; model: string; label: string,tools?:Record<string,string>[] }>);
}
