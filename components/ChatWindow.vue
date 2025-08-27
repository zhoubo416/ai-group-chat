<template>
  <div class="chat-window">
    <div class="chat-header">
      <h2>AI群组聊天</h2>
      <div class="header-actions" v-if="chatStore.isDiscussionActive">
        <span class="round-info">第 {{ chatStore.roundCount }} / {{ chatStore.maxRounds }} 轮</span>
        <button class="force-end-btn" @click="chatStore.forceEndDiscussion()">强制结束</button>
      </div>
    </div>
    <div class="messages-container" ref="messagesContainer">
      <ClientOnly>
        <ChatMessage
          v-for="message in messages"
          :key="message.id"
          :message="message"
        />
        <!-- 将加载/生成中提示放入消息流中，作为占位气泡显示，返回后由真实消息替换 -->
        <div v-if="isTyping || loading" class="message-placeholder">
          <div class="avatar skeleton"></div>
          <div class="bubble">
            <div class="loading-row">
              <div class="loading-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
              <span class="placeholder-text">{{ loading ? '加载中...' : '生成中...' }}</span>
            </div>
          </div>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { useChatStore } from '../stores/chat.js';
const chatStore = useChatStore();
const loading = ref(false);
import ChatMessage from './ChatMessage.vue';

const props = defineProps({
  messages: {
    type: Array,
    required: true,
  },
  isTyping: {
    type: Boolean,
    default: false,
  },
});

const messagesContainer = ref(null);

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

watch(() => props.messages, scrollToBottom, { deep: true });
watch(() => props.isTyping, scrollToBottom);

</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  border-radius: 0.5rem;
  overflow: hidden;
}

.chat-header {
  padding: 1rem;
  background-color: #f0f2f5;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.round-info {
  color: #666;
  font-size: 0.95rem;
}

.force-end-btn {
  background: #ff4d4f;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.9rem;
  cursor: pointer;
}
.force-end-btn:hover {
  background: #e04345;
}

.messages-container {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

/* 消息占位：横向展示的加载提示，包含头像占位和气泡 */
.message-placeholder {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 10px 0;
}

.message-placeholder .avatar.skeleton {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e6e6e6;
  flex-shrink: 0;
}

.message-placeholder .bubble {
  max-width: 75%;
  background: #f5f5f5;
  border-radius: 16px;
  padding: 10px 12px;
}

.message-placeholder .loading-row {
  display: flex;
  align-items: center;
  gap: 10px; /* 横向并列：点点 + 文本 */
}

.loading-dots {
  display: flex;
  gap: 6px;
}
.loading-dots .dot {
  width: 8px;
  height: 8px;
  background: #666;
  border-radius: 50%;
  animation: dot-pulse 1.4s infinite;
}
.loading-dots .dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dots .dot:nth-child(3) { animation-delay: 0.4s; }

.placeholder-text {
  color: #666;
  font-size: 0.95rem;
}

@keyframes dot-pulse {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}
</style>