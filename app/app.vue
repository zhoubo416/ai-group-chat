<template>
  <div id="app" :class="[chatStore.theme, { 'settings-open': showSettings, 'history-open': showHistory }]" lang="zh">
    <SessionHistory :sessions="chatStore.sessionHistory" :current-id="chatStore.currentSessionId" :show="showHistory" @select="handleSelectSession" @new="handleNewSession" @delete="handleDeleteSession" />

    <div class="chat-container">
      <ChatWindow :messages="chatStore.messages" :is-typing="chatStore.isTyping" />
      <ChatInput />
    </div>

      <div class="settings-container" @click.stop>
          <SettingsPanel v-if="showSettings" @save-settings="handleSaveSettings" />
      </div>
      <div v-if="showSettings" class="backdrop" @click="closeSettings"></div>
      <div v-if="showHistory" class="history-backdrop" @click="closeHistory"></div>

      <button @click="toggleSettings" class="settings-toggle" title="打开/关闭设置">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.58-.21l-2.49 1a.49.49 0 0 0-.45.08c-.63-.48-1.31-.88-2.04-1.2l-.38-2.65A.49.49 0 0 0 13.01 2h-3.84a.49.49 0 0 0-.49.42l-.38 2.65c-.73.32-1.41.72-2.04-1.2a.49.49 0 0 0-.45-.08l-2.49-1a.49.49 0 0 0-.58.21l-1.92 3.32a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.07.64-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32a.49.49 0 0 0 .58.21l2.49-1a.49.49 0 0 0 .45.08c.63-.48-1.31-.88-2.04-1.2l.38 2.65a.49.49 0 0 0 .49.42h3.84a.49.49 0 0 0 .49.42l.38-2.65c.73-.32 1.41-.72-2.04-1.2a.49.49 0 0 0 .45.08l2.49 1a.49.49 0 0 0 .58-.21l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
        </svg>
      </button>

      <button @click="toggleHistory" class="history-toggle" title="会话历史">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
        </svg>
      </button>
  </div>
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
const showHistory = ref(false);

const handleSaveSettings = (settings) => {
  chatStore.applySettings(settings);
  showSettings.value = false;
};

const toggleSettings = () => {
  showSettings.value = !showSettings.value;
};

const toggleHistory = () => {
  showHistory.value = !showHistory.value;
};

const closeSettings = () => {
  showSettings.value = false;
};

const closeHistory = () => {
  showHistory.value = false;
};

const handleSelectSession = (id) => {
  chatStore.loadSession(id, { fresh: false });
  showSettings.value = false;
  showHistory.value = false;
  nextTick(() => {
    chatStore.messages = [...chatStore.messages];
  });
};

const handleNewSession = () => {
  chatStore.startFreshSession();
  showSettings.value = true;
};

const handleDeleteSession = (id) => {
  chatStore.deleteSession(id);
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

.history-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 940;
  display: none;
}

@media (max-width: 768px) {
  .history-backdrop {
    display: block;
  }
}

.history-toggle {
  position: fixed;
  bottom: 1rem;
  right: 5rem;
  padding: 0.75rem;
  border: none;
  background-color: #52c41a;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1001;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  display: none;
}

@media (max-width: 768px) {
  :root {
    --settings-width: 100%;
    --history-width: 0px;
  }

  .chat-container {
    margin-left: 0;
  }

  .settings-open .chat-container {
    margin-right: 0;
  }

  .settings-container {
    width: 100%;
  }

  .settings-toggle {
    bottom: 1rem;
    right: 1rem;
    padding: 0.875rem;
  }

  .history-toggle {
    display: block;
    bottom: 1rem;
    right: 4.5rem;
  }

  #app {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .settings-toggle {
    bottom: 0.75rem;
    right: 0.75rem;
    padding: 0.75rem;
  }

  .history-toggle {
    bottom: 0.75rem;
    right: 4rem;
    padding: 0.75rem;
  }

  .backdrop {
    background: rgba(0,0,0,0.5);
  }
}
</style>
