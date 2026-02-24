<template>
  <div class="settings-panel">
    <h2>设置</h2>

    <div class="form-group">
      <label for="topic">主题</label>
      <input type="text" id="topic" v-model="localSettings.topic" />
    </div>

    <h3>参与者</h3>
    <div v-for="(p, index) in localSettings.participants" :key="index" class="participant-settings">
      <!-- 第一行：头像和移除按钮 -->
      <div class="participant-row-1">
        <div class="participant-avatar">
          <img :src="p.avatar || '/user.jpg'" alt="Avatar" class="avatar-preview" />
          <input type="file" @change="handleAvatarUpload($event, p)" accept="image/*" class="avatar-upload-input" />
        </div>
        <button @click="removeParticipant(index)" class="remove-btn">移除</button>
      </div>
      
      <!-- 第二行：名称和模型 -->
      <div class="participant-row-2">
        <div class="form-group name-group">
          <label>名称</label>
          <input type="text" v-model="p.name" />
        </div>
        
        <div class="form-group model-group">
          <label>模型</label>
          <select v-model="p.model">
            <option v-for="model in availableModels" :key="model.value" :value="model.value">
              {{ model.name }}
            </option>
          </select>
        </div>
      </div>
      
      <!-- 第三行：角色富文本 -->
      <div class="participant-row-3">
        <div class="form-group role-group">
          <label>角色</label>
          <textarea v-model="p.role" class="form-textarea role-textarea" rows="3" placeholder="描述这个AI助手的角色和特点..."></textarea>
        </div>
      </div>
    </div>

    <div class="add-participant-section">
      <div class="divider"></div>
      <button @click="addParticipant" class="add-btn">
        <span class="add-icon">+</span>
        <span>添加参与者</span>
      </button>
    </div>

    <!-- 校验错误提示区域 -->
    <div v-if="errors.length" class="error-box">
      <strong>请修正以下问题：</strong>
      <ul>
        <li v-for="(err, i) in errors" :key="i">{{ err }}</li>
      </ul>
    </div>

    <div class="actions">
      <button @click="apply" class="apply-btn">应用</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useChatStore } from '../stores/chat';
import { getPublicModels } from '../services/aiService';

const chatStore = useChatStore();

const availableModels = ref([]);

async function loadModels() {
  const map = await getPublicModels();
  // 优先展示 label，其次回退 key
  availableModels.value = Object.keys(map).map((key) => ({
    name: map[key]?.label || key,
    value: key
  }));
}

onMounted(() => {
  loadModels();
  // 如果已有保存的参与者，填充默认头像
  localSettings.value.participants.forEach(p => {
    if (!p.avatar) p.avatar = '/user.jpg';
  });
});

const localSettings = ref({
  topic: chatStore.settings.topic,
  participants: JSON.parse(JSON.stringify(chatStore.participants))
});

// 新增：校验错误集合
const errors = ref([]);

watch(() => chatStore.participants, (newParticipants) => {
  localSettings.value.participants = JSON.parse(JSON.stringify(newParticipants));
  localSettings.value.participants.forEach(p => {
    if (!p.avatar) {
      p.avatar = '/user.jpg';
    }
  });
}, { deep: true, immediate: true });

const addParticipant = () => {
  const defaultModel = availableModels.value[0]?.value || 'qwen-plus';
  localSettings.value.participants.push({
    name: '匿名者',
    role: 'Observer',
    model: defaultModel,
    avatar: '/user.jpg'
  });
};

const removeParticipant = (index) => {
  localSettings.value.participants.splice(index, 1);
};

// 新增：校验逻辑
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
    // 如果需要，也可以滚动到顶部以便用户看到错误
    try { document.querySelector('.settings-panel')?.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    return;
  }

  // 通过校验后，进行字段修整（去除首尾空格）
  localSettings.value.topic = (localSettings.value.topic || '').trim();
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
  padding: 20px;
  border-left: 1px solid #ccc;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

h2, h3 {
  margin-top: 0;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.participant-settings {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
  border: 1px solid #eee;
}

.participant-settings:hover {
  transform: translateY(-2px);
}

.participant-row-1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.participant-row-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 16px;
}

.form-group {
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  border-color: #409eff;
  outline: none;
}

.role-textarea {
  min-height: 100px;
  padding: 12px;
  line-height: 1.6;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  resize: vertical;
  width: 90%;
}

/* 错误提示样式 */
.error-box {
  color: #d93025;
  background: #fdecea;
  border: 1px solid #f5c6cb;
  padding: 12px 14px;
  border-radius: 8px;
  margin-top: 10px;
}

.remove-btn {
  background: #ff4d4f;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: #ff7875;
  transform: scale(0.98);
}

.participant-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-preview {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 5px;
}

.avatar-upload-input {
  width: 80px;
  font-size: 10px;
}

.remove-btn, .add-btn {
  margin-left: 10px;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.remove-btn {
  background-color: #f44336;
  color: white;
}

.add-participant-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 30px 0;
  position: relative;
}

.divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #e0e0e0 20%, #e0e0e0 80%, transparent 100%);
  margin-bottom: 20px;
}

.add-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 3px 12px rgba(76, 175, 80, 0.25);
  border: none;
  padding: 14px 28px;
  border-radius: 25px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.add-btn:hover {
  background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
  box-shadow: 0 5px 20px rgba(76, 175, 80, 0.35);
  transform: translateY(-2px);
}

.add-btn:active {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(76, 175, 80, 0.3);
}

.add-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.add-btn:hover::before {
  left: 100%;
}

.add-icon {
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.actions {
  margin-top: auto;
}

.apply-btn {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
