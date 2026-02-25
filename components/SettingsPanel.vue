<template>
  <div class="settings-panel">
    <div class="settings-content">
      <h2>设置</h2>

      <div class="form-group">
        <label for="topic">主题</label>
        <input type="text" id="topic" v-model="localSettings.topic" class="form-input" placeholder="输入聊天主题" />
      </div>

      <div class="form-group">
        <label for="background">背景描述</label>
        <textarea id="background" rows="5" v-model="localSettings.background" class="form-textarea" placeholder="补充背景、场景、约束，帮助参与者更聚焦讨论"></textarea>
      </div>

      <h3>参与者</h3>
      <div v-for="(p, index) in localSettings.participants" :key="index" class="participant-card">
        <div class="participant-header">
          <div class="participant-avatar">
            <img :src="p.avatar || '/user.jpg'" alt="Avatar" class="avatar-preview" />
            <input type="file" @change="handleAvatarUpload($event, p)" accept="image/*" class="avatar-upload-input" />
          </div>
          <button @click="removeParticipant(index)" class="remove-btn">移除</button>
        </div>
        
        <div class="participant-row">
          <div class="form-group">
            <label>名称</label>
            <input type="text" v-model="p.name" class="form-input" placeholder="参与者名称" />
          </div>
          
          <div class="form-group">
            <label>模型</label>
            <select v-model="p.model" class="form-select">
              <option v-for="model in availableModels" :key="model.value" :value="model.value">
                {{ model.name }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>角色</label>
          <textarea v-model="p.role" class="form-textarea" rows="3" placeholder="描述这个AI助手的角色和特点..."></textarea>
        </div>
      </div>

      <div class="add-section">
        <div class="divider"></div>
        <button @click="openParticipantSelector" class="add-btn">
          <span class="add-icon">+</span>
          <span>添加参与者</span>
        </button>
      </div>

      <div v-if="errors.length" class="error-box">
        <strong>请修正以下问题：</strong>
        <ul>
          <li v-for="(err, i) in errors" :key="i">{{ err }}</li>
        </ul>
      </div>
    </div>

    <div class="actions">
      <button @click="apply" class="apply-btn">应用</button>
    </div>

    <ParticipantSelector 
      :show="showParticipantSelector" 
      @close="showParticipantSelector = false"
      @select="handleParticipantSelect"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useChatStore } from '../stores/chat';
import { getPublicModels } from '../services/aiService';
import ParticipantSelector from './ParticipantSelector.vue';

const chatStore = useChatStore();

const availableModels = ref([]);
const showParticipantSelector = ref(false);

async function loadModels() {
  const map = await getPublicModels();
  availableModels.value = Object.keys(map).map((key) => ({
    name: map[key]?.label || key,
    value: key
  }));
}

onMounted(() => {
  loadModels();
  localSettings.value.participants.forEach(p => {
    if (!p.avatar) p.avatar = '/user.jpg';
  });
});

const localSettings = ref({
  topic: chatStore.settings.topic,
  background: chatStore.settings.background,
  participants: JSON.parse(JSON.stringify(chatStore.participants))
});

const errors = ref([]);

watch(() => chatStore.settings.topic, (newTopic) => {
  localSettings.value.topic = newTopic;
}, { immediate: true });

watch(() => chatStore.settings.background, (newBackground) => {
  localSettings.value.background = newBackground;
}, { immediate: true });

watch(() => chatStore.participants, (newParticipants) => {
  localSettings.value.participants = JSON.parse(JSON.stringify(newParticipants));
  localSettings.value.participants.forEach(p => {
    if (!p.avatar) {
      p.avatar = '/user.jpg';
    }
  });
}, { deep: true, immediate: true });

function openParticipantSelector() {
  showParticipantSelector.value = true;
}

function handleParticipantSelect(participant) {
  localSettings.value.participants.push({
    ...participant,
    avatar: participant.avatar || '/user.jpg'
  });
  showParticipantSelector.value = false;
}

const removeParticipant = (index) => {
  localSettings.value.participants.splice(index, 1);
};

function validate() {
  const e = [];
  const topic = (localSettings.value.topic || '').trim();
  if (!topic) e.push('主题不能为空');

  const parts = Array.isArray(localSettings.value.participants) ? localSettings.value.participants : [];
  if (parts.length < 2) e.push('参与者至少需要 2 个');

  parts.forEach((p, idx) => {
    const name = (p?.name || '').trim();
    const role = (p?.role || '').trim();
    if (!name) e.push(`第 ${idx + 1} 个参与者：名称不能为空`);
    if (!role) e.push(`第 ${idx + 1} 个参与者：角色不能为空`);
  });

  errors.value = e;
  return e.length === 0;
}

const apply = () => {
  if (!validate()) {
    try { document.querySelector('.settings-panel')?.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    return;
  }

  localSettings.value.topic = (localSettings.value.topic || '').trim();
  localSettings.value.background = (localSettings.value.background || '').trim();
  localSettings.value.participants = localSettings.value.participants.map(p => ({
    ...p,
    name: (p?.name || '').trim(),
    role: (p?.role || '').trim(),
  }));

  chatStore.applySettings(localSettings.value);
};

const handleAvatarUpload = (event, participant) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      participant.avatar = e.target.result;
    };
    reader.readAsDataURL(file);
  }
};
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  overflow: hidden;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

h3 {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
  margin: 20px 0 12px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #3b82f6;
  outline: none;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  line-height: 1.5;
}

.participant-card {
  margin-bottom: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.2s ease;
}

.participant-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.participant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.participant-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-preview {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 4px;
}

.avatar-upload-input {
  width: 60px;
  font-size: 10px;
}

.participant-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.remove-btn {
  background: #ef4444;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.remove-btn:hover {
  background: #dc2626;
}

.add-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 30px 0;
  position: relative;
}

.divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #e5e7eb 20%, #e5e7eb 80%, transparent 100%);
  margin-bottom: 20px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  font-weight: 500;
  padding: 12px 24px;
  border-radius: 25px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 12px rgba(34, 197, 94, 0.25);
}

.add-btn:hover {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  box-shadow: 0 5px 20px rgba(34, 197, 94, 0.35);
  transform: translateY(-2px);
}

.add-icon {
  font-size: 18px;
  font-weight: bold;
}

.error-box {
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 12px 14px;
  border-radius: 8px;
  margin-top: 10px;
}

.actions {
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.apply-btn {
  width: 100%;
  padding: 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.apply-btn:hover {
  background-color: #2563eb;
}
</style>
