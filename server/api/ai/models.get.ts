import { defineEventHandler } from 'h3';
import { getPublicModels } from '../../utils/aiProviders';

export default defineEventHandler(async () => {
  // 仅返回安全的公开模型映射（不包含密钥）
  return getPublicModels();
});