/* ============================================
   Express Backend Server — Google Gemini API
   - POST /api/transcribe: Gemini audio transcription
   - POST /api/ocr: Gemini Vision OCR (image → text)
   - POST /api/parse-recipe: Gemini recipe structuring
   With automatic retry for 429 rate limits
   ============================================ */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Multer: store uploaded files temporarily
const upload = multer({
    dest: path.join(__dirname, 'uploads'),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Gemini client
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const MAX_RETRIES = 3;

function getModel() {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'your_gemini_api_key_here') {
        throw new Error('请在 .env 文件中设置 GEMINI_API_KEY。获取免费 Key: https://aistudio.google.com/apikey');
    }
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: MODEL_NAME });
}

/**
 * Retry wrapper: auto-retries on 429 with exponential backoff
 */
async function withRetry(fn, label = 'API') {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const is429 = err.message?.includes('429') || err.status === 429;
            if (is429 && attempt < MAX_RETRIES) {
                // Parse retry delay from error message, default to exponential backoff
                const retryMatch = err.message?.match(/retry in (\d+(?:\.\d+)?)/i);
                const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : attempt * 15;
                console.log(`[${label}] 429 rate limit, waiting ${waitSec}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
                await new Promise(r => setTimeout(r, waitSec * 1000));
            } else {
                throw err;
            }
        }
    }
}

/**
 * Extract clean error message for the user
 */
/**
 * Extract clean error message for the user
 */
function cleanError(err) {
    const msg = err.message || '未知错误';
    if (msg.includes('429')) {
        return '请求频率超限，请稍后再试（Gemini 免费版每分钟 15 次请求）';
    }
    if (msg.includes('API_KEY')) {
        return '请在 .env 文件中设置有效的 GEMINI_API_KEY';
    }
    if (msg.includes('SAFETY')) {
        return 'AI 安全过滤器拦截了此请求，请修改输入内容后重试';
    }
    if (msg.includes('400 Bad Request') || msg.includes('invalid argument')) {
        return '请求无效或文件格式不受支持，请检查文件是否损坏';
    }
    // Strip long JSON/URL noise and bracketed error prefixes
    return msg.replace(/\[.*?\]\s*/g, '').replace(/http\S+/g, '').trim().substring(0, 100) + (msg.length > 100 ? '...' : '');
}

// Mime type helpers
const AUDIO_MIME = {
    '.mp3': 'audio/mp3', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.webm': 'audio/webm',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.wmv': 'video/x-ms-wmv',
};

const IMAGE_MIME = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp',
    '.heic': 'image/heic', '.heif': 'image/heif',
};

// ============================================
// POST /api/transcribe — Gemini Audio Transcription
// ============================================
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
    const filePath = req.file?.path;
    let originalName = req.file?.originalname || 'upload';

    try {
        if (!filePath) {
            return res.status(400).json({ error: '未接收到文件' });
        }

        const model = getModel();
        const ext = path.extname(originalName).toLowerCase();

        if (!AUDIO_MIME[ext]) {
            throw new Error(`不支持的文件格式 (${ext})。请上传 MP3/MP4/WAV/MOV 等常见音视频格式。`);
        }
        const mimeType = AUDIO_MIME[ext];

        console.log(`[Transcribe] Processing: ${originalName} (${(req.file.size / 1024 / 1024).toFixed(1)} MB)`);

        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString('base64');

        const result = await withRetry(() =>
            model.generateContent([
                {
                    inlineData: {
                        mimeType,
                        data: base64Data,
                    },
                },
                '请详细分析这段视频/音频内容。1. 完整转写语音中的所有对话和旁白。2. 【重要】仔细观察视频画面，如果画面中出现了“食材清单”、“步骤说明”等文字信息，请务必完整提取出来。3. 将语音转写内容和画面提取的文字内容整合，按发生顺序或逻辑顺序输出。只输出识别到的内容，不要添加额外的分析或总结。',
            ]),
            'Transcribe'
        );

        fs.unlink(filePath, () => { });

        const text = result.response.text();
        console.log(`[Transcribe] Complete: ${text.length} chars`);

        res.json({
            text,
            fileName: originalName,
            charCount: text.length,
        });
    } catch (err) {
        if (filePath) fs.unlink(filePath, () => { });
        console.error('[Transcribe] Error:', err.message);
        res.status(500).json({ error: cleanError(err) });
    }
});

// ============================================
// POST /api/ocr — Gemini Vision OCR
// ============================================
app.post('/api/ocr', upload.array('files', 10), async (req, res) => {
    const files = req.files;

    try {
        if (!files || files.length === 0) {
            return res.status(400).json({ error: '未接收到图片文件' });
        }

        const model = getModel();
        const parts = [];
        let totalSize = 0;
        let originalNames = [];

        for (const file of files) {
            const ext = path.extname(file.originalname).toLowerCase();
            if (!IMAGE_MIME[ext]) {
                throw new Error(`不支持的图片格式 (${ext})。请上传 JPG/PNG/WebP 等常见图片格式。`);
            }
            const mimeType = IMAGE_MIME[ext];
            totalSize += file.size;
            originalNames.push(file.originalname);

            const imageBuffer = fs.readFileSync(file.path);
            const base64Data = imageBuffer.toString('base64');

            parts.push({
                inlineData: {
                    mimeType,
                    data: base64Data,
                }
            });
        }

        parts.push({
            text: '请提取这些图片中的所有菜谱文字内容，保持原始格式。如果有两张或以上的图片，它们可能是连续长菜谱的不同部分，请根据上下文自然拼接。只输出识别到的文字内容，不要添加额外说明。'
        });

        console.log(`[OCR] Processing ${files.length} images: ${originalNames.join(', ')} (${(totalSize / 1024).toFixed(1)} KB)`);

        const result = await withRetry(() =>
            model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: parts
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 8192,
                },
            }),
            'OCR'
        );

        files.forEach(f => fs.unlink(f.path, () => { }));

        const text = result.response.text();
        console.log(`[OCR] Complete: ${text.length} chars extracted`);

        res.json({
            text,
            fileName: originalNames.join(', '),
            charCount: text.length,
        });
    } catch (err) {
        if (req.files) req.files.forEach(f => fs.unlink(f.path, () => { }));
        console.error('[OCR] Error:', err.message);
        res.status(500).json({ error: cleanError(err) });
    }
});

// ============================================
// POST /api/parse-recipe — Gemini Recipe Structuring
// ============================================
app.post('/api/parse-recipe', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: '未接收到文本内容' });
        }

        const model = getModel();

        console.log(`[ParseRecipe] Processing ${text.length} chars with ${MODEL_NAME}`);

        const prompt = `你是一个专业的菜谱解析助手。以下是一段菜谱相关的文本（可能来自语音转写、字幕、OCR或手写文本），请你：

1. 【重要】每次只识别**一道**最主要的菜品。即使文本中包含多个变体、份量选择或微调（如"10个量"、"14个量"），也请将它们合并为同一个菜品条目。
2. 将不同份量的食材清单合并展示，并在备注中说明区别。
3. 对每道菜提取：
    - 菜名
    - 类别（即使其他内容翻译成英文，请依然完全使用中文：荤菜、素菜、汤煲、主食、烘焙、小吃。如果完全不匹配，可自定义2-4个字）
    - 食材清单（名称+数量+单位+分类）
    - 烹饪步骤
4. 【重要】语言跟随规则：如果上传的菜谱/文本是英文，则你输出的所有内容（包括菜名、食材、步骤、甚至警告信息）必须全部使用英文翻译输出。如果是中文，则全部使用中文。
但是请注意！！！【极其重要】，无论你用什么语言输出内容，"category" 以及 "ingredients.category" 这两个枚举字段的『值』都必须严格保持【中文】，绝不要翻译它们！系统界面会处理这些特定枚举标签。
5. 对于"适量""少许"等模糊用量，保留原始表述版本，可以在"dish_name"或"warnings"中简要备注（例如"蛋挞 (含不同份量配比)"）。
6. 如果存在冲突，或者无法精准翻译的内容，保留原语言。

请严格输出如下JSON格式（不要输出其他内容，只输出JSON数组，不要用markdown代码块包裹）：
[
  {
    "dish_name": "菜名",
    "category": "类别",
    "ingredients": [
      {
          "name": "食材名",
          "amount": "数字或\"适量\"",
          "unit": "单位",
          "category": "主料/蔬菜/调料/香料/液体/其他"
      }
    ],
    "steps": ["步骤1文本", "步骤2文本"],
    "confidence": {
      "dish_name": 0.0到1.0,
      "ingredients": 0.0到1.0,
      "steps": 0.0到1.0
    },
    "warnings": ["可能存在的问题"]
  }
]

【重要】ingredients.category 必须严格并且只用中文从以下列表中选择一个：
- '主料': 肉类 (猪/牛/羊/鸡/鸭)、水产 (鱼/虾/蟹)、蛋类、豆制品 (豆腐/腐竹)、主食 (面/米/年糕)。
- '蔬菜': 所有蔬菜、菌菇 (香菇/木耳/金针菇)、根茎类 (土豆/萝卜)。
- '调料': 油、盐、酱油、醋、糖、淀粉、料酒、蚝油、豆瓣酱、芝麻酱等烹饪佐料。
- '香料': 葱、姜、蒜、辣椒 (干/鲜)、花椒、八角、桂皮、香叶等。
- '液体': 水、高汤、牛奶、啤酒、椰浆。
- '其他': 如果实在无法归类，才使用此项。

注意事项：
- amount字段：如果是数字就用数字类型，如果是"适量""少许"等就用字符串
- unit字段：使用标准单位(g/kg/ml/L/个/根/片/块/瓣/茶匙/汤匙/杯等)
- 如果原文中食材名是同义词（如西红柿/番茄），保留原始名称
- 如果无法识别菜名，设置dish_name为"未知菜品"
- confidence是你对识别结果的置信度，0到1之间

以下是需要解析的菜谱文本：

${text}`;

        const result = await withRetry(() =>
            model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 4096,
                },
            }),
            'ParseRecipe'
        );

        const content = result.response.text();

        // Extract JSON from response (may be wrapped in ```json ... ```)
        let jsonStr = content.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        let recipes;
        try {
            recipes = JSON.parse(jsonStr);
        } catch (parseErr) {
            console.error('[ParseRecipe] JSON parse error, raw response:', content);
            return res.status(500).json({
                error: 'AI 返回的格式无法解析，请重试',
                rawResponse: content,
            });
        }

        if (!Array.isArray(recipes)) {
            recipes = [recipes];
        }

        console.log(`[ParseRecipe] Found ${recipes.length} recipes`);

        res.json({
            recipes,
            model: MODEL_NAME,
        });
    } catch (err) {
        console.error('[ParseRecipe] Error:', err.message);
        res.status(500).json({ error: cleanError(err) });
    }
});

// ============================================
// Health check
// ============================================
app.get('/api/health', (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
    res.json({
        status: 'ok',
        apiKeyConfigured: hasKey,
        model: MODEL_NAME,
        provider: 'Google Gemini',
    });
});

// Start
app.listen(PORT, () => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
    console.log(`\n🍳 Recipe API Server running on http://localhost:${PORT}`);
    console.log(`   Provider: Google Gemini (免费额度)`);
    console.log(`   API Key: ${hasKey ? '✅ Configured' : '❌ Not set — edit .env file'}`);
    console.log(`   Model: ${MODEL_NAME}`);
    console.log(`   Auto-retry: ✅ (429 errors will retry up to ${MAX_RETRIES} times)`);
    console.log(`   获取免费 Key: https://aistudio.google.com/apikey\n`);
});
