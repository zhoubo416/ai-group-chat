import { useChatStore } from '../stores/chat';

export default defineNuxtPlugin(async (nuxtApp) => {
  if (process.client) {
    const chatStore = useChatStore();
    chatStore.initializeState();
  }
});