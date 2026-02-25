<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div class="modal-container">
        <div class="modal-header">
          <h3>选择参与者</h3>
          <button class="close-btn" @click="close">×</button>
        </div>
        
        <div class="modal-body">
          <div v-if="savedParticipants.length > 0" class="history-section">
            <h4>历史参与者</h4>
            <div class="participant-list">
              <div 
                v-for="p in savedParticipants" 
                :key="p.id" 
                class="participant-item"
                @click="selectParticipant(p)"
              >
                <img :src="p.avatar || '/user.jpg'" alt="Avatar" class="avatar" />
                <div class="info">
                  <div class="name">{{ p.name }}</div>
                  <div class="role">{{ p.role }}</div>
                </div>
                <button class="delete-btn" @click.stop="handleDelete(p.id)">删除</button>
              </div>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="new-section">
            <h4>添加新参与者</h4>
            <div class="form-group avatar-upload-group">
              <label>头像</label>
              <div class="avatar-preview-wrapper">
                <img :src="newParticipant.avatar || '/user.jpg'" alt="Avatar" class="avatar-preview" />
                <input type="file" @change="handleAvatarUpload" accept="image/*" class="avatar-upload-input" />
              </div>
            </div>
            <div class="form-group">
              <label>名称</label>
              <input type="text" v-model="newParticipant.name" class="form-input" placeholder="参与者名称" />
            </div>
            <div class="form-group">
              <label>角色</label>
              <textarea v-model="newParticipant.role" class="form-textarea" rows="2" placeholder="描述这个AI助手的角色和特点"></textarea>
            </div>
            <div class="form-group">
              <label>模型</label>
              <select v-model="newParticipant.model" class="form-select">
                <option v-for="model in availableModels" :key="model.value" :value="model.value">
                  {{ model.name }}
                </option>
              </select>
            </div>
            <button class="add-btn" @click="addNewParticipant">添加参与者</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAllParticipants, saveParticipant, deleteParticipant } from '../services/db';
import { getPublicModels } from '../services/aiService';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['close', 'select']);

const savedParticipants = ref([]);
const availableModels = ref([]);

const newParticipant = ref({
  name: '',
  role: '',
  model: 'qwen-max',
  avatar: '/user.jpg'
});

function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      newParticipant.value.avatar = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

async function loadParticipants() {
  try {
    savedParticipants.value = await getAllParticipants();
  } catch (e) {
    console.error('Failed to load participants:', e);
  }
}

async function loadModels() {
  const map = await getPublicModels();
  availableModels.value = Object.keys(map).map((key) => ({
    name: map[key]?.label || key,
    value: key
  }));
}

function selectParticipant(p) {
  emit('select', {
    name: p.name,
    role: p.role,
    model: p.model,
    avatar: p.avatar
  });
  close();
}

async function handleDelete(id) {
  try {
    await deleteParticipant(id);
    await loadParticipants();
  } catch (e) {
    console.error('Failed to delete participant:', e);
  }
}

async function addNewParticipant() {
  if (!newParticipant.value.name || !newParticipant.value.role) {
    alert('请填写名称和角色');
    return;
  }
  
  try {
    await saveParticipant({ ...newParticipant.value });
    emit('select', { ...newParticipant.value });
    newParticipant.value = {
      name: '',
      role: '',
      model: availableModels.value[0]?.value || 'qwen-max',
      avatar: '/user.jpg'
    };
    close();
  } catch (e) {
    console.error('Failed to save participant:', e);
  }
}

function close() {
  emit('close');
}

onMounted(() => {
  loadParticipants();
  loadModels();
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #4b5563;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.history-section h4,
.new-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
}

.participant-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.participant-item:hover {
  background: #f3f4f6;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.info {
  flex: 1;
}

.name {
  font-weight: 500;
  color: #1f2937;
}

.role {
  font-size: 12px;
  color: #6b7280;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.delete-btn:hover {
  background: #fecaca;
}

.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 16px 0;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.add-btn {
  width: 100%;
  padding: 10px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
}

.add-btn:hover {
  background: #2563eb;
}

.avatar-upload-group {
  display: flex;
  flex-direction: column;
}

.avatar-preview-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-preview-wrapper .avatar-preview {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #e5e7eb;
}

.avatar-upload-input {
  font-size: 12px;
}
</style>
