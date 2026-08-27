/**
 * LeadStock ERP — Backend API (Baz Done SQLite via sql.js)
 * ---------------------------------------------------------
 * IMPÒTAN: vèsyon sa a itilize "sql.js" (SQLite konpile an WASM)
 * olye "better-sqlite3". Rezon: sql.js pa mande AUKENN konpilasyon
 * kòd natif (C++) — sa vle di li enstale fasil e fyab menm sou:
 *   - Telefòn Android (Termux)
 *   - Windows san Visual Studio Build Tools
 *   - Nenpòt Mac (Intel oswa Apple Silicon)
 * san okenn erè "node-gyp" oswa "python not found".
 *
 * Done yo toujou sove kòm yon vrè fichye SQLite (data/stockpro.sqlite)
 * — ou ka louvri l ak DB Browser for SQLite menm jan ak anvan.
 *
 * POU LANSE (òdinatè oswa telefòn Android/Termux):
 *   1) cd stockpro-backend
 *   2) npm install
 *   3) node server.js
 *   4) Sèvè a ap kouri sou http://localhost:4000
 * ---------------------------------------------------------
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'stockpro.sqlite');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function uid(prefix) {
  return (prefix || 'id') + '_' + crypto.randomBytes(5).toString('hex');
}

let db; // sql.js Database instance (an memwa, sove sou disk apre chak chanjman)

function persist() {
  const bytes = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(bytes));
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function queryOne(sql, params = []) {
  return queryAll(sql, params)[0];
}
function run(sql, params = []) {
  db.run(sql, params);
}

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    db = new SQL.Database(fs.readFileSync(DB_FILE));
  } else {
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      items TEXT NOT NULL,
      total REAL NOT NULL,
      reference TEXT,
      payment_method TEXT,
      status TEXT NOT NULL,
      reject_reason TEXT,
      invoice_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS debt_payment_requests (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_name TEXT,
      amount REAL NOT NULL,
      reference TEXT,
      payment_method TEXT,
      status TEXT NOT NULL,
      applied_to TEXT,
      reject_reason TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const userCount = queryOne('SELECT COUNT(*) AS n FROM users').n;
  if (userCount === 0) {
    run('INSERT INTO users (id,username,password,name,role) VALUES (?,?,?,?,?)',
      [uid('u'), 'admin', 'admin123', 'Administratè', 'admin']);
    run('INSERT INTO users (id,username,password,name,role) VALUES (?,?,?,?,?)',
      [uid('u'), 'anplwaye', 'anplwaye123', 'Anplwaye Kès', 'anplwaye']);
    console.log('👤 Itilizatè default kreye: admin/admin123, anplwaye/anplwaye123');
  }
  const stateRow = queryOne('SELECT id FROM app_state WHERE id = 1');
  if (!stateRow) {
    const emptyState = {
      products: [], suppliers: [], customers: [],
      stockIn: [], stockOut: [], invoices: [], returns: [],
      deposits: [], withdrawals: [], loans: [], loanPayments: [],
      inventoryChecks: [], expenses: [], auditLog: [], supplierOrders: [], invoiceCounter: 0,
      settings: { logoDataUrl: null, receiptFormat: 'a4', natcashNumber: '', moncashNumber: '' }
    };
    run('INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?)',
      [JSON.stringify(emptyState), new Date().toISOString()]);
  }
  persist();
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
function findUser(username, password) {
  return queryOne('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
}
function authMiddleware(req, res, next) {
  const creds = parseBasicAuth(req);
  if (!creds) return res.status(401).json({ error: 'Otantifikasyon obligatwa.' });
  const user = findUser(creds.username, creds.password);
  if (!user) return res.status(401).json({ error: 'Non itilizatè oswa modpas pa kòrèk.' });
  req.dbUser = user;
  next();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- PUBLIC ROUTES (kliyan — pa mande otantifikasyon) --------------------
// Katalòg piblik: sèlman done ki nesesè pou afiche pwodwi, pa mande login.
app.get('/api/public/catalog', (req, res) => {
  const row = queryOne('SELECT data FROM app_state WHERE id = 1');
  const data = JSON.parse(row.data);
  const products = (data.products || []).map(p => ({
    id: p.id, name: p.name, category: p.category, unit: p.unit,
    sellPrice: p.sellPrice, qty: p.qty, photo: p.photo || null
  }));
  const settings = data.settings || {};
  res.json({
    products,
    natcashNumber: settings.natcashNumber || '',
    moncashNumber: settings.moncashNumber || '',
    logoDataUrl: settings.logoDataUrl || null
  });
});

// Soumèt yon kòmand kliyan — pa mande login. Nou rekalkile total la sèvè-kote
// pou nou pa fè konfyans nan pri ki soti nan navigatè kliyan an.
app.post('/api/public/orders', (req, res) => {
  const { customerName, customerPhone, items, reference, paymentMethod } = req.body || {};
  if (!customerName || !customerPhone) {
    return res.status(400).json({ error: 'Non ak telefòn kliyan an obligatwa.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Panye a vid.' });
  }
  if (!reference || !reference.trim()) {
    return res.status(400).json({ error: 'Referans tranzaksyon an obligatwa.' });
  }
  const row = queryOne('SELECT data FROM app_state WHERE id = 1');
  const data = JSON.parse(row.data);
  const products = data.products || [];
  const resolvedItems = [];
  let total = 0;
  for (const it of items) {
    const p = products.find(x => x.id === it.productId);
    if (!p) return res.status(400).json({ error: 'Yon pwodwi nan panye a pa egziste ankò.' });
    const qty = Number(it.qty || 0);
    if (qty <= 0) continue;
    if (qty > p.qty) {
      return res.status(400).json({ error: `Kantite "${p.name}" mande a depase sa ki disponib.` });
    }
    resolvedItems.push({ productId: p.id, name: p.name, qty, price: p.sellPrice });
    total += qty * p.sellPrice;
  }
  if (resolvedItems.length === 0) {
    return res.status(400).json({ error: 'Panye a vid.' });
  }
  const id = uid('ord');
  const now = new Date().toISOString();
  run(`INSERT INTO orders (id,date,customer_name,customer_phone,items,total,reference,payment_method,status,reject_reason,invoice_id,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, now.slice(0, 10), customerName.trim(), customerPhone.trim(), JSON.stringify(resolvedItems),
     total, reference.trim(), paymentMethod || '', 'an_atant', null, null, now]);
  persist();
  res.json({ ok: true, orderId: id, total });
});

// Chèche balans yon kliyan pa telefòn — pa mande login. Sèlman done ki
// nesesè pou kliyan an konnen konbyen li dwe.
app.get('/api/public/customer-balance', (req, res) => {
  const phone = (req.query.phone || '').trim();
  if (!phone) return res.status(400).json({ error: 'Antre yon nimewo telefòn.' });
  const row = queryOne('SELECT data FROM app_state WHERE id = 1');
  const data = JSON.parse(row.data);
  const customer = (data.customers || []).find(c => (c.phone || '').replace(/\D/g, '') === phone.replace(/\D/g, ''));
  if (!customer) return res.json({ found: false });
  const loans = (data.loans || []).filter(l => l.customerId === customer.id && l.status !== 'solde')
    .map(l => ({ id: l.id, amount: l.amount, paidAmount: l.paidAmount || 0, rest: l.amount - (l.paidAmount || 0), dueDate: l.dueDate }));
  res.json({
    found: true,
    name: customer.name,
    creditBalance: customer.creditBalance || 0,
    loans,
    totalLoanOutstanding: loans.reduce((s, l) => s + l.rest, 0)
  });
});

// Soumèt yon demann peman dèt/prè — pa mande login.
app.post('/api/public/debt-payments', (req, res) => {
  const { phone, name, amount, reference, paymentMethod } = req.body || {};
  if (!phone || !phone.trim()) return res.status(400).json({ error: 'Nimewo telefòn obligatwa.' });
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Antre yon montan valab.' });
  if (!reference || !reference.trim()) return res.status(400).json({ error: 'Referans tranzaksyon an obligatwa.' });
  const row = queryOne('SELECT data FROM app_state WHERE id = 1');
  const data = JSON.parse(row.data);
  const customer = (data.customers || []).find(c => (c.phone || '').replace(/\D/g, '') === phone.replace(/\D/g, ''));
  if (!customer) return res.status(404).json({ error: 'Nou pa jwenn okenn kont ak nimewo sa a.' });
  const id = uid('dbp');
  const now = new Date().toISOString();
  run(`INSERT INTO debt_payment_requests (id,date,customer_phone,customer_name,amount,reference,payment_method,status,applied_to,reject_reason,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, now.slice(0, 10), phone.trim(), name || customer.name, amt, reference.trim(), paymentMethod || '', 'an_atant', null, null, now]);
  persist();
  res.json({ ok: true, requestId: id });
});

// -------------------- DEBT PAYMENT REQUESTS — jesyon Admin --------------------
app.get('/api/debt-payment-requests', authMiddleware, (req, res) => {
  const rows = queryAll('SELECT * FROM debt_payment_requests ORDER BY created_at DESC');
  res.json(rows.map(r => ({
    id: r.id, date: r.date, customerPhone: r.customer_phone, customerName: r.customer_name,
    amount: r.amount, reference: r.reference, paymentMethod: r.payment_method,
    status: r.status, appliedTo: r.applied_to, rejectReason: r.reject_reason, createdAt: r.created_at
  })));
});

app.put('/api/debt-payment-requests/:id', authMiddleware, (req, res) => {
  const { status, appliedTo, rejectReason } = req.body || {};
  const existing = queryOne('SELECT id FROM debt_payment_requests WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Demann pa jwenn.' });
  run('UPDATE debt_payment_requests SET status=?, applied_to=?, reject_reason=? WHERE id=?',
    [status, appliedTo || null, rejectReason || null, req.params.id]);
  persist();
  res.json({ ok: true });
});

// -------------------- ORDERS — jesyon Admin (mande otantifikasyon) --------------------
app.get('/api/orders', authMiddleware, (req, res) => {
  const rows = queryAll('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(rows.map(r => ({
    id: r.id, date: r.date, customerName: r.customer_name, customerPhone: r.customer_phone,
    items: JSON.parse(r.items), total: r.total, reference: r.reference,
    paymentMethod: r.payment_method, status: r.status, rejectReason: r.reject_reason,
    invoiceId: r.invoice_id, createdAt: r.created_at
  })));
});

app.put('/api/orders/:id', authMiddleware, (req, res) => {
  const { status, rejectReason, invoiceId } = req.body || {};
  const existing = queryOne('SELECT id FROM orders WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Kòmand pa jwenn.' });
  run('UPDATE orders SET status=?, reject_reason=?, invoice_id=? WHERE id=?',
    [status, rejectReason || null, invoiceId || null, req.params.id]);
  persist();
  res.json({ ok: true });
});

// -------------------- AUTH ROUTES --------------------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = findUser(username, password);
  if (!user) return res.status(401).json({ error: 'Non itilizatè oswa modpas pa kòrèk.' });
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
});

app.post('/api/authorize-admin', authMiddleware, (req, res) => {
  const { username, password } = req.body || {};
  const admin = findUser(username, password);
  if (!admin || admin.role !== 'admin') {
    return res.status(401).json({ error: 'Idantifyan Admin pa kòrèk.' });
  }
  res.json({ ok: true, adminName: admin.name });
});

// -------------------- DB SYNC (users = tab SQL, rès = blob JSON) --------------------
app.get('/api/db', authMiddleware, (req, res) => {
  const row = queryOne('SELECT data FROM app_state WHERE id = 1');
  const data = JSON.parse(row.data);
  data.users = queryAll('SELECT id, username, password, name, role FROM users');
  res.json(data);
});

app.put('/api/db', authMiddleware, (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Kò demann lan envalid.' });
  }
  try {
    const incomingUsers = incoming.users || [];
    const existingIds = queryAll('SELECT id FROM users').map(u => u.id);
    const incomingIds = new Set(incomingUsers.map(u => u.id));

    incomingUsers.forEach(u => {
      const exists = queryOne('SELECT id FROM users WHERE id = ?', [u.id]);
      if (exists) {
        run('UPDATE users SET username=?, password=?, name=?, role=? WHERE id=?',
          [u.username, u.password, u.name, u.role, u.id]);
      } else {
        run('INSERT INTO users (id,username,password,name,role) VALUES (?,?,?,?,?)',
          [u.id, u.username, u.password, u.name, u.role]);
      }
    });
    existingIds.forEach(id => {
      if (!incomingIds.has(id)) run('DELETE FROM users WHERE id = ?', [id]);
    });

    const rest = { ...incoming };
    delete rest.users;
    const now = new Date().toISOString();
    const stateExists = queryOne('SELECT id FROM app_state WHERE id = 1');
    if (stateExists) {
      run('UPDATE app_state SET data=?, updated_at=? WHERE id=1', [JSON.stringify(rest), now]);
    } else {
      run('INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?)', [JSON.stringify(rest), now]);
    }
    persist();
  } catch (e) {
    console.error('Erè pandan sovgad SQLite:', e);
    return res.status(500).json({ error: 'Echèk sovgad sou baz done a.' });
  }
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

// -------------------- HEALTH --------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), db: DB_FILE });
});

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ LeadStock backend (SQLite/sql.js) ap kouri sou http://0.0.0.0:${PORT}`);
    console.log(`   Baz done a: ${DB_FILE}`);
  });
}).catch(err => {
  console.error('❌ Echèk inisyalizasyon baz done a:', err);
  process.exit(1);
});
