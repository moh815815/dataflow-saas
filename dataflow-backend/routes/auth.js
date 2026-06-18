const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET;
const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    if (password.length < 8)
      return res.status(400).json({ error: 'كلمة المرور 8 أحرف على الأقل' });

    // Check existing
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).single();
    if (existing)
      return res.status(409).json({ error: 'البريد مستخدم مسبقاً' });

    const hash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ name, email, password_hash: hash, plan: 'free', conversions_used: 0 })
      .select('id, name, email, plan, conversions_used, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({ token: signToken(user.id), user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user)
      return res.status(401).json({ error: 'بريد أو كلمة مرور غير صحيحة' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'بريد أو كلمة مرور غير صحيحة' });

    const { password_hash, ...safe } = user;
    res.json({ token: signToken(user.id), user: safe });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/auth/me ──
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, plan, conversions_used, conversions_limit, created_at')
      .eq('id', req.userId)
      .single();
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/auth/profile ──
router.patch('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const { name, company, phone } = req.body;
    const { data: user } = await supabase
      .from('users')
      .update({ name, company, phone })
      .eq('id', req.userId)
      .select('id, name, email, plan, company, phone')
      .single();
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/auth/password ──
router.patch('/password', require('../middleware/auth'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { data: user } = await supabase
      .from('users').select('password_hash').eq('id', req.userId).single();

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });

    const hash = await bcrypt.hash(newPassword, 12);
    await supabase.from('users').update({ password_hash: hash }).eq('id', req.userId);
    res.json({ message: 'تم تحديث كلمة المرور' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
