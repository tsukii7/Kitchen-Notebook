/* ============================================
   Recipe Text Parser
   Cleans text, detects dish boundaries,
   extracts structured recipe data per dish
   ============================================ */

/** Filler words / noise to clean from ASR output */
const FILLER_WORDS = [
    '然后啊', '那个啊', '这个啊', '就是啊', '对吧啊',
    '然后呢', '那个呢', '嗯嗯', '啊啊', '呃呃',
    '然后', '那个', '就是说', '就是', '对吧',
    '嗯', '呃', '额', '哈', '哎',
    '好的', '好了', 'OK',
];

/** Dish boundary patterns */
const DISH_BOUNDARY_PATTERNS = [
    /(?:接下来|下面|现在)(?:我们)?(?:来)?做(.+)/,
    /(?:今天|这道)?(?:做|炒|煮|蒸|烤|炸|煎|焖|炖)(?:一[道个份])?(.+)/,
    /第[一二三四五六七八九十\d]+道[：:菜]?\s*(.+)/,
    /^[【\[](.+?)[】\]]/,
    /^(?:菜[名品]|dish|recipe)[：:]\s*(.+)/i,
];

/** Section header patterns */
const SECTION_HEADERS = {
    ingredients: /^(?:食材|材料|用料|原料|配料|主料|辅料|调料|所需食材|所需材料|准备材料|ingredients)/i,
    steps: /^(?:步骤|做法|烹饪步骤|制作方法|制作步骤|烹饪方法|做法步骤|instructions|directions|steps)/i,
    name: /^(?:菜名|菜品名|dish|recipe)/i,
};

/** Ingredient line patterns */
const INGREDIENT_PATTERNS = [
    // "面粉 200克", "鸡蛋 3个", etc.
    /^(.+?)\s*[：:]*\s*(\d+[\d./]*)\s*(ml|毫升|升|L|杯|cups?|汤匙|大匙|tbsp|茶匙|小匙|tsp|克|g|千克|kg|公斤|斤|两|磅|lbs?|盎司|oz|个|根|片|块|颗|条|只|瓣|段|朵|把|棵|头|粒|枚|勺|碗|盘|包|袋|罐|瓶|盒)/i,
    // "食材名 适量/少许"
    /^(.+?)\s*[：:]*\s*(适量|少许|若干|一些|半|一点|一丁点|数片|数根|数个)/,
];

/** Step pattern */
const STEP_PATTERN = /^(?:(\d+)[.、\s,)）]|第(\d+)步[：:]?|step\s*(\d+)[.:]?)\s*(.+)/i;

/**
 * Clean ASR/subtitle text: remove filler words and noise
 */
export function cleanText(text) {
    let cleaned = text;
    // Sort by length descending to avoid partial matches
    const sorted = [...FILLER_WORDS].sort((a, b) => b.length - a.length);
    for (const filler of sorted) {
        cleaned = cleaned.replace(new RegExp(filler, 'g'), '');
    }
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

/**
 * Detect dish boundaries in text and split into segments
 */
export function segmentDishes(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const segments = [];
    let currentSegment = { name: '', lines: [] };

    for (const line of lines) {
        let matched = false;

        for (const pattern of DISH_BOUNDARY_PATTERNS) {
            const m = line.match(pattern);
            if (m) {
                // Save previous segment if it has content
                if (currentSegment.lines.length > 0 || currentSegment.name) {
                    segments.push({ ...currentSegment });
                }
                currentSegment = {
                    name: m[1]?.trim().replace(/[：:,，。.、]/g, '') || '',
                    lines: [],
                };
                matched = true;
                break;
            }
        }

        if (!matched) {
            currentSegment.lines.push(line);
        }
    }

    // Push last segment
    if (currentSegment.lines.length > 0 || currentSegment.name) {
        segments.push(currentSegment);
    }

    // If no segments found, treat entire text as one dish
    if (segments.length === 0) {
        segments.push({ name: '', lines });
    }

    return segments;
}

/**
 * Parse a single text segment into a structured recipe
 */
function parseSegment(lines, segmentName, index) {
    let dishName = segmentName || '';
    let ingredients = [];
    let steps = [];
    let currentSection = 'unknown';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check section headers
        if (SECTION_HEADERS.name.test(line)) {
            if (i + 1 < lines.length) {
                dishName = lines[i + 1].replace(/[：:]/g, '').trim();
                i++; // skip next line
            }
            continue;
        }
        if (SECTION_HEADERS.ingredients.test(line)) {
            currentSection = 'ingredients';
            continue;
        }
        if (SECTION_HEADERS.steps.test(line)) {
            currentSection = 'steps';
            continue;
        }

        // Auto-detect dish name from first short line
        if (!dishName && currentSection === 'unknown' && line.length <= 20 && !/\d/.test(line)) {
            dishName = line.replace(/[：:]/g, '').trim();
            continue;
        }

        // Try ingredient patterns
        let isIngredient = false;
        if (currentSection !== 'steps') {
            for (const pattern of INGREDIENT_PATTERNS) {
                const m = line.match(pattern);
                if (m) {
                    currentSection = 'ingredients';
                    ingredients.push({
                        name: m[1].replace(/[：:,，。.、]/g, '').trim(),
                        amount: parseFloat(m[2]) || m[2],
                        unit: m[3] || '',
                    });
                    isIngredient = true;
                    break;
                }
            }
        }
        if (isIngredient) continue;

        // Try step pattern
        const stepMatch = line.match(STEP_PATTERN);
        if (stepMatch) {
            currentSection = 'steps';
            steps.push(stepMatch[4] || line);
            continue;
        }

        // Context-based assignment
        if (currentSection === 'steps') {
            steps.push(line);
        } else if (currentSection === 'ingredients') {
            const looseMatch = line.match(/^([^\d]+?)\s+(\S+)$/);
            if (looseMatch) {
                ingredients.push({
                    name: looseMatch[1].replace(/[：:,，。.、]/g, '').trim(),
                    amount: looseMatch[2],
                    unit: '',
                });
            }
        } else if (line.length > 15) {
            steps.push(line);
        }
    }

    if (!dishName) dishName = `菜品 ${index + 1}`;
    if (steps.length === 0) steps = ['（未能识别烹饪步骤）'];

    return {
        dish_name: dishName,
        ingredients,
        steps,
        confidence: {
            dish_name: dishName.startsWith('菜品') ? 0.5 : 0.9,
            ingredients: ingredients.length > 0 ? 0.85 : 0.3,
            steps: steps[0] === '（未能识别烹饪步骤）' ? 0.2 : 0.88,
        },
        warnings: [
            ...ingredients.filter(i => typeof i.amount === 'string' && ['适量', '少许', '若干'].includes(i.amount))
                .map(i => `单位无法换算：${i.name} ${i.amount}`),
        ],
    };
}

/**
 * Main entry: parse raw text into structured recipes
 */
export function parseRecipes(rawText) {
    const cleaned = cleanText(rawText);
    const segments = segmentDishes(cleaned);

    return segments.map((seg, idx) => {
        return parseSegment(seg.lines, seg.name, idx);
    });
}
