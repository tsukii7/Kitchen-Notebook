# 🧑‍🍳 Kitchen Notebook / 厨房课代表

[English](#english) | [中文版](#中文版)

---

<br/>

<a name="english"></a>
## 🧑‍🍳 Kitchen Notebook

> Auto-parse recipes · Save kitchen beginners · Eat well today!

**Kitchen Notebook** is a whimsical, AI-powered recipe parser and shopping list manager built with **React**, **Vite**, and the **Google Gemini 2.0 Flash** API. 

Tired of pausing cooking videos 50 times just to write down the ingredients? Just drop a screenshot, paste a Bilibili/YouTube link, or upload a video directly into the app! The AI will magically extract the dish name, ingredients, and cooking steps for you. Choose what you want to cook today, and instantly generate a beautifully consolidated shopping list!

### ✨ Key Features

1. **Omnipotent AI Parsing (`gemini-2.0-flash`)**
   - Supports **multiple inputs**: Paste text, drag & drop screenshots, upload audio/video files, or paste video URLs!
   - Intelligently extracts structural data: **Dish Name**, **Category** (Meat, Vegetables, Soup, etc.), **Ingredients**, and step-by-step **Instructions**.
2. **Interactive Recipe Queue**
   - Save parsed recipes into your personal cooking queue.
   - Fully editable: tweak ingredients, add categories, or delete unwanted steps.
3. **Smart Shopping List Merge**
   - Select multiple recipes you want to cook today. The app automatically **consolidates identical ingredients** (e.g., "1 onion" + "2 onions" = "3 onions").
   - Intelligently groups items and warns you about conflicting units (e.g., "1 spoon of salt" vs "5g of salt").
4. **Export & Share**
   - Generate a beautiful, hand-drawn style shopping list image with one click (via `html2canvas`), ready to bring to the grocery store!
5. **Charming Hand-Drawn UI**
   - Delightful "wobbly" sticky-note aesthetics, masking tapes, and lively spring animations driven by `framer-motion`.
   - Built-in Confetti Easter Egg (try clicking the Chef Hat logo!).

### 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Framer Motion, Lucide React, HTML2Canvas.
- **Backend / AI**: Express/Node.js API proxy, `@google/genai` (Gemini API), Multer for file uploads.
- **Styling**: Custom CSS variables, pseudo-elements, pure CSS wobbly effects.

### 🚀 Getting Started

1. **Prerequisites**: Node.js v18+.
2. **Get an API Key**: Grab a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
3. **Install & Configure**:
   ```bash
   git clone https://github.com/your-username/recipe-recognizer.git
   cd recipe-recognizer
   npm install
   ```
   Create a `.env` file in the root directory and add your key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. **Run the App**:
   You need to run both the backend server (for file processing) and the frontend dev server.
   ```bash
   # Terminal 1: Start the backend server
   npm run server
   
   # Terminal 2: Start the frontend dev server
   npm run dev
   ```
5. **Open** `http://localhost:5173` in your browser and start cooking!

---

<br/>

<a name="中文版"></a>
## 🧑‍🍳 厨房课代表

> 自动识别菜谱 · 拯救厨房小白 · 今天吃点好的！

**厨房课代表** 是一款基于 **React**、**Vite** 和 **Google Gemini 2.0 Flash** 视觉多模态模型打造的智能菜谱解析与采购管家。

看美食视频还要疯狂暂停抄笔记？现在只需截个图、扔个视频链接、或是直接上传自己录的做菜音频，AI 课代表就会自动为你提取出结构化的【菜品名称】、【食材配比】和【详细步骤】！选好今天想做的几道菜，一键生成合并采购清单，去超市照着买就对啦！

### ✨ 核心功能

1. **全能 AI 多模态解析 (`gemini-2.0-flash`)**
   - 支持**全格式输入**：粘贴纯文本、拖拽多张长截图、上传音视频文件、导入字幕，甚至直接粘贴 Bilibili / YouTube 视频链接！
   - 极其精准的结构化提炼，剔除废话，保留硬核烹饪重点。
2. **菜谱看板与队列管理**
   - 解析完毕后，将菜谱一键收录进“做饭队列”。
   - 自由校对编辑，支持灵活增删分类标签（荤菜，素菜，汤煲等）。
3. **智能采购清单合并**
   - 左右双栏设计，从左侧勾选今天想做的菜，右侧实时生成合并食材清单。
   - **自动去重累加**：做两道菜都需要生抽？帮你自动加起总用量！遇到单位冲突（“适量” vs “20克”），会高亮提示用户手动确认。
4. **便签式导出**
   - 买菜嫌麻烦？一键点击“导出图片”，将精美的购物清单存到手机相册，去一趟超市搞定一天的口粮！
5. **灵动手绘风 UI**
   - 告别冷冰冰的表格。整个应用采用了温暖的**手绘画风 (Hand-Drawn Effect)**：不规则抖动的边框、胶带贴纸元素、甚至中英双语切换。
   - 大量采用了 `framer-motion` 的物理弹簧动画，交互充满生命力（偷偷点一下左上角的厨师帽试试🎉）。

### 🛠️ 技术栈说明
- **前端核心**: React 18, Vite, `framer-motion` (流畅动画), `lucide-react` (精美图标), `html2canvas` (海报生成)。
- **后端代理 / AI**: 极简 Express / Node.js 服务端，Multer 处理文件，`@google/genai` 接入 Gemini 大模型。
- **样式**: 原生 CSS 变量驱动，手动画风纯 CSS 实现，无冗余 UI 组件库。

### 🚀 本地运行部署

1. **前置要求**: 安装 Node.js v18+。
2. **获取免费 API Key**: 前往 [Google AI Studio](https://aistudio.google.com/apikey) 申请一个免费的 Gemini API 密钥。
3. **安装依赖**:
   ```bash
   git clone https://github.com/your-username/recipe-recognizer.git
   cd recipe-recognizer
   npm install
   ```
4. **配置环境变量**:
   在项目根目录下新建一个 `.env` 文件，填入你的大模型 Key：
   ```env
   GEMINI_API_KEY=你的_API_KEY_放在这里
   ```
5. **启动双端服务**:
   为了处理音视频文件，本项目包含一个基础的 Node.js 后端。
   ```bash
   # 开启终端 1，启动后端代理与文件处理服务（默认 3001 端口）
   npm run server
   
   # 开启终端 2，启动前端页面
   npm run dev
   ```
6. **使用**: 浏览器访问控制台输出的 `http://localhost:5173` 即可开始体验！

---

> Crafted with love for Food & Code. 
