import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 翻译资源
const resources = {
    zh: {
        translation: {
            app: {
                title: '厨房课代表',
                subtitle: '自动识别菜谱 · 拯救厨房小白 · 今天吃点好的',
                loading: '正在努力加载大模型...'
            },
            nav: {
                recognize: '识别',
                queue: '队列'
            },
            tabs: {
                image: '图片识别',
                video: '视频上传',
                audio: '音频上传',
                subtitle: '字幕文件',
                link: '视频链接',
                text: '文字输入'
            },
            imageTab: {
                dragDrop: '把菜谱图片/截图拖到这里，或者',
                clickUpload: '点击上传',
                multipleTip: '支持同时上传多张长图进行合并识别。',
                demoButton: '不知道传什么？点这里加载演示菜谱'
            },
            textTab: {
                placeholder: '在此粘贴或输入菜谱文本，例如：\n\n酸辣土豆丝\n\n食材：\n土豆 2个\n青椒 1个\n盐 适量\n\n步骤：\n1. 土豆切丝\n2. 热锅下油...',
                demoButton: '加载演示文本'
            },

            results: {
                title: '解析结果',
                saveAll: '保存全部',
                exportJson: 'JSON',
                exportMarkdown: 'Markdown',
                startOver: '重新开始',
                shoppingList: '采购清单',
                dishDetails: '菜品详情',
                items: '项食材',
                saveToQueue: '保存到队列',
                dishes: '菜品详情',
                ingredients: '所需食材',
                editIngredients: '修改食材',
                emptyList: '此处空空如也...',
                saveDishTooltipSaved: '已保存',
                saveDishTooltipUnsaved: '保存到队列',
                rawText: '查看原始识别文本',
                cancel: '取消',
                confirm: '完成',
                ingredientName: '食材名 (如：土豆)',
                ingredientAmount: '用量',
                addRow: '添加一行',
                noIngredients: '未识别到食材',
                originalName: '原名：',
                steps: '步骤',
                saveToQueue: '保存到队列'
            },
            queue: {
                title: '做饭队列 / 已保存',
                clearAll: '清空全部',
                manageCategories: '管理分类',
                addCategoryPlaceholder: '输入分类名，按回车添加...',
                addCategorySuccess: '已添加分类',
                deleteCategoryConfirm: '删除分类',
                deleteCategoryText: '确定要删除分类 "{category}" 吗？该分类下的菜谱会被归为"未分类"。',
                shoppingList: '今日采购清单',
                exportImage: '导出采购清单图片',
                selectAll: '全选',
                clearSelection: '一键清空选择',
                selectDishTip: '← 请在左侧勾选您今天想做的菜',
                noDishes: '还没有保存的菜谱',
                ingredientsInfo: '合计 {count} 项食材，点击可查看/编辑详情。',
                unitConflict: '不同单位 ({units})，需手动确认',
                generating: '生成中...',
                warningUnit: '注意：部分食材单位不同，请根据实际情况调整。',
                selectedDishes_pre: '已选 ',
                selectedDishes_post: ' 道菜',
                mergeList: '合并清单',
                delete: '删除',
                exportSuccess: '采购清单图片已导出',
                exportFailed: '导出图片失败',
                deleteCategory: '删除分类',
                newCategory: '新分类',
                mergedTitle: '合并采购清单',
                includes: '包含',
                item: '食材',
                totalAmount: '总量',
                source: '来源',
                deleteCategoryTitle: '删除分类',
                deleteCategoryBody: '确认删除分类',
                deleteCategoryAsk: '吗？',
                deleteCategoryAutoChange: '该分类下的所有菜谱将自动变为 "未分类"。',
                confirmDelete: '删除'
            },
            categories: {
                all: '全部',
                uncategorized: '未分类',
                meat: '荤菜',
                veg: '素菜',
                soup: '汤煲',
                staple: '主食',
                bake: '烘焙',
                snack: '小吃',
                other: '其他'
            },
            ingCategories: {
                '主料': '主料',
                '蔬菜': '蔬菜',
                '调料': '调料',
                '香料': '香料',
                '液体': '液体',
                '未分类': '未分类',
                '其他': '其他'
            },
            status: {
                waiting: '等待中',
                active: '进行中...',
                complete: '完成',
                error: '发生错误'
            },
            errors: {
                noImage: '请先选择图片文件',
                noFile: '请先选择文件',
                noSubtitle: '请上传字幕文件或粘贴字幕文本',
                noLink: '请输入视频链接',
                noText: '请输入菜谱文本',
                parseFailed: 'AI 返回的格式无法解析，请重试',
                unsupportedFormat: '不支持的文件格式 {{ext}}，请上传 {{accept}}'
            },
            videoTab: {
                dragDrop: '拖拽文件到此处，或',
                clickUpload: '点击选择文件',
                videoFormats: '支持 MP4 / MOV / WebM 等视频格式',
                audioFormats: '支持 MP3 / WAV / M4A 等音频格式'
            },
            linkTab: {
                label: '视频链接',
                placeholder: '粘贴 YouTube / Bilibili / 抖音 视频链接...'
            },
            subtitleTab: {
                dragDrop: '拖拽字幕文件或',
                clickUpload: '点击选择',
                formats: '支持 SRT / VTT / TXT 格式',
                or: '—— 或者 ——',
                pasteLabel: '粘贴字幕文本'
            },
            dishCategories: {
                '荤菜': '荤菜',
                '素菜': '素菜',
                '汤煲': '汤煲',
                '主食': '主食',
                '烘焙': '烘焙',
                '小吃': '小吃',
                '未分类': '未分类'
            },
            pipeline: {
                start: '开始 AI 识别',
                cancel: '取消识别',
                steps: {
                    acquire: '获取媒体/字幕',
                    transcribe: '音画分析/识别',
                    structure: '结构化菜谱',
                    convert: '单位换算合并',
                    output: '输出结果'
                },
                progress: {
                    uploading: '正在上传文件到服务器...',
                    transcribed: '转写完成 ({{count}} 字符)',
                    uploadingImage: '正在上传 {{count}} 张图片进行 OCR 识别...',
                    ocrDone: 'OCR 识别完成 ({{count}} 字符)',
                    callingAI: '正在调用 AI 解析菜谱...',
                    aiDone: 'AI 解析完成，识别到 {{count}} 道菜',
                    acquiring: '正在获取内容...',
                    textAcquired: '文本内容已获取',
                    videoAcquired: '视频文件已获取',
                    audioAcquired: '音频文件已获取',
                    imageAcquired: '图片文件已获取',
                    subtitleParsedText: '字幕文本已解析 ({{count}} 条)',
                    analyzing: '正在进行音画内容分析...',
                    structuring: '正在识别菜谱结构...',
                    aiFailedFallback: 'AI 解析失败，使用本地解析器...',
                    localFallback: '使用本地解析器...',
                    dishesStructured: '识别到 {{count}} 道菜谱',
                    converting: '正在进行单位换算与食材合并...',
                    merged: '合并完成：{{count}} 种食材',
                    warnings: ' ({{count}} 项需确认)',
                    generating: '正在生成结果...',
                    completed: '结果生成完毕'
                },
                error: {
                    subtitleFailed: '字幕解析失败',
                    linkUnsupported: '视频链接解析暂不支持直接下载...',
                    linkDetail: '视频链接直接解析暂不支持。\n\n请：\n1. 手动下载视频后上传\n2. 或提取视频字幕/文本后粘贴',
                    noContent: '未能获取到有效内容，请检查输入',
                    parseFailed: '未能从内容中识别出菜谱，请检查输入内容是否包含菜谱信息'
                }
            },
            markdown: {
                title: '🍳 菜谱识别结果',
                genTime: '生成时间：',
                shoppingList: '🛒 总食材采购清单',
                tableHeader: '| 食材 | 用量 | 分类 | 备注 |\n|------|------|------|------|',
                dishDetails: '🍽️ 各菜品详情',
                ingredients: '**食材：**',
                steps: '**步骤：**',
                warning: '⚠️ 单位无法换算：'
            },
            demo: {
                text: '酸辣土豆丝\n\n食材\n土豆 2个（约650克）\n青椒 1个\n红椒 半个\n干辣椒 5根\n花椒 10粒\n蒜 3瓣\n白醋 20克\n盐 3克\n生抽 10毫升\n食用油 30毫升\n\n步骤\n1. 土豆去皮切成细丝，放入清水中浸泡10分钟去除淀粉\n2. 青红椒切丝，蒜切末，干辣椒剪段\n3. 锅中烧水，水开后放入土豆丝焯水30秒捞出，过凉水沥干\n4. 热锅倒入食用油，小火放入花椒和干辣椒爆香\n5. 放入蒜末炒香，加入青红椒丝翻炒\n6. 倒入土豆丝，大火快速翻炒1分钟\n7. 加入白醋、盐、生抽，继续翻炒均匀\n8. 出锅装盘即可'
            },
            toasts: {
                updatedRecipe: '已更新菜谱与采购清单',
                savedDishes: '{{count}} 道菜已保存到做饭队列',
                savedDish: '"{{name}}" 已保存到做饭队列',
                jsonDownloaded: 'JSON 文件已下载',
                mdCopied: 'Markdown 已复制到剪贴板',
                mdDownloaded: 'Markdown 文件已下载',
                demoTextLoaded: '已加载示例菜谱文本',
                filesAdded: '已添加 {{count}} 个文件',
                fileSelected: '已选择文件: {{name}}'
            }
        }
    },
    en: {
        translation: {
            app: {
                title: 'Kitchen Notebook',
                subtitle: 'Auto-parse recipes · Save kitchen beginners · Eat well today',
                loading: 'Waking up the AI model...'
            },
            nav: {
                recognize: 'Recognize',
                queue: 'Queue'
            },
            tabs: {
                image: 'Image Upload',
                video: 'Video Upload',
                audio: 'Audio Upload',
                subtitle: 'Subtitle File',
                link: 'Video Link',
                text: 'Text Input'
            },
            imageTab: {
                dragDrop: 'Drag and drop recipe images/screenshots here, or',
                clickUpload: 'Click to upload',
                multipleTip: 'Supports uploading multiple long images for merged recognition.',
                demoButton: "Don't know what to upload? Load demo recipe"
            },
            textTab: {
                placeholder: 'Paste or type recipe text here, for example:\n\nSpicy and Sour Shredded Potato\n\nIngredients:\nPotato 2\nGreen pepper 1\nSalt pinch\n\nSteps:\n1. Shred potatoes\n2. Heat pan with oil...',
                demoButton: 'Load demo text'
            },

            results: {
                title: 'Parsing Results',
                saveAll: 'Save All',
                exportJson: 'JSON',
                exportMarkdown: 'Markdown',
                startOver: 'Start Over',
                shoppingList: 'Shopping List',
                dishDetails: 'Dish Details',
                items: 'item(s)',
                saveToQueue: 'Save to queue',
                dishes: 'Dish Details',
                ingredients: 'Ingredients',
                editIngredients: 'Edit Ingredients',
                emptyList: 'Nothing here yet...',
                saveDishTooltipSaved: 'Saved',
                saveDishTooltipUnsaved: 'Save to queue',
                rawText: 'View raw recognized text',
                cancel: 'Cancel',
                confirm: 'Done',
                ingredientName: 'Ingredient (e.g. Potato)',
                ingredientAmount: 'Amount',
                addRow: 'Add Row',
                noIngredients: 'No ingredients detected',
                originalName: 'Original: ',
                steps: 'Steps',
                saveToQueue: 'Save to queue'
            },
            queue: {
                title: 'Cooking Queue / Saved',
                clearAll: 'Clear All',
                manageCategories: 'Manage Categories',
                addCategoryPlaceholder: 'Type category and press Enter...',
                addCategorySuccess: 'Category added',
                deleteCategoryConfirm: 'Delete Category',
                deleteCategoryText: 'Are you sure you want to delete the category "{category}"? Dishes in this category will become "Uncategorized".',
                shoppingList: 'Today\'s Shopping List',
                exportImage: 'Export List Image',
                selectAll: 'Select All',
                clearSelection: 'Clear Selection',
                selectDishTip: '← Select the dishes you want to cook today on the left',
                noDishes: 'No saved recipes yet',
                ingredientsInfo: 'Total {count} ingredients. Click to view/edit details.',
                unitConflict: 'Different units ({units}), manual check needed',
                generating: 'Generating...',
                warningUnit: 'Note: Some ingredients have different units, please adjust according to actual situation.',
                selectedDishes_pre: 'Selected ',
                selectedDishes_post: ' dish(es)',
                mergeList: 'Merge List',
                delete: 'Delete',
                exportSuccess: 'Shopping list image exported',
                exportFailed: 'Failed to export image',
                deleteCategory: 'Delete Category',
                newCategory: 'New Category',
                mergedTitle: 'Merged Shopping List',
                includes: 'Includes',
                item: 'Ingredient',
                totalAmount: 'Total Amount',
                source: 'Source',
                deleteCategoryTitle: 'Delete Category',
                deleteCategoryBody: 'Are you sure you want to delete category',
                deleteCategoryAsk: '?',
                deleteCategoryAutoChange: 'All dishes in this category will become "Uncategorized".',
                confirmDelete: 'Delete'
            },
            categories: {
                all: 'All',
                uncategorized: 'Uncategorized',
                meat: 'Meat',
                veg: 'Vegetables',
                soup: 'Soup/Stew',
                staple: 'Staples',
                bake: 'Baking',
                snack: 'Snacks',
                other: 'Other'
            },
            ingCategories: {
                '主料': 'Main',
                '蔬菜': 'Veg',
                '调料': 'Seasoning',
                '香料': 'Spice',
                '液体': 'Liquid',
                '未分类': 'Uncategorized',
                '其他': 'Other'
            },
            status: {
                waiting: 'Waiting',
                active: 'Processing...',
                complete: 'Done',
                error: 'Error'
            },
            errors: {
                noImage: 'Please select an image file first',
                noFile: 'Please select a file first',
                noSubtitle: 'Please upload a subtitle file or paste text',
                noLink: 'Please enter a video link',
                noText: 'Please enter recipe text',
                parseFailed: 'AI response format could not be parsed, please try again',
                unsupportedFormat: 'Unsupported file format {{ext}}, please upload {{accept}}'
            },
            videoTab: {
                dragDrop: 'Drag files here, or',
                clickUpload: 'Click to select file',
                videoFormats: 'Supports MP4 / MOV / WebM video formats',
                audioFormats: 'Supports MP3 / WAV / M4A audio formats'
            },
            linkTab: {
                label: 'Video Link',
                placeholder: 'Paste YouTube / Bilibili / TikTok video link...'
            },
            subtitleTab: {
                dragDrop: 'Drag subtitle file or',
                clickUpload: 'Click to select',
                formats: 'Supports SRT / VTT / TXT formats',
                or: '—— or ——',
                pasteLabel: 'Paste subtitle text'
            },
            dishCategories: {
                '荤菜': 'Meat',
                '素菜': 'Vegetables',
                '汤煲': 'Soup/Stew',
                '主食': 'Staples',
                '烘焙': 'Baking',
                '小吃': 'Snacks',
                '未分类': 'Uncategorized'
            },
            pipeline: {
                start: 'Start AI Recognition',
                cancel: 'Cancel',
                steps: {
                    acquire: 'Acquire Media/Subtitles',
                    transcribe: 'A/V Analysis/Transcription',
                    structure: 'Structure Recipe',
                    convert: 'Convert & Merge Units',
                    output: 'Output Results'
                },
                progress: {
                    uploading: 'Uploading file to server...',
                    transcribed: 'Transcription complete ({{count}} characters)',
                    uploadingImage: 'Uploading {{count}} image(s) for OCR...',
                    ocrDone: 'OCR complete ({{count}} characters)',
                    callingAI: 'Calling AI to parse recipe...',
                    aiDone: 'AI parsing complete, identified {{count}} dish(es)',
                    acquiring: 'Acquiring content...',
                    textAcquired: 'Text content acquired',
                    videoAcquired: 'Video file acquired',
                    audioAcquired: 'Audio file acquired',
                    imageAcquired: 'Image file acquired',
                    subtitleParsedText: 'Subtitle text parsed ({{count}} entries)',
                    analyzing: 'Analyzing audio/visual content...',
                    structuring: 'Identifying recipe structure...',
                    aiFailedFallback: 'AI parsing failed, falling back to local parser...',
                    localFallback: 'Using local parser...',
                    dishesStructured: 'Identified {{count}} recipe(s)',
                    converting: 'Converting units and merging ingredients...',
                    merged: 'Merging complete: {{count}} ingredient(s)',
                    warnings: ' ({{count}} require confirmation)',
                    generating: 'Generating results...',
                    completed: 'Results generation completed'
                },
                error: {
                    subtitleFailed: 'Failed to parse subtitles',
                    linkUnsupported: 'Direct video link parsing is not supported yet...',
                    linkDetail: 'Direct video link parsing is not supported.\n\nPlease:\n1. Download the video manually and upload it\n2. Or extract subtitles/text and paste it',
                    noContent: 'Failed to extract valid content, please check your input',
                    parseFailed: 'Failed to identify a recipe from the content, please verify if it contains recipe information'
                }
            },
            markdown: {
                title: '🍳 Recipe Recognition Results',
                genTime: 'Generated at: ',
                shoppingList: '🛒 Total Shopping List',
                tableHeader: '| Ingredient | Amount | Category | Notes |\n|------|------|------|------|',
                dishDetails: '🍽️ Dish Details',
                ingredients: '**Ingredients:**',
                steps: '**Steps:**',
                warning: '⚠️ Unit cannot be converted: '
            },
            demo: {
                text: 'Spicy and Sour Shredded Potato\n\nIngredients:\nPotato 2 (approx. 650g)\nGreen pepper 1\nRed pepper half\nDried chili 5\nSichuan peppercorn 10\nGarlic 3 cloves\nWhite vinegar 20g\nSalt 3g\nLight soy sauce 10ml\nCooking oil 30ml\n\nSteps:\n1. Peel the potatoes and cut them into thin shreds. Soak in water for 10 minutes to remove starch.\n2. Shred the green and red peppers, mince the garlic, and cut the dried chilies into sections.\n3. Boil water in a pot, blanch the potato shreds for 30 seconds, then remove and drain off cold water.\n4. Heat cooking oil in a pan, add Sichuan peppercorns and dried chilies over low heat until fragrant.\n5. Add minced garlic and stir-fry until fragrant, then add shredded green and red peppers and stir-fry.\n6. Pour in the potato shreds and stir-fry quickly over high heat for 1 minute.\n7. Add white vinegar, salt, and light soy sauce, and continue stirring evenly.\n8. Take out of the pan and serve.'
            },
            toasts: {
                updatedRecipe: 'Recipe and shopping list updated',
                savedDishes: '{{count}} dish(es) saved to cooking queue',
                savedDish: '"{{name}}" saved to cooking queue',
                jsonDownloaded: 'JSON file downloaded',
                mdCopied: 'Markdown copied to clipboard',
                mdDownloaded: 'Markdown file downloaded',
                demoTextLoaded: 'Demo recipe text loaded',
                filesAdded: '{{count}} file(s) added',
                fileSelected: 'File selected: {{name}}'
            }
        }
    }
};

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: 'zh', // 默认语言
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
