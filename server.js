/**
 * LeadStock ERP — Backend API (ak Upstash Redis — done toujou nan Cloud)
 * ---------------------------------------------------------------------
 * Vèsyon sa a pa sove AUKENN done sou disk machin ki fè l kouri a.
 * Tout done (itilizatè, pwodwi, kliyan, faktè, kòmand, elt.) sove sou
 * Upstash Redis — yon baz done Redis ki viv sou entènèt, TOUJOU aktif,
 * kèlkeswa ki aparèy ou lanse sèvè sa a ladan l.
 *
 * SA VLE DI: si w lanse sèvè sa a sou òdinatè ou jodi a, epi demen sou
 * telefòn ou (Termux), OSWA sou yon sèvis ostaj cloud pita — toutotan
 * fichye .env la gen MENM UPSTASH_REDIS_REST_URL/TOKEN, w ap wè EGZAKMAN
 * menm done yo. Machin ki fè kòd la kouri pa konsève anyen — se Upstash
 * ki fè sa.
 *
 * POU KONFIGIRE (yon sèl fwa):
 *   1) Kreye yon kont gratis sou https://upstash.com
 *   2) Kreye yon "Redis Database" (chwazi rejyon ki pi pre w)
 *   3) Sou paj database la, kopye "UPSTASH_REDIS_REST_URL" ak
 *      "UPSTASH_REDIS_REST_TOKEN"
 *   4) Nan katab stockpro-backend, kreye yon fichye ki rele .env
 *      (kopye .env.example la epi ranpli l) ak:
 *        UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
 *        UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxxxxx
 *   5) npm install
 *   6) node server.js
 *
 * ⚠️ SEKIRITE: JANM voye fichye .env la bay pèsonn, JANM mete l sou
 * GitHub piblik. Nenpòt moun ki gen token sa a gen aksè TOTAL (li,
 * ekri, efase) sou tout done biznis ou.
 * ---------------------------------------------------------------------
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Sou Vercel (oswa nenpòt sèvis "serverless"), pa janm rele process.exit() —
// sa ta kraze fonksyon an nèt (erè FUNCTION_INVOCATION_FAILED). Olye de sa,
// nou kite yon flag epi nou reponn ak yon mesaj klè sou chak demann si
// varyab anviwònman yo pa konfigire.
const MISSING_UPSTASH_CONFIG = !UPSTASH_URL || !UPSTASH_TOKEN;
if (MISSING_UPSTASH_CONFIG) {
  console.error('❌ Manke UPSTASH_REDIS_REST_URL ak/oswa UPSTASH_REDIS_REST_TOKEN.');
  console.error('   Lokalman: kreye yon fichye .env (gade .env.example).');
  console.error('   Sou Vercel/Render/elt.: mete yo nan Project Settings → Environment Variables.');
}

function uid(prefix) {
  return (prefix || 'id') + '_' + crypto.randomBytes(5).toString('hex');
}

// -------------------- UPSTASH REDIS — HELPER SENP --------------------
async function redisCommand(args) {
  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });
  const data = await res.json();
  if (data.error) throw new Error('Upstash: ' + data.error);
  return data.result;
}
async function redisGet(key) { return redisCommand(['GET', key]); }
async function redisSet(key, value) { return redisCommand(['SET', key, value]); }
async function redisHSet(key, field, value) { return redisCommand(['HSET', key, field, value]); }
async function redisHGet(key, field) { return redisCommand(['HGET', key, field]); }
async function redisHGetAll(key) {
  const result = await redisCommand(['HGETALL', key]);
  const obj = {};
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i += 2) obj[result[i]] = result[i + 1];
  } else if (result && typeof result === 'object') {
    Object.assign(obj, result);
  }
  return obj;
}

const KEYS = {
  users: 'leadstock:users',
  appState: 'leadstock:app_state',
  orders: 'leadstock:orders',
  debtRequests: 'leadstock:debt_requests'
};

function emptyState() {
  return {
    products: [], suppliers: [], customers: [],
    stockIn: [], stockOut: [], invoices: [], returns: [],
    deposits: [], withdrawals: [], loans: [], loanPayments: [],
    inventoryChecks: [], expenses: [], auditLog: [], supplierOrders: [], invoiceCounter: 0,
    settings: { logoDataUrl: null, receiptFormat: 'a4', natcashNumber: '', moncashNumber: '' }
  };
}

async function seedIfEmpty() {
  const usersRaw = await redisGet(KEYS.users);
  if (!usersRaw) {
    const defaultUsers = [
      { id: uid('u'), username: 'admin', password: 'admin123', name: 'Administratè', role: 'admin' },
      { id: uid('u'), username: 'anplwaye', password: 'anplwaye123', name: 'Anplwaye Kès', role: 'anplwaye' }
    ];
    await redisSet(KEYS.users, JSON.stringify(defaultUsers));
    console.log('👤 Itilizatè default kreye sou Upstash: admin/admin123, anplwaye/anplwaye123');
  }
  const stateRaw = await redisGet(KEYS.appState);
  if (!stateRaw) {
    await redisSet(KEYS.appState, JSON.stringify(emptyState()));
  }
}

// -------------------- AUTH HELPERS --------------------
function parseBasicAuth(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return null;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const idx = decoded.indexOf(':');
  if (idx === -1) return null;
  return { username: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
}
async function findUser(username, password) {
  const usersRaw = await redisGet(KEYS.users);
  const users = usersRaw ? JSON.parse(usersRaw) : [];
  return users.find(u => u.username === username && u.password === password);
}
function authMiddleware(req, res, next) {
  const creds = parseBasicAuth(req);
  if (!creds) return res.status(401).json({ error: 'Otantifikasyon obligatwa.' });
  findUser(creds.username, creds.password)
    .then(user => {
      if (!user) return res.status(401).json({ error: 'Non itilizatè oswa modpas pa kòrèk.' });
      req.dbUser = user;
      next();
    })
    .catch(next);
}
// Ti wrapper pou kenbe erè async yo pa kraze sèvè a san repons.
function ah(fn) { return (req, res, next) => fn(req, res, next).catch(next); }

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Blòk anpil ki ba yon mesaj klè olye kraze si Upstash pa konfigire —
// men kite /api/health ak fichye estatik yo pase pou dyagnostik rete posib.
app.use((req, res, next) => {
  if (MISSING_UPSTASH_CONFIG && req.path !== '/api/health' && !req.path.startsWith('/leadstock-erp.html')) {
    return res.status(500).json({
      error: 'Sèvè a pa konfigire kòrèkteman: manke UPSTASH_REDIS_REST_URL/TOKEN nan Environment Variables.'
    });
  }
  next();
});

// -------------------- AUTH ROUTES --------------------
app.post('/api/login', ah(async (req, res) => {
  const { username, password } = req.body || {};
  const user = await findUser(username, password);
  if (!user) return res.status(401).json({ error: 'Non itilizatè oswa modpas pa kòrèk.' });
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
}));

app.post('/api/authorize-admin', authMiddleware, ah(async (req, res) => {
  const { username, password } = req.body || {};
  const admin = await findUser(username, password);
  if (!admin || admin.role !== 'admin') {
    return res.status(401).json({ error: 'Idantifyan Admin pa kòrèk.' });
  }
  res.json({ ok: true, adminName: admin.name });
}));

// -------------------- PIBLIK — Katalòg ak Kòmand Kliyan --------------------
app.get('/api/public/catalog', ah(async (req, res) => {
  const stateRaw = await redisGet(KEYS.appState);
  const data = stateRaw ? JSON.parse(stateRaw) : emptyState();
  const settings = data.settings || {};
  const products = (data.products || []).map(p => ({
    id: p.id, name: p.name, category: p.category, unit: p.unit,
    sellPrice: p.sellPrice, qty: p.qty, photo: p.photo || null
  }));
  res.json({
    products,
    logoDataUrl: settings.logoDataUrl || null,
    natcashNumber: settings.natcashNumber || '',
    moncashNumber: settings.moncashNumber || ''
  });
}));

app.post('/api/public/orders', ah(async (req, res) => {
  const { customerName, customerPhone, items, paymentMethod, reference } = req.body || {};
  if (!customerName || !customerPhone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Enfòmasyon kòmand lan enkonplè.' });
  }
  if (!reference || !reference.trim()) {
    return res.status(400).json({ error: 'Referans tranzaksyon an obligatwa.' });
  }
  const stateRaw = await redisGet(KEYS.appState);
  const data = stateRaw ? JSON.parse(stateRaw) : emptyState();
  const priced = items.map(it => {
    const p = (data.products || []).find(x => x.id === it.productId);
    return { productId: it.productId, name: p ? p.name : '—', qty: Number(it.qty), price: p ? p.sellPrice : 0 };
  });
  const total = priced.reduce((s, it) => s + it.qty * it.price, 0);
  const order = {
    id: uid('ord'), date: new Date().toISOString().slice(0, 10),
    customerName, customerPhone, items: priced, total,
    paymentMethod: paymentMethod || 'natcash', reference: reference.trim(),
    status: 'an_atant', createdAt: new Date().toISOString()
  };
  await redisHSet(KEYS.orders, order.id, JSON.stringify(order));
  res.json({ ok: true, orderId: order.id });
}));

app.get('/api/public/customer-balance', ah(async (req, res) => {
  const phone = (req.query.phone || '').trim();
  if (!phone) return res.status(400).json({ error: 'Antre yon nimewo telefòn.' });
  const stateRaw = await redisGet(KEYS.appState);
  const data = stateRaw ? JSON.parse(stateRaw) : emptyState();
  const norm = p => (p || '').replace(/\D/g, '');
  const customer = (data.customers || []).find(c => norm(c.phone) === norm(phone));
  if (!customer) return res.json({ found: false });
  const loans = (data.loans || []).filter(l => l.customerId === customer.id && l.status !== 'solde')
    .map(l => ({ id: l.id, amount: l.amount, paidAmount: l.paidAmount || 0, rest: l.amount - (l.paidAmount || 0), dueDate: l.dueDate }));
  res.json({
    found: true, name: customer.name, creditBalance: customer.creditBalance || 0,
    loans, totalLoanOutstanding: loans.reduce((s, l) => s + l.rest, 0)
  });
}));

app.post('/api/public/debt-payments', ah(async (req, res) => {
  const { phone, name, amount, reference, paymentMethod } = req.body || {};
  if (!phone || !phone.trim()) return res.status(400).json({ error: 'Nimewo telefòn obligatwa.' });
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Antre yon montan valab.' });
  if (!reference || !reference.trim()) return res.status(400).json({ error: 'Referans tranzaksyon an obligatwa.' });
  const stateRaw = await redisGet(KEYS.appState);
  const data = stateRaw ? JSON.parse(stateRaw) : emptyState();
  const norm = p => (p || '').replace(/\D/g, '');
  const customer = (data.customers || []).find(c => norm(c.phone) === norm(phone));
  if (!customer) return res.status(404).json({ error: 'Nou pa jwenn okenn kont ak nimewo sa a.' });
  const reqObj = {
    id: uid('dbp'), date: new Date().toISOString().slice(0, 10),
    customerPhone: phone.trim(), customerName: name || customer.name, amount: amt,
    reference: reference.trim(), paymentMethod: paymentMethod || '',
    status: 'an_atant', appliedTo: null, rejectReason: null, createdAt: new Date().toISOString()
  };
  await redisHSet(KEYS.debtRequests, reqObj.id, JSON.stringify(reqObj));
  res.json({ ok: true, requestId: reqObj.id });
}));

// -------------------- ADMIN — Kòmand ak Peman Dèt/Prè --------------------
app.get('/api/orders', authMiddleware, ah(async (req, res) => {
  const all = await redisHGetAll(KEYS.orders);
  const orders = Object.values(all).map(v => JSON.parse(v)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.json(orders);
}));

app.put('/api/orders/:id', authMiddleware, ah(async (req, res) => {
  const existingRaw = await redisHGet(KEYS.orders, req.params.id);
  if (!existingRaw) return res.status(404).json({ error: 'Kòmand pa jwenn.' });
  const existing = JSON.parse(existingRaw);
  const updated = { ...existing, ...req.body };
  await redisHSet(KEYS.orders, req.params.id, JSON.stringify(updated));
  res.json({ ok: true });
}));

app.get('/api/debt-payment-requests', authMiddleware, ah(async (req, res) => {
  const all = await redisHGetAll(KEYS.debtRequests);
  const reqs = Object.values(all).map(v => JSON.parse(v)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.json(reqs);
}));

app.put('/api/debt-payment-requests/:id', authMiddleware, ah(async (req, res) => {
  const existingRaw = await redisHGet(KEYS.debtRequests, req.params.id);
  if (!existingRaw) return res.status(404).json({ error: 'Demann pa jwenn.' });
  const existing = JSON.parse(existingRaw);
  const updated = { ...existing, ...req.body };
  await redisHSet(KEYS.debtRequests, req.params.id, JSON.stringify(updated));
  res.json({ ok: true });
}));

// -------------------- DB SYNC (app prensipal la) --------------------
app.get('/api/db', authMiddleware, ah(async (req, res) => {
  const stateRaw = await redisGet(KEYS.appState);
  const data = stateRaw ? JSON.parse(stateRaw) : emptyState();
  const usersRaw = await redisGet(KEYS.users);
  data.users = usersRaw ? JSON.parse(usersRaw) : [];
  res.json(data);
}));

app.put('/api/db', authMiddleware, ah(async (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Kò demann lan envalid.' });
  }
  const users = incoming.users || [];
  const rest = { ...incoming };
  delete rest.users;
  await redisSet(KEYS.users, JSON.stringify(users));
  await redisSet(KEYS.appState, JSON.stringify(rest));
  res.json({ ok: true, savedAt: new Date().toISOString() });
}));

// -------------------- HEALTH --------------------
app.get('/api/health', ah(async (req, res) => {
  const pong = await redisCommand(['PING']);
  res.json({ ok: pong === 'PONG', time: new Date().toISOString(), storage: 'upstash-redis' });
}));

// -------------------- STATIC (paj kliyan mòd ?kliyan=1) --------------------
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- GESTIONÈ ERÈ --------------------
app.use((err, req, res, next) => {
  console.error('Erè sèvè:', err.message);
  res.status(500).json({ error: 'Yon erè rive sou sèvè a. Verifye koneksyon Upstash ou.' });
});

// -------------------- LANSMAN --------------------
// Lokalman (Termux/òdinatè): `node server.js` lanse yon sèvè tradisyonèl.
// Sou Vercel (oswa nenpòt anviwònman "serverless"): fichye a jis ekspòte
// `app` la — platfòm nan rele l dirèkteman kòm yon handler HTTP, san
// bezwen (e san dwa itilize) app.listen() ni process.exit().
if (!MISSING_UPSTASH_CONFIG) {
  seedIfEmpty().catch(err => {
    console.error('❌ Echèk seed done sou Upstash (kontinye kanmenm, chak demann ap eseye ankò):', err.message);
  });
}

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ LeadStock backend (Upstash Redis) ap kouri sou http://0.0.0.0:${PORT}`);
    console.log(`   Done yo sove sou Upstash — pa gen fichye lokal.`);
    if (MISSING_UPSTASH_CONFIG) {
      console.log('⚠️  Sèvè a limen men Upstash pa konfigire — API yo ap reponn ak yon erè klè jiskaske .env korije.');
    }
  });
}

module.exports = app;
