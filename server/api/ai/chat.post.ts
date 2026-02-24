import OpenAI from 'openai';
import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { useRuntimeConfig } from '#imports';
import { buildProviders } from '../../utils/aiProviders';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const providerKey: string = body?.provider || body?.modelKey || 'ali';

    // 使用集中化的 providers 配置
    const providers = buildProviders();

    if (!(providerKey in providers)) {
      setResponseStatus(event, 400);
      return { error: { message: `Unsupported provider: ${providerKey}` } };
    }

    const provider = providers[providerKey as keyof typeof providers];
    if (!provider.apiKey) {
      setResponseStatus(event, 500);
      return { error: { message: `${providerKey} API key is missing. Please set server env var: NUXT_PUBLIC_ALI_API_KEY` } };
    }

    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL
    });

    const {
      model,
      messages = [],
      temperature,
      max_tokens,
      topic,
      presence_penalty,
      frequency_penalty,
    } = body || {};

    // 功能配置（按功能/场景设置默认参数）
    const FUNCTION_PROFILES: Record<string, { temperature: number; max_tokens: number; presence_penalty: number; frequency_penalty: number }> = {
      default:    { temperature: 0.7,  max_tokens: 2000, presence_penalty: 0.9, frequency_penalty: 0.8 },
      discussion: { temperature: 0.75, max_tokens: 2000, presence_penalty: 0.9, frequency_penalty: 0.8 },
      summary:    { temperature: 0.4,  max_tokens: 1200, presence_penalty: 0.0, frequency_penalty: 0.0 }
    };
    const profile = FUNCTION_PROFILES[topic as string] || FUNCTION_PROFILES.default;

    const payload: any = {
      model: model || provider.defaultModel,
      messages
    };

    // 请求参数优先级：显式 -> 功能配置默认
    payload.temperature = typeof temperature === 'number' ? temperature : profile.temperature;
    payload.max_tokens = typeof max_tokens === 'number' ? max_tokens : profile.max_tokens;
    payload.presence_penalty = typeof presence_penalty === 'number' ? presence_penalty : profile.presence_penalty;
    payload.frequency_penalty = typeof frequency_penalty === 'number' ? frequency_penalty : profile.frequency_penalty;

    const completion = await client.chat.completions.create(payload);
    return completion;
  } catch (err: any) {
    console.error('Unified AI proxy error:', err);
    setResponseStatus(event, err?.status || err?.response?.status || 500);
    return {
      error: {
        message: err?.message || 'AI proxy request failed',
        details: err?.response?.data || null
      }
    };
  }
});
