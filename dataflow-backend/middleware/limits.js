const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const LIMITS = {
  free:         { conversions: 5,         tables: 10,  rows: 100 },
  pro:          { conversions: Infinity,  tables: Infinity, rows: Infinity },
  enterprise:   { conversions: Infinity,  tables: Infinity, rows: Infinity },
};

// Check & increment conversion count
module.exports.checkConversion = async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('plan, conversions_used')
      .eq('id', req.userId)
      .single();

    const limit = LIMITS[user.plan]?.conversions ?? 5;

    if (user.conversions_used >= limit)
      return res.status(403).json({
        error: 'انتهت تحويلاتك المجانية',
        code: 'LIMIT_REACHED',
        upgrade_url: '/pricing'
      });

    // Increment
    await supabase
      .from('users')
      .update({ conversions_used: user.conversions_used + 1 })
      .eq('id', req.userId);

    req.userPlan = user.plan;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports.LIMITS = LIMITS;
