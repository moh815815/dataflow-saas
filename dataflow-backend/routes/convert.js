const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth');
const { checkConversion } = require('../middleware/limits');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JSON_PROMPT = `أجب بـ JSON فقط بدون أي نص إضافي أو markdown:
{"columns":["عمود1","عمود2",...],"rows":[["قيمة1","قيمة2",...],...],"summary":"وصف مختصر"}`;

// ── POST /api/convert/text ──
router.post('/text', authMiddleware, checkConversion, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'النص مطلوب' });

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `حلّل هذا النص واستخرج منه بيانات منظمة في جدول.\n${JSON_PROMPT}\n\nالنص:\n${text}`
      }]
    });

    const raw = msg.content[0].text;
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    await logHistory(req.userId, 'text', 'تحليل نص', parsed.rows?.length || 0);
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/convert/image ──
router.post('/image', authMiddleware, checkConversion, async (req, res) => {
  try {
    const { base64, mediaType } = req.body;
    if (!base64) return res.status(400).json({ error: 'الصورة مطلوبة' });

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: base64 } },
          { type: 'text', text: `اقرأ هذه الصورة واستخرج كل البيانات المنظمة منها.\nإذا كانت فاتورة: أسماء وكميات وأسعار.\nإذا كانت جدول: أعمدة وصفوف.\nإذا كانت بطاقة عمل: اسم وهاتف وبريد وشركة.\n${JSON_PROMPT}` }
        ]
      }]
    });

    const raw = msg.content[0].text;
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    await logHistory(req.userId, 'image', 'مسح صورة', parsed.rows?.length || 0);
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/convert/ai-table ──
// AI fill table with realistic data
router.post('/ai-table', authMiddleware, async (req, res) => {
  try {
    const { columns } = req.body;
    if (!columns?.length) return res.status(400).json({ error: 'الأعمدة مطلوبة' });

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `أنشئ 6 صفوف من بيانات تجريبية واقعية سعودية للأعمدة التالية: ${columns.join(', ')}\nأجب بـ JSON فقط: {"rows":[["قيمة1","قيمة2",...],...]}`
      }]
    });

    const raw = msg.content[0].text;
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/convert/ai-command ──
// AI data assistant — manipulate table via natural language
router.post('/ai-command', authMiddleware, async (req, res) => {
  try {
    const { command, cols, rows } = req.body;
    if (!command) return res.status(400).json({ error: 'الأمر مطلوب' });

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `أنت مساعد بيانات ذكي. بيانات الجدول:
الأعمدة: ${JSON.stringify(cols)}
الصفوف: ${JSON.stringify(rows)}

طلب المستخدم: "${command}"

إذا كان الطلب يغيّر البيانات، أجب بـ JSON فقط:
{"action":"update","cols":[...],"rows":[...],"message":"تم ..."}
إذا كان سؤالاً:
{"action":"answer","message":"الجواب"}
لا تكتب أي نص خارج الـ JSON.`
      }]
    });

    const raw = msg.content[0].text;
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function logHistory(userId, type, name, rows) {
  await supabase.from('history').insert({
    user_id: userId, type, name,
    rows_count: rows,
    created_at: new Date()
  }).catch(() => {});
}

module.exports = router;
