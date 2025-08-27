// AI 服务接口模块
import axios from 'axios';

// 统一从后端获取可公开的模型映射，避免前后端重复配置
let PUBLIC_MODELS_CACHE = null;
export async function getPublicModels() {
  if (PUBLIC_MODELS_CACHE) return PUBLIC_MODELS_CACHE;
  try {
    const { data } = await axios.get('/api/ai/models');
    PUBLIC_MODELS_CACHE = data || {};
    return PUBLIC_MODELS_CACHE;
  } catch (e) {
    console.error('加载模型列表失败，将回退到默认 deepseek:', e);
    // 回退一个最小可用的默认配置，确保应用可继续运行
    PUBLIC_MODELS_CACHE = {
      deepseek: { provider: 'deepseek', model: 'deepseek-chat' }
    };
    return PUBLIC_MODELS_CACHE;
  }
}

// 将应用内消息转换为 OpenAI/ChatCompletions 所需的 {role, content}
const toChatMessages = (previousMessages = []) => {
  return (previousMessages || [])
    .map((m) => {
      if (m && typeof m === 'object' && 'role' in m && 'content' in m) {
        return { role: m.role, content: m.content };
      }
      const content = m?.text || m?.content || '';
      if (!content) return null;
      let role = 'user';
      if (m?.author === '主持人' || m?.isSummary) role = 'system';
      return { role, content };
    })
    .filter(Boolean);
};

// AI 服务实现（统一调用 /api/ai/chat）
export const aiService = {
  // 生成单个 AI 响应
  async generateSingleResponse(topic, modelObj, previousMessages) {
    try {
      const modelsMap = await getPublicModels();
      const modelKey = modelObj?.model;
      const modelCfg = modelsMap[modelKey];
      const messages = toChatMessages(previousMessages);

      const payload = {
        provider: modelCfg?.provider,
        model: modelCfg?.model,
        topic,
        messages
      };

      const { data: completion } = await axios.post('/api/ai/chat', payload);
      const text = completion?.choices?.[0]?.message?.content || '';
      return {
        id: Date.now().toString(),
        text,
        author: modelObj.name,
        avatar: modelObj?.avatar || '/user.jpg',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(` 请求异常:`, error);
      // 错误时尽量提供调试信息
      let payloadPreview = undefined;
      try {
        const modelsMap = await getPublicModels();
        const modelKey = (modelObj?.model || 'deepseek');
        const modelCfg = modelsMap[modelKey] || modelsMap.deepseek || Object.values(modelsMap)[0];
        payloadPreview = JSON.stringify({
          provider: modelCfg?.provider,
          model: modelCfg?.model,
          topic,
          messages: toChatMessages(previousMessages)?.slice(-3)
        }, null, 2);
      } catch {}

      return {
        id: Date.now().toString(),
        text: `服务异常: ${error.response?.data?.error?.message || error.response?.data?.message || error.message || '请求失败'}`,
        debugInfo: {
          statusCode: error.response?.status,
          route: '/api/ai/chat',
          payloadPreview,
          timestamp: new Date().toISOString()
        },
        author: modelObj.name,
        avatar: modelObj?.avatar || '/user.jpg',
        isError: true,
        timestamp: new Date().toISOString()
      };
    }
  },

  // 生成多个 AI 响应（用于群组对话）
  async generateGroupResponses(topic, models, previousMessages) {
    const responses = [];
    for (const model of models) {
      const singleResponse = await this.generateSingleResponse(topic, model, previousMessages);
      responses.push(singleResponse);
    }
    return responses;
  },
};