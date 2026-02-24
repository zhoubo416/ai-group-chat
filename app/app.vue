<template>
  <client-only>
    <div id="app" :class="[chatStore.theme, { 'settings-open': showSettings }]" lang="zh">
      <SessionHistory :sessions="chatStore.sessionHistory" :current-id="chatStore.currentSessionId" @select="handleSelectSession" @new="handleNewSession" />

      <div class="chat-container">
        <ChatWindow :messages="chatStore.messages" :is-typing="chatStore.isTyping" />
        <ChatInput />
      </div>

      <div class="settings-container" @click.stop>
          <SettingsPanel v-if="showSettings" @save-settings="handleSaveSettings" />
      </div>
      <div v-if="showSettings" class="backdrop" @click="closeSettings"></div>

      <button @click="toggleSettings" class="settings-toggle" title="打开/关闭设置">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.58-.21l-2.49 1a.49.49 0 0 0-.45.08c-.63-.48-1.31-.88-2.04-1.2l-.38-2.65A.49.49 0 0 0 13.01 2h-3.84a.49.49 0 0 0-.49.42l-.38 2.65c-.73.32-1.41.72-2.04 1.2a.49.49 0 0 0-.45-.08l-2.49-1a.49.49 0 0 0-.58.21l-1.92 3.32a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.07.64-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32a.49.49 0 0 0 .58.21l2.49-1a.49.49 0 0 0 .45.08c.63-.48 1.31-.88 2.04-1.2l.38 2.65a.49.49 0 0 0 .49.42h3.84a.49.49 0 0 0 .49.42l.38-2.65c.73-.32 1.41-.72 2.04-1.2a.49.49 0 0 0 .45.08l2.49 1a.49.49 0 0 0 .58-.21l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
        </svg>
      </button>
    </div>
  </client-only>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useChatStore } from '../stores/chat';
import ChatWindow from '../components/ChatWindow.vue';
import ChatInput from '../components/ChatInput.vue';
import SettingsPanel from '../components/SettingsPanel.vue';
import SessionHistory from '../components/SessionHistory.vue';

const chatStore = useChatStore();
const showSettings = ref(true);

const handleSaveSettings = (settings) => {
  chatStore.applySettings(settings);
  showSettings.value = false;
};

const toggleSettings = () => {
  showSettings.value = !showSettings.value;
};

const closeSettings = () => {
  showSettings.value = false;
};

const handleSelectSession = (id) => {
  // 查看历史：加载完整记录，不改原会话
  chatStore.loadSession(id, { fresh: false });
  showSettings.value = false;
  // 触发视图重绘以防部分组件未更新
  nextTick(() => {
    chatStore.messages = [...chatStore.messages];
  });
};

const handleNewSession = () => {
  chatStore.startFreshSession();
  showSettings.value = true;
};

onMounted(async () => {
  await chatStore.initializeState();
});
</script>

<style>
* {
  box-sizing:border-box !important
}
:root {
  --settings-width: 450px;
  --transition-speed: 0.3s;
  --history-width: 230px;
}

#app {
  display: flex;
  height: 100vh;
  background-color: #f0f2f5;
}

#app.dark {
  background-color: #1a1a1a;
  color: #f0f2f5;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: margin-right var(--transition-speed) ease;
  margin-right: 0;
  margin-left: var(--history-width);
}

.settings-open .chat-container {
    margin-right: var(--settings-width);
}

.settings-container {
  position: fixed;
  top: 0;
  right: 0;
  width: var(--settings-width);
  height: 100%;
  background-color: white;
  box-shadow: -2px 0 5px rgba(0,0,0,0.1);
  transform: translateX(100%);
  transition: transform var(--transition-speed) ease;
  z-index: 1000;
  overflow-y: auto;
}

.settings-open .settings-container {
    transform: translateX(0);
}

.settings-toggle {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 0.75rem;
  border: none;
  background-color: #007bff;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1001;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 900;
}
</style>
