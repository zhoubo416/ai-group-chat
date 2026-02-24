// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // 强制关闭 devtools，避免服务器端引用 localStorage
  devtools: { enabled: false },
  // 关闭服务端渲染（SSR）
  ssr: false,
  modules: ['@pinia/nuxt', '@nuxt/ui'],
  runtimeConfig: {
    // 仅服务端可读的私钥配置（不要暴露到客户端）
    dashscopeApiKey: process.env.DASHSCOPE_API_KEY || '',
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
    siliconflowApiKey: process.env.SILICONFLOW_API_KEY || '',
    aliApiKey: process.env.NUXT_PUBLIC_ALI_API_KEY || '',
    public: {
      // 不再暴露任何与密钥相关的配置到客户端
    }
  }
})
