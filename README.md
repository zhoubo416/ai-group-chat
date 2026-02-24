# AI Group Chat (Nuxt 4 + Pinia)

一个多人观点讨论/辩论的示例应用，内置主持人流程、回合数上限、强制结束按钮、头像显示、设置面板校验等功能。

## 技术栈
- Nuxt 4 + Vite
- Vue 3 + Pinia
- Node/Nitro Server（内置于 Nuxt）

## 运行要求
- Node.js >= 18（建议 LTS）
- npm（或 pnpm / yarn / bun）

## 环境变量
复制 .env.example 到 .env 并按需填写：
```
DEEPSEEK_API_KEY=your deepseek api key
DASHSCOPE_API_KEY=your dashscope api key
```

> 注：PM2 启动已配置从 .env 读取（见 ecosystem.config.js 的 env_file 配置）。

## 安装依赖
```bash
npm install
```

## 开发启动
```bash
npm run dev
```
- 默认端口是 3000；若被占用，Nuxt 会自动选择可用端口（例如 3001/3002），命令行会给出实际访问地址。

## 构建与本地预览（生产模式）
```bash
# 构建
npm run build

# 使用 Nitro 预览（接近生产行为）
npm run preview
```

## 直接用 Node 启动生产构建
```bash
npm run build
PORT=3001 NITRO_PORT=3001 node .output/server/index.mjs
```

## 使用 PM2 部署
已提供 PM2 启动文件 ecosystem.config.cjs（读取 .env，默认端口 3001）。

常用命令：
```bash
# 第一次启动（生产环境）
npm run build
  pm2 start ecosystem.config.cjs --env production

# 查看进程与日志
pm2 status
pm2 logs ai-group-chat --lines 100

# 热重载（代码更新后：拉代码/装依赖/构建再重载）
git pull && npm ci && npm run build && pm2 reload ai-group-chat

# 停止/删除/保存开机自启
pm2 stop ai-group-chat
pm2 delete ai-group-chat
pm2 save && pm2 startup
```

### 一站式更新部署步骤（生产环境）
1. 拉代码并安装依赖：
   ```bash
   git pull && npm ci
   ```
2. 构建生产产物：
   ```bash
   npm run build
   ```
3. 重新加载 PM2 进程（零停机）：
   ```bash
   pm2 reload ai-group-chat
   ```

> 如果是首次部署且还未创建进程，使用：
> ```bash
> pm2 start ecosystem.config.cjs --env production
> pm2 save
> ```

### 常用排查命令
- 查看最近 200 行日志：`pm2 logs ai-group-chat --lines 200`
- 查看进程状态：`pm2 status`
- 清理旧日志：`pm2 flush`

## 功能提示（项目内已实现）
- 头像：参与者与主持人头像展示，主持人固定 /user.jpg。
- 讨论控制：
  - 顶部“强制结束”按钮
  - 最多 50 轮自动结束
  - 每 5 轮主持人进行是否继续/总结判断
- 表单校验：SettingsPanel 中包含主题必填、参与者姓名/角色必填、至少 2 名参与者。
- 参与者不会输出“总结/结论/综述”等总结性内容，最终总结由主持人产生。

## 目录结构（精简）
- components：ChatWindow/ChatMessage/ChatInput/SettingsPanel
- stores/chat.js：讨论状态与流程控制
- services/aiService.js：服务端 AI 访问封装（通过 /api/ai/chat）
- public/user.jpg：默认头像

## 许可证
本项目仅用于示例与学习，按需自定义。
