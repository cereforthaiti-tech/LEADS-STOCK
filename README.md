# LeadStock Backend — Baz Done sou Upstash Redis (Cloud, Toujou Disponib)

Sèvè API pou LeadStock ERP. **Depi vèsyon sa a, done yo pa sove sou
disk machin ki fè sèvè a kouri ankò.** Yo sove sou **Upstash Redis** —
yon baz done Redis ki viv sou entènèt, toujou aktif, gratis pou itilizasyon
yon ti/mwayen biznis.

## 🌍 Sa sa vle di pou ou

Avan: si w te lanse sèvè a sou telefòn ou, done yo te "kole" sou telefòn
sa a. Si w te chanje aparèy, ou pa t wè menm done yo.

Kounye a: done yo **pa gen anyen pou wè ak aparèy ki fè kòd la kouri**.
Lanse `node server.js` sou òdinatè ou jodi a, sou telefòn ou demen, oswa
sou yon sèvis ostaj pita — toutotan fichye `.env` la gen **menm de valè**
(`UPSTASH_REDIS_REST_URL` ak `UPSTASH_REDIS_REST_TOKEN`), w ap toujou wè
**egzakteman menm done yo**.

## 📋 Enstalasyon (yon sèl fwa)

### Etap 1 — Kreye yon Baz Done Upstash (gratis)

1. Ale sou **https://upstash.com** epi kreye yon kont gratis
2. Klike "Create Database", chwazi Redis, chwazi yon rejyon ki pi pre w
3. Nan paj database la, jwenn seksyon **"REST API"** — kopye:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Etap 2 — Konfigire Backend la

1. Nan katab `stockpro-backend`, fè yon kopi `.env.example` epi rele l `.env`
2. Louvri `.env` epi kole de valè ou kopye yo:
   ```
   UPSTASH_REDIS_REST_URL=https://xxxxx-xxxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AxxxXXXXxxxxXXXXxxxxXXXX
   ```
3. Enstale ak lanse:
   ```bash
   npm install
   node server.js
   ```
4. Ou dwe wè: `✅ LeadStock backend (Upstash Redis) ap kouri sou http://0.0.0.0:4000`

> ⚠️ **JANM voye fichye `.env` la bay pèsonn, JANM mete l sou yon depo
> Git piblik.** Nenpòt moun ki gen token sa a gen aksè TOTAL — li, ekri,
> efase — sou tout done biznis ou, san menm bezwen modpas app la.

## 📱 Lanse sou Telefòn (Termux) — menm etap yo

Sekans Termux la rete menm jan ak anvan (`pkg install nodejs unzip -y`,
dekonprese, `npm install`, `node server.js`) — sèl diferans lan se `.env`
la ranplase bezwen konfigire yon fichye baz done lokal. Pa gen `data/`
folder pou konsève ankò.

> ⚠️ Backend la mande **Node.js 18 oswa pi wo** (pou `fetch` entegre
> san bibliyotèk siplemantè). Verifye ak `node --version` — si Termux
> ba w yon vèsyon pi ansyen, kouri `pkg upgrade nodejs` anvan.

## 💻 Lanse sou Òdinatè oswa yon Sèvis Ostaj

Menm 2 kòmand yo (`npm install` epi `node server.js`) mache idantik sou
Windows, Mac, Linux, oswa yon sèvis ostaj cloud (Render, Railway, Fly,
elt.) — paske pa gen okenn fichye lokal pou konsève ant yo. Si w vle yon
sèvè ki **toujou** aktif san w pa bezwen kite yon aparèy pèsonèl ap kouri
tout tan, se la yon sèvis ostaj cloud ta pi bon pase telefòn/òdinatè ou.

## ☁️ Depwaye sou Vercel (rekòmande — gratis, toujou aktif)

Backend sa a fèt pou l mache tou sou **Vercel**, ki bay yon lyen
`https://...vercel.app` **toujou aktif**, san w pa bezwen Termux, ngrok,
ni kite yon aparèy limen. Se pwobableman pi bon opsyon si w vle yon
lyen fiks ou pa oblije rekonfigire chak fwa.

### Etap yo

1. Mete tout dosye `stockpro-backend` la (san `.env` la — li deja
   eskli otomatikman pa `.gitignore`) sou yon repo GitHub
2. Ale sou **vercel.com**, konekte kont GitHub ou, klike "Add New →
   Project", chwazi repo a
3. **Anvan w klike "Deploy"**, ale nan **"Environment Variables"** epi
   ajoute:
   ```
   UPSTASH_REDIS_REST_URL = https://xxxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN = AxxxXXXXxxxxXXXXxxxxXXXX
   ```
   (menm 2 valè ki nan `.env` ou a — kopye yo soti nan dashboard Upstash ou)
4. Klike "Deploy"
5. Lyen final ou a ap gen fòm `https://non-pwojè-ou.vercel.app`

### Itilize l

- **Sèvè / Backend** nan `leadstock-erp.html`: `https://non-pwojè-ou.vercel.app`
- **Lyen kliyan**: `https://non-pwojè-ou.vercel.app/leadstock-erp.html?kliyan=1`

> ⚠️ **Si w wè yon erè "FUNCTION_INVOCATION_FAILED" oswa "500:
> INTERNAL_SERVER_ERROR"**, se prèske toujou paske Environment
> Variables yo (`UPSTASH_REDIS_REST_URL`/`TOKEN`) pa konfigire nan
> Vercel — ale nan **Project Settings → Environment Variables**,
> verifye yo la e byen ekri (san espas anplis), epi fè yon **Redeploy**
> (nan onglè "Deployments", "..." bò dènye deplwaman an → Redeploy).

## 🔌 Konekte App la ak Backend la

1. Louvri `leadstock-erp.html`
2. Konekte lokalman dabò (`admin` / `admin123`)
3. Ale nan **"Sèvè / Backend"** → antre lyen sèvè a (`http://localhost:4000`
   oswa lyen piblik ou a) → "Konekte/Teste"
4. Dekonekte epi rekonekte pou senkwonize

## 📅 Dat Ekspirasyon pa Kategori

"Antre Estòk" kounye a gen yon chan **Dat Ekspirasyon** opsyonèl pou
chak resepsyon. Nan **Rapò → Rapò Dat Ekspirasyon pa Kategori**, ou
wè tout pwodwi ki gen yon dat ekspirasyon anrejistre, gwoupe pa
kategori pwodwi, ak jou ki rete anvan chak ekspire (make an wouj si
30 jou oswa mwens). Ekspòtab an Excel oswa PDF.

## 🛍️ Mòd Kliyan (Katalòg, Kòmand, Peye Dèt/Prè)

Menm `leadstock-erp.html` la gen yon mòd Kliyan entegre, aksesib san
login lè w ajoute `?kliyan=1` nan lyen an:
```
http://localhost:4000/leadstock-erp.html?kliyan=1
```
Backend la sèvi fichye a dirèkteman (li nan katab `public/`). Si w
modifye `leadstock-erp.html` pita, sonje kopye nouvo vèsyon an tou nan
`stockpro-backend/public/leadstock-erp.html`.

## 🗄️ Estrikti Done sou Upstash

| Kle Redis | Kontni |
|---|---|
| `leadstock:users` | Lis itilizatè yo (JSON) |
| `leadstock:app_state` | Rès done biznis yo — pwodwi, kliyan, faktè, depo, prè, elt. (JSON) |
| `leadstock:orders` | Kòmand kliyan ki soti nan mòd Kliyan an (Redis Hash, yon antre pa kòmand) |
| `leadstock:debt_requests` | Demann peman dèt/prè an liy (Redis Hash) |

Ou ka enspekte done yo dirèkteman sou tablo bò (dashboard) Upstash ou a,
nan seksyon "Data Browser".

## 💰 Nivo Gratis Upstash

Upstash gen yon nivo gratis ki sifi pou yon ti/mwayen biznis, men limit
yo (kantite kòmand pa jou, espas depo) ka chanje. Verifye limit aktyèl
yo sou **upstash.com/pricing** anvan w konte sou li pou yon gwo volim
tranzaksyon chak jou.

## ⚠️ Enpòtan — deplwaman reyèl sou entènèt

- Backend sa a fèt pou itilizasyon lokal/entèn oswa sou yon sèvis ostaj
  senp. Si w vle mete l sou entènèt piblik pou tout moun rive sou li:
  - Ajoute HTTPS (sètifika SSL) — pifò sèvis ostaj bay sa gratis
  - Ranplase modpas an tèks klè yo ak yon sistèm hash (bcrypt)
  - Ajoute limit sou kantite tantativ koneksyon (rate limiting)
- Sonje: sekirite app la depann de kenbe `.env` la sekrè. Si l pèdi/vole,
  chanje token Upstash ou a imedyatman nan dashboard Upstash la.
