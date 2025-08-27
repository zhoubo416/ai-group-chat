<template>
  <form @submit.prevent="sendMessage" class="chat-input-form">
    <div class="discussion-controls">
  <button 
    @click="chatStore.toggleDiscussion"
    :disabled="chatStore.isDiscussionActive"
    class="discussion-button"
    :class="{ active: chatStore.isDiscussionActive }"
  >
    {{ chatStore.isDiscussionActive ? '讨论进行中...' : '开始讨论' }}
  </button>
  <button 
    v-if="isDiscussionActive"
    @click="stopDiscussion"
    class="stop-button"
  >
    生成总结
  </button>
</div>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { useChatStore } from '../stores/chat';

const newMessage = ref('');
const chatStore = useChatStore();

const sendMessage = () => {
  if (newMessage.value.trim()) {
    chatStore.addMessage({
      id: Date.now(),
      text: newMessage.value,
      author: 'user',
      timestamp: new Date().toLocaleTimeString(),
    });
    newMessage.value = '';
  }
};
</script>

<style scoped>
.chat-input-form {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: #f0f2f5;
}

.chat-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 1.5rem;
  background-color: white;
  font-size: 1rem;
  margin-right: 0.5rem;
  transition: border-color 0.3s;
}

.chat-input:focus {
  outline: none;
  border-color: #007bff;
}

.send-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: none;
  background-color: #007bff;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.3s;
}

.send-button:hover {
  background-color: #0056b3;
}

.send-button svg {
  width: 24px;
  height: 24px;
}
.discussion-button {
  background: #4CAF50;
  color: white;
  padding: 12px 24px;
  border-radius: 25px;
  transition: all 0.3s;
  border: none;
  font-weight: 500;
}

.discussion-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(76,175,80,0.3);
}

.discussion-button.active {
  background: #ff5722;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.stop-button {
  background: #f44336;
  margin-left: 12px;
}
</style>