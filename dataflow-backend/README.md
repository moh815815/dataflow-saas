# DataFlow Backend — دليل النشر الكامل

## الهيكل
```
dataflow-backend/
├── server.js              ← نقطة الدخول
├── routes/
│   ├── auth.js            ← تسجيل / دخول / JWT
│   ├── billing.js         ← Moyasar + باقات
│   ├── convert.js         ← PDF/صورة/نص → جدول
│   └── tables.js          ← CRUD الجداول
├── middleware/
│   ├── auth.js            ← JWT verification
│   └── limits.js          ← حدود الباقات
├── db/
│   └── schema.sql         ← Supabase tables
├── .env.example
└── package.json
```

---

## خطوات النشر

### 1. Supabase (قاعدة البيانات)
1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ مشروعاً جديداً
2. افتح **SQL Editor** والصق محتوى `db/schema.sql` ثم نفّذه
3. من **Settings → API** انسخ:
   - `Project URL` → `SUPABASE_URL`
   - `service_role key` → `SUPABASE_SERVICE_KEY`

### 2. Moyasar (الدفع)
1. سجّل في [moyasar.com](https://moyasar.com)
2. من لوحة التحكم انسخ:
   - `Secret Key` → `MOYASAR_SECRET_KEY`
   - `Publishable Key` → `MOYASAR_PUBLISHABLE_KEY`
3. أضف webhook URL: `https://your-domain.com/api/billing/webhook`

### 3. نشر الـ Backend (Railway)
```bash
# 1. ثبّت Railway CLI
npm install -g railway

# 2. سجّل الدخول
railway login

# 3. أنشئ مشروع
railway init

# 4. أضف متغيرات البيئة
railway variables set PORT=3001
railway variables set JWT_SECRET=your_long_secret
railway variables set SUPABASE_URL=https://xxx.supabase.co
railway variables set SUPABASE_SERVICE_KEY=eyJ...
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set MOYASAR_SECRET_KEY=sk_test_...
railway variables set FRONTEND_URL=https://your-frontend.com

# 5. نشر
railway up
```

**أو على Render:**
1. اربط مستودع GitHub
2. أضف متغيرات البيئة من لوحة Render
3. Build Command: `npm install`
4. Start Command: `npm start`

### 4. ربط الـ Frontend
في ملف `dataflow.html` عدّل:
```javascript
const API_BASE = 'https://your-railway-domain.up.railway.app/api';
```

---

## API Endpoints

### Auth
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/auth/register` | تسجيل مستخدم جديد |
| POST | `/api/auth/login` | تسجيل الدخول |
| GET | `/api/auth/me` | بيانات المستخدم الحالي |
| PATCH | `/api/auth/profile` | تحديث الملف الشخصي |
| PATCH | `/api/auth/password` | تغيير كلمة المرور |

### Convert
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/convert/text` | نص → جدول |
| POST | `/api/convert/image` | صورة → جدول |
| POST | `/api/convert/ai-table` | توليد بيانات ذكية |
| POST | `/api/convert/ai-command` | أمر طبيعي على الجدول |

### Tables
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/tables` | قائمة الجداول |
| POST | `/api/tables` | إنشاء جدول |
| GET | `/api/tables/:id` | جدول محدد |
| PUT | `/api/tables/:id` | تحديث جدول |
| DELETE | `/api/tables/:id` | حذف جدول |

### Billing
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/billing/checkout` | إنشاء رابط دفع |
| POST | `/api/billing/webhook` | Moyasar webhook |
| GET | `/api/billing/status` | حالة الباقة |
| GET | `/api/billing/history` | سجل المدفوعات |

---

## حدود الباقات
| الباقة | التحويلات | الجداول | الصفوف |
|--------|-----------|---------|--------|
| مجاني | 5/شهر | 10 | 100 |
| احترافي 99 ر.س | غير محدود | غير محدود | غير محدود |
| مؤسسي 499 ر.س | غير محدود | غير محدود | غير محدود |
