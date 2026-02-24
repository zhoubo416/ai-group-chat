import { defineStore } from 'pinia';
import { aiService } from '../services/aiService';
import { idbGet, idbSet } from '../services/db';

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [],
    participants: [],
    settings: {
      topic: '',
    },
    // 会话历史与当前会话
    sessionHistory: [],
    currentSessionId: null,
    viewingHistoryId: null, // 仅查看历史时的标记，避免开始讨论覆盖老记录
    isTyping: false,
    theme: 'light', // Add theme state
    locale: 'en', // Add locale state
    isDiscussionActive: false,
    // 新增：轮次计数
    roundCount: 0,
    // 新增：最大轮数上限
    maxRounds: 50,
  }),
  actions: {
    // 内部：若内容为空则用占位“...”，并防止短期内同作者重复文本
    pushWithFallback(msg, fallback = '...') {
      if (!msg || typeof msg !== 'object') return false;
      const txt = (msg.text || '').trim();
      const normalized = txt || fallback;
      const author = msg.author || '未知';
      const recent = this.messages.slice(-6);
      const dup = recent.some(
        (m) => (m?.author || '') === author && (m?.text || '').trim() === normalized
      );
      if (dup) return false;
      const finalMsg = txt ? msg : { ...msg, text: fallback };
      this.messages.push(finalMsg);
      return true;
    },

    async toggleDiscussion() {
      // 如果当前只是“查看历史”，在开始讨论前先克隆为新会话，避免覆盖旧记录
      if (!this.isDiscussionActive && this.viewingHistoryId && this.viewingHistoryId === this.currentSessionId) {
        this.cloneSession(this.currentSessionId);
      }
      if (this.isDiscussionActive) return;
      this.isDiscussionActive = true;
      try {
        await this.runSequentialDiscussion();
      } finally {
        this.isDiscussionActive = false;
      }
    },

    // 新增：强制结束讨论
    async forceEndDiscussion() {
      if (!this.isDiscussionActive) return;
      this.isDiscussionActive = false;
      this.isTyping = false;
      this.messages.push({
        id: Date.now().toString(),
        author: '主持人',
        avatar: '/user.jpg',
        text: '主持人：讨论被手动强制结束。',
        timestamp: new Date().toISOString(),
      });
      await this.saveSnapshot();
    },

    // 顺序讨论：多轮，每位参与者依次发言；每5轮由主持人判断是否继续
    async runSequentialDiscussion() {
      if (!this.participants || this.participants.length === 0) return;

      while (this.isDiscussionActive) {
        // 达到或超过最大轮数，则自动结束
        if (this.roundCount >= this.maxRounds) {
          this.isDiscussionActive = false;
          this.isTyping = false;
          this.messages.push({
            id: Date.now().toString(),
            author: '主持人',
            avatar: '/user.jpg',
            text: `已达到最大轮数（${this.maxRounds}轮），讨论自动结束。`,
            timestamp: new Date().toISOString(),
          });
          await this.saveSnapshot();
          break;
        }

        this.roundCount += 1;

        const tones = ['质疑语气', '建设性补充', '数据/事实导向', '风险提示', '乐观倡议'];
        for (let idx = 0; idx < this.participants.length; idx++) {
          const p = this.participants[idx];
          if (!this.isDiscussionActive) break;
          this.isTyping = true;
          try {
            const tone = tones[idx % tones.length];
            const instruction = {
              role: 'system',
              content: `你是${p.name}（角色：${p.role || '参与者'}）。请用${tone}，并避免与上一轮内容重复，如需引用请用不同表述。基于以上发言用中文在100字以内仅发表你的观点，可以赞同或反对，表达简洁明了；禁止进行任何形式的总结或下结论，禁止使用“总结”“总结发言”“综述”“结论”等词；最终总结由主持人完成。`
            }; 
            const response = await aiService.generateSingleResponse(
              this.settings.topic,
              p,
              [...this.messages, instruction]
        );
        // 若在等待期间被强制结束，则不再追加消息
        if (!this.isDiscussionActive) break;
        this.pushWithFallback(response);
        await this.saveSnapshot();
      } catch (e) {
        this.messages.push({
          id: Date.now().toString(),
          author: '主持人',
          text: `生成 ${p.name} 发言失败：${e.message}`,
              timestamp: new Date().toISOString(),
              isError: true,
            });
          } finally {
            this.isTyping = false;
          }
          // 轻微间隔以模拟轮到下一位
          await new Promise((r) => setTimeout(r, 500));
        }

        if (!this.isDiscussionActive) break;

        // 每5轮，由主持人判断是否继续
        if (this.roundCount % 5 === 0) {
          await this.hostCheckpoint();
          if (!this.isDiscussionActive) break;
        }

        // 轮次间隔
        await new Promise((r) => setTimeout(r, 800));
      }
      // 循环结束后再保存一次，确保最新状态落盘
      await this.saveSnapshot();
    },

    // 每5轮由主持人判断：若已达成一致则总结并结束，否则继续
    async hostCheckpoint() {
      this.isTyping = true;
      try {
        const instruction = {
          role: 'system',
          content: '你是主持人。请基于以上全部历史发言判断参与者是否已达成一致：若已达成一致，请用中文在150字内给出简明总结，并以“讨论已达成一致，结束。”结尾；若未达成一致，请用一句中文指出主要分歧，并以“继续下一轮。”结尾。避免重复前一轮内容，如需引用请用不同表述。'
        };
        // 主持人默认 deepseek
        const hostModel = { name: '主持人', model: 'deepseek' };
        const resp = await aiService.generateSingleResponse(
          this.settings.topic,
          hostModel,
          [...this.messages, instruction]
        );
        // 若在等待期间被强制结束，则不再追加消息
        if (!this.isDiscussionActive) return;
        this.pushWithFallback(resp);
        await this.saveSnapshot();

        const txt = (resp?.text || '').trim();
        // 简单判定：含“已达成一致”或“结束”且不含“继续”则结束
        if ((/已达成一致|结束/.test(txt)) && !/继续/.test(txt)) {
          this.isDiscussionActive = false;
        }
      } catch (e) {
        this.messages.push({
          id: Date.now().toString(),
          author: '主持人',
          text: `主持人判断失败：${e.message}`,
          timestamp: new Date().toISOString(),
          isError: true,
        });
      } finally {
        this.isTyping = false;
      }
    },

    async addMessage(message) {
      this.messages.push(message);

      if (message.author === '主持人') {
        return;
      }

      // 保留：用户自由输入时触发所有参与者并发回复（与顺序讨论独立）
      this.isTyping = true;
      try {
        const commonInstruction = {
          role: 'system',
          content: '仅供参与者参考：请基于全部历史发言各自发表观点（100字以内），可以赞同或反对，务必简洁明了；避免重复前一轮内容，如需引用请用不同表述；除主持人外，任何参与者不得进行总结或下结论，不要使用“总结”“总结发言”“综述”“结论”等词。'
        };
        const aiResponses = await aiService.generateGroupResponses(
          this.settings.topic,
          this.participants,
          [...this.messages, commonInstruction]
        );
        for (const response of aiResponses) {
          this.pushWithFallback(response);
        }
        await this.saveSnapshot();
      } catch (error) {
        console.error('Error generating AI responses:', error);
        this.messages.push({
          id: Date.now().toString(),
          author: '主持人',
          text: '异常：' + error.message,
          timestamp: new Date().toISOString(),
        });
      } finally {
        this.isTyping = false;
      }
    },

    async applySettings(settings) {
      // 每次应用设置都视为开启一个新会话，避免覆盖历史
      this.currentSessionId = Date.now().toString();
      this.viewingHistoryId = null;
      this.resetWithSettings(settings, { addIntro: true });
      this.upsertSession(settings, { messages: this.messages, roundCount: this.roundCount });
      await this.persistSessionState();

      // 不在应用时触发AI，等待用户点击“开始讨论”
    },

    setTheme(theme) { // Add setTheme action
      this.theme = theme;
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', theme);
      }
    },
    setLocale(locale) { // Add setLocale action
      this.locale = locale;
      if (typeof window !== 'undefined') {
        localStorage.setItem('locale', locale);
      }
    },
    async initializeState() { // Add initialization action
      if (typeof window !== 'undefined' && window.localStorage) {
        // Load theme from localStorage
        try {
          const savedTheme = window.localStorage.getItem('theme');
          if (savedTheme) {
            this.theme = savedTheme;
          }

          // Load locale from localStorage
          const savedLocale = window.localStorage.getItem('locale');
          if (savedLocale) {
            this.locale = savedLocale;
          }
        } catch (e) {
          console.warn('Failed to load from localStorage:', e);
        }
      }

      // 加载历史会话与上次设置（优先 IndexedDB，回退 localStorage 兼容旧数据）
      try {
        const data = await idbGet('chatState');
        if (data) {
          this.sessionHistory = Array.isArray(data.sessionHistory) ? data.sessionHistory : [];
          this.currentSessionId = data.currentSessionId || null;
          this.viewingHistoryId = data.viewingHistoryId || null;
          // 恢复指定会话或仅设置
          if (this.currentSessionId) {
            const found = this.sessionHistory.find((s) => s.id === this.currentSessionId);
            if (found) {
              this.loadSession(this.currentSessionId, { fresh: false });
              return;
            }
          }
          if (data.lastSettings) {
            this.resetWithSettings(data.lastSettings, { addIntro: false });
          }
          return;
        }
      } catch (e) {
        console.warn('IndexedDB 加载失败，尝试使用 localStorage 回退', e);
      }

      // 回退：旧逻辑
      let lastSessionId = null;
      let lastSettings = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const sessions = window.localStorage.getItem('chatSessions');
          if (sessions) {
            try { this.sessionHistory = JSON.parse(sessions) || []; } catch {}
          }
          lastSettings = window.localStorage.getItem('chatLastSettings');
          lastSessionId = window.localStorage.getItem('chatCurrentSessionId');
          if (lastSessionId) this.currentSessionId = lastSessionId;
        } catch (e) {
          console.warn('Failed to load from localStorage fallback:', e);
        }
      }

      if (lastSessionId && Array.isArray(this.sessionHistory)) {
        const found = this.sessionHistory.find((s) => s.id === lastSessionId);
        if (found) {
          this.loadSession(lastSessionId, { fresh: false });
          return;
        }
      }
      if (lastSettings) {
        try {
          const parsed = JSON.parse(lastSettings);
          if (parsed && typeof parsed === 'object') {
            this.resetWithSettings(parsed, { addIntro: false });
          }
        } catch {}
      }
    },

    // 重新开始指定会话：清空消息，写入设置并推送开场白（新会话）
    restartSession(sessionId) {
      this.cloneSession(sessionId);
    },

    // 清空当前设置，便于创建新会话
    async startFreshSession() {
      this.currentSessionId = null;
      this.viewingHistoryId = null;
      this.resetWithSettings({ topic: '', participants: [] }, { addIntro: false });
      await this.persistSessionState();
    },

    // 内部：写入设置并重置状态，可选择是否添加主持人开场
    resetWithSettings(settings = {}, { addIntro = true } = {}) {
      this.settings.topic = settings.topic || '';
      this.participants = Array.isArray(settings.participants) ? JSON.parse(JSON.stringify(settings.participants)) : [];
      this.messages = [];
      this.roundCount = 0;
      this.isDiscussionActive = false;
      this.viewingHistoryId = null;

      if (addIntro && this.participants.length) {
        const introLines = this.participants.map((p, idx) => `${idx + 1}. ${p.name}（角色：${p.role || '未设置'}，模型：${p.model}）`).join('\n');
        const systemMessage = {
          id: Date.now().toString(),
          author: '主持人',
          avatar: '/user.jpg',
          text: `主题：${this.settings.topic || '未设置'}\n参与人员：\n${introLines}\n规则：点击“开始讨论”后，按顺序依次发言；每次发言100字以内，可赞同或反对，力求简洁明了。仅主持人可进行总结；每5轮由主持人判断是否继续；若意见一致由主持人总结并终止讨论。`,
          timestamp: new Date().toISOString(),
        };
        this.messages.push(systemMessage);
      }
    },

    // 内部：更新/追加会话历史
    upsertSession(settings, extra = {}) {
      if (typeof window === 'undefined') return;
       // 兼容旧状态或热更新场景
      if (!Array.isArray(this.sessionHistory)) {
        this.sessionHistory = [];
      }
      const sessionId = this.currentSessionId || Date.now().toString();
      this.currentSessionId = sessionId;
      const payload = {
        id: sessionId,
        topic: settings.topic || '',
        participants: Array.isArray(settings.participants)
          ? settings.participants.map((p) => ({ name: p.name, role: p.role, model: p.model, avatar: p.avatar }))
          : [],
        messages: Array.isArray(extra.messages) ? JSON.parse(JSON.stringify(extra.messages)) : [],
        roundCount: typeof extra.roundCount === 'number' ? extra.roundCount : 0,
        updatedAt: Date.now(),
      };
      const existingIndex = this.sessionHistory.findIndex((s) => s.id === sessionId);
      if (existingIndex >= 0) {
        this.sessionHistory.splice(existingIndex, 1, payload);
      } else {
        this.sessionHistory.unshift(payload);
      }
    },

    // 内部：持久化到 IndexedDB（回退 localStorage）
    async persistSessionState() {
      if (typeof window === 'undefined') return;
      if (!Array.isArray(this.sessionHistory)) {
        this.sessionHistory = [];
      }

      const normalizeMsg = (m = {}) => ({
        id: m.id,
        text: m.text,
        author: m.author,
        avatar: m.avatar,
        timestamp: m.timestamp,
        isError: m.isError,
        model: m.model,
      });

      const normalizeParticipant = (p = {}) => ({
        name: p.name,
        role: p.role,
        model: p.model,
        avatar: p.avatar,
      });

      const shrinkHistory = (history, { maxSessions, maxMessages }) =>
        (history || []).slice(0, maxSessions).map((s) => ({
          id: s.id,
          topic: s.topic || '',
          participants: Array.isArray(s.participants)
            ? s.participants.map(normalizeParticipant)
            : [],
          messages: Array.isArray(s.messages)
            ? s.messages.slice(-maxMessages).map(normalizeMsg)
            : [],
          roundCount: typeof s.roundCount === 'number' ? s.roundCount : 0,
          updatedAt: s.updatedAt || Date.now(),
        }));

      const buildPayload = (limits) => ({
        sessionHistory: shrinkHistory(this.sessionHistory, limits),
        currentSessionId: this.currentSessionId || null,
        viewingHistoryId: this.viewingHistoryId || null,
        lastSettings: {
          topic: this.settings.topic,
          participants: Array.isArray(this.participants)
            ? this.participants.map(normalizeParticipant)
            : [],
        },
      });

      const tryPersist = async (limits) => {
        const payload = buildPayload(limits);
        // 防止 Proxy / 非可克隆对象
        const safePayload = JSON.parse(JSON.stringify(payload));
        try {
          await idbSet('chatState', safePayload);
          return true;
        } catch (e) {
          console.warn('IndexedDB 持久化失败，尝试缩减后再试', e);
          return false;
        }
      };

      // 依次尝试宽松->严格的限制
      const attempts = [
        { maxSessions: 20, maxMessages: 200 },
        { maxSessions: 12, maxMessages: 120 },
        { maxSessions: 6, maxMessages: 60 },
      ];

      for (const limits of attempts) {
        const ok = await tryPersist(limits);
        if (ok) return;
      }

      // 最终回退到 localStorage 备份
      try {
        const payload = buildPayload({ maxSessions: 5, maxMessages: 40 });
        const safePayload = JSON.parse(JSON.stringify(payload));
        localStorage.setItem('chatSessions', JSON.stringify(safePayload.sessionHistory));
        localStorage.setItem('chatCurrentSessionId', safePayload.currentSessionId || '');
        localStorage.setItem('chatLastSettings', JSON.stringify(safePayload.lastSettings));
        localStorage.setItem('chatViewingHistoryId', safePayload.viewingHistoryId || '');
      } catch (e2) {
        console.error('备份持久化失败，会话保存被跳过', e2);
      }
    },

    // 保存当前进度到历史
    async saveSnapshot() {
      this.upsertSession(
        { topic: this.settings.topic, participants: this.participants },
        { messages: this.messages, roundCount: this.roundCount }
      );
      await this.persistSessionState();
    },

    // 从历史快照恢复
    restoreSnapshot(snapshot) {
      this.settings.topic = snapshot.topic || '';
      this.participants = Array.isArray(snapshot.participants) ? JSON.parse(JSON.stringify(snapshot.participants)) : [];
      this.messages = Array.isArray(snapshot.messages) ? JSON.parse(JSON.stringify(snapshot.messages)) : [];
      this.roundCount = typeof snapshot.roundCount === 'number' ? snapshot.roundCount : 0;
      this.isDiscussionActive = false;
    },

    // 加载指定会话；fresh=true 时只用设置重开，false 时连同历史消息恢复
    async loadSession(sessionId, { fresh = false } = {}) {
      const target = this.sessionHistory.find((s) => s.id === sessionId);
      if (!target) return;
      this.currentSessionId = sessionId;
      this.viewingHistoryId = fresh ? null : sessionId;
      if (fresh) {
        this.resetWithSettings(target, { addIntro: true });
      } else {
        this.restoreSnapshot(target);
        // 保证有开场提示
        if (!this.messages.length) this.resetWithSettings(target, { addIntro: true });
      }
      await this.persistSessionState();
    },

    // 基于指定会话克隆一个全新的会话，保留设置，清空消息
    async cloneSession(sessionId) {
      const source = this.sessionHistory.find((s) => s.id === sessionId) || {
        topic: this.settings.topic,
        participants: this.participants,
      };
      const newId = Date.now().toString();
      this.currentSessionId = newId;
      this.viewingHistoryId = null;
      const settings = { topic: source.topic || '', participants: source.participants || [] };
      this.resetWithSettings(settings, { addIntro: true });
      // 初始快照只含开场提示
      this.upsertSession(settings, { messages: this.messages, roundCount: this.roundCount });
      await this.persistSessionState();
    },
  },
});
