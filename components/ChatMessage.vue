<template>
  <div class="chat-message" :class="{ 'is-user': isUser, 'is-host': isHost }">
    <img
      v-if="message.avatar"
      :src="message.avatar"
      :alt="message.author"
      :class="['avatar', avatarClass]"
    />
    <div v-else :class="['avatar', avatarClass]">{{ message.author?.slice(0, 1) || 'A' }}</div>

    <div class="message-container">
      <div v-if="message.isError" class="message error">
        <div class="message-header">
          <span class="error-icon">⚠️</span>
        </div>
        <div class="message-content">
          {{ message.text }}
        </div>
        <div v-if="message.debugInfo" class="debug-info" v-show="message.isError">
          <div class="debug-header">
            <span>🔧 调试面板</span>
            <span class="status-code">状态码: {{ message.error?.statusCode || (message.debugInfo?.status || 500) }}</span>
            <span class="timestamp">{{ new Date().toLocaleString() }}</span>
          </div>
          <div class="debug-content">
            <pre v-if="message.error">
              {{ JSON.stringify({
                model: message.model,
                endpoint: message.endpoint,
                params: message.params,
                error: message.error,
                status: message.debugInfo?.status
              }, null, 2) }}
            </pre>
            <pre v-else>{{ message.debugInfo }}</pre>
          </div>
        </div>
      </div>
      <template v-else>
        <!-- 正常消息模板：不同角色不同颜色的气泡 -->
        <div class="normal-message">
          <div class="author-name" v-if="message.author && message.author !== 'Me'">{{ message.author }}</div>
          <div :class="['bubble', { 'user-bubble': isUser, 'host-bubble': isHost }, `p-bubble-${colorIndex}`]">
            <div class="message-text">{{ message.text }}</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
});

const isUser = computed(() => props.message.author === 'Me');
const isHost = computed(() => props.message.author === '主持人');

const colorIndex = computed(() => {
  if (isUser.value || isHost.value) return 0;
  const name = props.message.author || '';
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum = (sum + name.charCodeAt(i)) % 997;
  return sum % 6; // 0-5 共6种颜色
});

const avatarClass = computed(() => {
  if (isUser.value) return 'ring-user';
  if (isHost.value) return 'ring-host';
  return `ring-p-${colorIndex.value}`;
});
</script>

<style scoped>
.chat-message {
  display: flex;
  margin-bottom: 12px;
  align-items: flex-start;
}

.chat-message.is-user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #d9d9d9;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 600;
  color: #555;
  margin-right: 10px;
  flex-shrink: 0;
  overflow: hidden;
  object-fit: cover;
  border: 2px solid transparent; /* 彩色环 */
}

.chat-message.is-user .avatar {
  margin-right: 0;
  margin-left: 10px;
}

/* 彩色头像环 */
.ring-user { border-color: #1677ff; }
.ring-host { border-color: #9254de; }
.ring-p-0 { border-color: #52c41a; }
.ring-p-1 { border-color: #13c2c2; }
.ring-p-2 { border-color: #fa8c16; }
.ring-p-3 { border-color: #eb2f96; }
.ring-p-4 { border-color: #08979c; }
.ring-p-5 { border-color: #faad14; }

.message-container {
  display: flex;
  flex-direction: column;
  max-width: 78%;
}

/* 普通消息卡片样式（基础） */
.normal-message .bubble {
  background: #f7f7f7;
  border: 1px solid #f0f0f0;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  transition: box-shadow .2s ease;
}

.normal-message .bubble:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}

/* 自己与主持人主题色 */
.normal-message .user-bubble {
  background: #1677ff;
  color: #fff;
  border-color: transparent;
}

.normal-message .host-bubble {
  background: #9254de;
  color: #fff;
  border-color: transparent;
}

/* 参与者主题色（哈希分配 6 色） */
.normal-message .p-bubble-0:not(.user-bubble):not(.host-bubble) {
  background: #f6ffed;
  border-color: #b7eb8f;
}
.normal-message .p-bubble-1:not(.user-bubble):not(.host-bubble) {
  background: #e6fffb;
  border-color: #87e8de;
}
.normal-message .p-bubble-2:not(.user-bubble):not(.host-bubble) {
  background: #fff7e6;
  border-color: #ffd591;
}
.normal-message .p-bubble-3:not(.user-bubble):not(.host-bubble) {
  background: #fff0f6;
  border-color: #ffadd2;
}
.normal-message .p-bubble-4:not(.user-bubble):not(.host-bubble) {
  background: #e6fffb;
  border-color: #5cdbd3;
}
.normal-message .p-bubble-5:not(.user-bubble):not(.host-bubble) {
  background: #fffbe6;
  border-color: #ffe58f;
}

.author-name {
  font-size: 12px;
  color: #8c8c8c;
  margin: 0 0 6px 6px;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

/* 错误消息保留并微调 */
.message.error {
  border: 1px solid #ffccc7;
  background: #fff2f0;
  border-radius: 10px;
  padding: 8px 10px;
}

.debug-info {
  margin-top: 12px;
  border: 1px solid #ff4d4f;
  border-radius: 8px;
  padding: 12px;
  background: #fff1f0;
}

.debug-info .debug-header {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
  align-items: center;
}

.debug-info .debug-header .status-code {
  color: #ff4d4f;
  font-weight: 500;
}

.debug-info .debug-header .timestamp {
  color: #8c8c8c;
  font-size: 0.9em;
}

.debug-info .debug-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background: white;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ffe3e3;
  max-height: 300px;
  overflow: auto;
}
</style>