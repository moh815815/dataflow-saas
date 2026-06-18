const router = require('express').Router();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MOYASAR_SECRET = process.env.MOYASAR_SECRET_KEY;
const MOYASAR_BASE = 'https://api.moyasar.com/v1';

const PLANS = {
  pro:        { amount: 9900,  name: 'الخطة الاحترافية',  period: 'monthly' },  // 99 SAR in halalas
  enterprise: { amount: 49900, name: 'الخطة المؤسسية',    period: 'monthly' },
};

// ── POST /api/billing/checkout ──
// Create Moyasar payment
router.post('/checkout', auth, async (req, res) => {
  try {
    const { plan, callback_url } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'باقة غير صحيحة' });

    const { data: user } = await supabase
      .from('users').select('name, email').eq('id', req.userId).single();

    const response = await axios.post(
      `${MOYASAR_BASE}/payments`,
      {
        amount: PLANS[plan].amount,
        currency: 'SAR',
        description: `DataFlow — ${PLANS[plan].name}`,
        callback_url: callback_url || `${process.env.FRONTEND_URL}/billing/success`,
        source: {
          type: 'creditcard',
          name: user.name,
          email: user.email,
        },
        metadata: {
          user_id: req.userId,
          plan
        }
      },
      {
        auth: { username: MOYASAR_SECRET, password: '' }
      }
    );

    res.json({
      payment_url: response.data.source?.transaction_url,
      payment_id: response.data.id
    });
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── POST /api/billing/webhook ──
// Moyasar calls this after payment
router.post('/webhook', async (req, res) => {
  try {
    const { id, status, metadata } = req.body;
    if (status !== 'paid') return res.json({ received: true });

    const { user_id, plan } = metadata || {};
    if (!user_id || !plan) return res.status(400).json({ error: 'بيانات ناقصة' });

    // Upgrade user plan
    await supabase.from('users').update({
      plan,
      conversions_used: 0,          // reset counter on upgrade
      conversions_limit: plan === 'pro' ? null : null, // null = unlimited
      plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }).eq('id', user_id);

    // Log payment
    await supabase.from('payments').insert({
      user_id,
      moyasar_id: id,
      plan,
      amount: PLANS[plan]?.amount / 100,
      currency: 'SAR',
      status: 'paid',
      paid_at: new Date()
    });

    res.json({ received: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/billing/status ──
router.get('/status', auth, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('plan, conversions_used, plan_expires_at')
    .eq('id', req.userId)
    .single();

  const limits = {
    free: 5,
    pro: null,
    enterprise: null
  };

  res.json({
    plan: user.plan,
    conversions_used: user.conversions_used,
    conversions_limit: limits[user.plan],
    plan_expires_at: user.plan_expires_at
  });
});

// ── GET /api/billing/history ──
router.get('/history', auth, async (req, res) => {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', req.userId)
    .order('paid_at', { ascending: false });
  res.json({ payments: data || [] });
});

module.exports = router;
