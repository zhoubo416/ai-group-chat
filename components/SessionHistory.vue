<template>
  <aside class="history">
    <div class="history-header">
      <div class="title">会话历史</div>
      <button class="new-btn" @click="$emit('new')">新会话</button>
    </div>
    <div v-if="!sessions.length" class="empty">暂无记录</div>
    <ul class="list" v-else>
      <li
        v-for="s in sessions"
        :key="s.id"
        :class="['item', { active: s.id === currentId }]"
        @click="$emit('select', s.id)"
      >
        <div class="item-content">
          <div class="topic" :title="s.topic || '未命名主题'">{{ s.topic || '未命名主题' }}</div>
          <div class="meta">
            <span>{{ (s.participants?.length || 0) }} 人</span>
            <span>·</span>
            <span>{{ formatTime(s.updatedAt) }}</span>
          </div>
        </div>
        <button class="delete-btn" @click.stop="$emit('delete', s.id)">删除</button>
      </li>
    </ul>
  </aside>
</template>

<script setup>
const props = defineProps({
  sessions: { type: Array, default: () => [] },
  currentId: { type: [String, Number, null], default: null },
});

const formatTime = (ts) => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return '';
  }
};
</script>

<style scoped>
.history {
  width: var(--history-width);
  height: 100vh;
  border-right: 1px solid #e5e5e5;
  background: #ffffff;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  overflow-y: auto;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.title {
  font-weight: 600;
  color: #333;
}

.new-btn {
  background: #1677ff;
  color: #fff;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.empty {
  color: #999;
  font-size: 14px;
  padding: 20px 0;
  text-align: center;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all .2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.item:hover {
  border-color: #d9d9d9;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}

.item:hover .delete-btn {
  opacity: 1;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.delete-btn {
  opacity: 0;
  background: #ff4d4f;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: #ff7875;
}

.item.active {
  border-color: #1677ff;
  box-shadow: 0 4px 12px rgba(22,119,255,0.12);
}

.topic {
  font-weight: 600;
  color: #222;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  color: #999;
  font-size: 12px;
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>
