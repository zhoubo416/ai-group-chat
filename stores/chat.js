import { defineStore } from 'pinia';
import { aiService } from '../services/aiService';

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [],
    participants: [],
    settings: {
      topic: '',
    },
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
    async toggleDiscussion() {
      if (this.isDiscussionActive) return;
      this.isDiscussionActive = true;
      try {
        await this.runSequentialDiscussion();
      } finally {
        this.isDiscussionActive = false;
      }
    },

    // 新增：强制结束讨论
    forceEndDiscussion() {
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
          break;
        }

        this.roundCount += 1;

        for (const p of this.participants) {
          if (!this.isDiscussionActive) break;
          this.isTyping = true;
          try {
            const instruction = {
              role: 'system',
              content: `你是${p.name}（角色：${p.role || '参与者'}）。基于以上所有发言用中文在100字以内仅发表你的观点，可以赞同或反对，表达简洁明了；禁止进行任何形式的总结或下结论，禁止使用“总结”“总结发言”“综述”“结论”等词；最终总结由主持人完成。`
            }; 
            const response = await aiService.generateSingleResponse(
              this.settings.topic,
              p,
              [...this.messages, instruction]
            );
            // 若在等待期间被强制结束，则不再追加消息
            if (!this.isDiscussionActive) break;
            this.messages.push(response);
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
    },

    // 每5轮由主持人判断：若已达成一致则总结并结束，否则继续
    async hostCheckpoint() {
      this.isTyping = true;
      try {
        const instruction = {
          role: 'system',
          content: '你是主持人。请基于以上全部历史发言判断参与者是否已达成一致：若已达成一致，请用中文在150字内给出简明总结，并以“讨论已达成一致，结束。”结尾；若未达成一致，请用一句中文指出主要分歧，并以“继续下一轮。”结尾。'
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
        this.messages.push(resp);

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
          content: '仅供参与者参考：请基于全部历史发言各自发表观点（100字以内），可以赞同或反对，务必简洁明了；除主持人外，任何参与者不得进行总结或下结论，不要使用“总结”“总结发言”“综述”“结论”等词。'
        };
        const aiResponses = await aiService.generateGroupResponses(
          this.settings.topic,
          this.participants,
          [...this.messages, commonInstruction]
        );
        for (const response of aiResponses) {
          this.messages.push(response);
        }
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
      this.settings.topic = settings.topic;
      this.participants = settings.participants;
      this.messages = [];
      this.roundCount = 0;

      // 主持人先介绍参与人员的基本信息与规则
      const introLines = this.participants.map((p, idx) => `${idx + 1}. ${p.name}（角色：${p.role || '未设置'}，模型：${p.model}）`).join('\n');
      const systemMessage = {
        id: Date.now().toString(),
        author: '主持人',
        avatar: '/user.jpg',
        text: `主题：${this.settings.topic || '未设置'}\n参与人员：\n${introLines}\n规则：点击“开始讨论”后，按顺序依次发言；每次发言100字以内，可赞同或反对，力求简洁明了。仅主持人可进行总结；每5轮由主持人判断是否继续；若意见一致由主持人总结并终止讨论。`,
        timestamp: new Date().toISOString(),
      };
      this.messages.push(systemMessage);

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
    initializeState() { // Add initialization action
      if (typeof window !== 'undefined') {
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          this.theme = savedTheme;
        }

        // Load locale from localStorage
        const savedLocale = localStorage.getItem('locale');
        if (savedLocale) {
          this.locale = savedLocale;
        }
      }
    },
  },
});