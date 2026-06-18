const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── GET /api/tables ── list user's tables
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('tables')
    .select('id, name, cols, created_at, updated_at, rows_count')
    .eq('user_id', req.userId)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ tables: data });
});

// ── POST /api/tables ── create table
router.post('/', auth, async (req, res) => {
  const { name, cols, rows } = req.body;
  if (!name || !cols) return res.status(400).json({ error: 'الاسم والأعمدة مطلوبان' });

  const { data, error } = await supabase
    .from('tables')
    .insert({
      user_id: req.userId,
      name,
      cols,
      rows: rows || [],
      rows_count: rows?.length || 0
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ table: data });
});

// ── GET /api/tables/:id ── get single table
router.get('/:id', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'الجدول غير موجود' });
  res.json({ table: data });
});

// ── PUT /api/tables/:id ── update table
router.put('/:id', auth, async (req, res) => {
  const { name, cols, rows } = req.body;

  const { data, error } = await supabase
    .from('tables')
    .update({
      name,
      cols,
      rows,
      rows_count: rows?.length || 0,
      updated_at: new Date()
    })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ table: data });
});

// ── DELETE /api/tables/:id ──
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'تم حذف الجدول' });
});

module.exports = router;
