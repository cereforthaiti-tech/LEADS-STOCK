# LeadStock Backend — ak Baz Done SQLite (ka kouri sou Telefòn)

Sèvè API ki ranplase localStorage navigatè a ak yon **vrè baz done
SQLite** (fichye `data/stockpro.sqlite`), ki itilize **sql.js** —
yon vèsyon SQLite ki konpile an WebAssembly. Rezon nou chwazi sa a:
li pa mande okenn konpilasyon kòd natif (C++), donk li enstale fasil
e fyab sou Windows, Mac, Linux, **e sou telefòn Android (Termux)**.

---

## 📱 OPSYON 1 — Fè yon Telefòn Android Sèvi kòm Sèvè (Termux)

> ⚠️ **iPhone pa ka fè sa fasil** — iOS pa gen yon vrè tèminal ki ka
> kouri Node.js kòrèkteman an background. Si w gen yon iPhone, pi bon
> opsyon se lanse sèvè a sou yon òdinatè, oswa sou yon Android ki
> disponib.

### Etap yo:

1. **Enstale Termux** — telechaje l sou **F-Droid** (pa Google Play,
   vèsyon Play Store la demode e li pa mache byen ankò):
   `https://f-droid.org/packages/com.termux/`

2. Louvri Termux, kouri:
   ```bash
   pkg update && pkg upgrade -y
   pkg install nodejs unzip -y
   ```

3. Transfere `stockpro-backend.zip` sou telefòn nan (via Bluetooth,
   USB, WhatsApp Web, Google Drive, elt.), epi bay Termux aksè nan
   memwa telefòn nan:
   ```bash
   termux-setup-storage
   ```
   (Aksepte pèmisyon an lè telefòn nan mande l)

4. Ale nan katab kote fichye zip la ye (souvan `Download`) epi dekonprese l:
   ```bash
   cd storage/downloads
   unzip stockpro-backend.zip -d stockpro-backend
   cd stockpro-backend
   ```

5. Enstale ak lanse:
   ```bash
   npm install
   node server.js
   ```
   Ou dwe wè: `✅ LeadStock backend (SQLite/sql.js) ap kouri sou http://0.0.0.0:4000`

6. **Kenbe Termux ap kouri san koupe:**
   ```bash
   termux-wake-lock
   ```
   Epi nan Paramèt Android (Settings) → Aplikasyon → Termux →
   Batri → dezaktive "Optimizasyon Batri" pou Termux, sinon Android
   ka touye l apre kèk minit.

7. **Jwenn adrès IP telefòn nan** sou menm rezo Wi-Fi a:
   ```bash
   ifconfig
   ```
   (Chèche liy ki kòmanse ak `wlan0`, nimewo apre `inet` la, egzanp
   `192.168.1.42`). Oswa gade nan Paramèt Wi-Fi telefòn nan → non
   rezo a konekte a → Detay/IP Address.

8. Sou nenpòt aparèy sou **menm Wi-Fi a** (òdinatè, lòt telefòn),
   louvri `stockpro-erp.html`, ale nan **"Sèvè / Backend"**, antre:
   ```
   http://192.168.1.42:4000
   ```
   (ranplase ak vrè IP telefòn ki sèvi kòm sèvè a)

> 💡 **Konsèy:** Telefòn ki sèvi kòm sèvè a dwe **rete limen, sou
> Wi-Fi, ak Termux louvri** pandan tout lè w ap itilize app la. Pi
> bon si se yon telefòn ki rete sou chaj tout tan (pa telefòn
> pèsonèl yon moun k ap deplase).

---

## 💻 OPSYON 2 — Lanse Sèvè a sou yon Òdinatè (pi senp/fyab)

1. Ou bezwen **Node.js** enstale (nodejs.org)
2. Nan katab `stockpro-backend`:
   ```bash
   npm install
   node server.js
   ```
3. Sèvè a kouri sou `http://localhost:4000`
4. Nan `stockpro-erp.html` → "Sèvè / Backend" → antre `http://localhost:4000`

---

## 🔌 Apre Sèvè a ap Kouri (nenpòt opsyon)

1. Louvri `stockpro-erp.html`
2. Konekte lokalman dabò (`admin` / `admin123`)
3. Ale nan **"Sèvè / Backend"** → antre lyen sèvè a → "Konekte/Teste"
4. Dekonekte epi rekonekte pou senkronize

## 🗄️ Estrikti Baz Done a

| Tab SQL | Kontni |
|---|---|
| `users` | Itilizatè, non itilizatè, modpas, wòl |
| `app_state` | Rès done biznis yo (pwodwi, kliyan, faktè, depo, prè, elt.) kòm yon blòk JSON |
| `orders` | Kòmand kliyan ki soti nan katalòg piblik la — tab APA, pa touche pa senkwonizasyon `app_state` la |

Fichye `data/stockpro.sqlite` a se yon vrè fichye SQLite — ou ka
louvri l ak DB Browser for SQLite pou enspekte done yo dirèkteman.

## 🛍️ Katalòg Kliyan (Faz 2 — kounye a anndan `leadstock-erp.html`)

Pa gen fichye separe pou kliyan yo ankò. Menm `leadstock-erp.html` la
gen yon **mòd Kliyan** entegre, aksesib san login lè w ajoute
`?kliyan=1` nan lyen an. Sèvè a mete `leadstock-erp.html` nan katab
`public/` pou l ka sèvi l dirèkteman sou entènèt (menm jan ak lyen
API piblik yo), donk lyen kliyan an vin:

```
http://localhost:4000/leadstock-erp.html?kliyan=1
```

Si w ap itilize ngrok, lyen sa a vin:
```
https://[non-ou].ngrok-free.app/leadstock-erp.html?kliyan=1
```

**Voye lyen sa a bay kliyan yo** (WhatsApp, Facebook, elt.) — yo wè
sèlman katalòg/panye/dèt la, pa okenn nan modil Admin yo. Lyen SAN
`?kliyan=1` la kontinye montre ekran koneksyon nòmal la pou Admin/
Anplwaye.

Kòmand yo rive nan onglè **"Kòmand An Atant"** nan `leadstock-erp.html`
(bò Admin/Anplwaye, konekte nòmalman san paramèt `?kliyan=1`), kote w
tcheke si peman an rive nan app NatCash/MonCash biznis la, epi klike
**Valide** (desann estòk, kreye yon faktè, voye resi WhatsApp) oswa
**Rejte**.

> ⚠️ Antre nimewo NatCash/MonCash ou nan "Sovgad → Peman Mobil" nan
> `leadstock-erp.html` anvan kliyan yo ka wè yo sou katalòg la.
>
> ⚠️ Mòd Kliyan an (`?kliyan=1`) SÈLMAN mache lè fichye a louvri via
> lyen sèvè a (`http://...:4000/leadstock-erp.html?kliyan=1`), pa lè
> w louvri fichye a dirèkteman sou òdinatè/telefòn ou (`file://...`).
> Si w modifye `leadstock-erp.html` pita, sonje kopye nouvo vèsyon an
> tou nan `stockpro-backend/public/leadstock-erp.html` pou lyen
> kliyan an rete ajou.
>
> ⚠️ Onglè "Kòmand An Atant" mande yon sèvè konekte — li pa mache si w
> ap itilize app la sèlman an lokal (localStorage) san backend.

## 💳 Peye Dèt/Prè An Liy (Faz 2)

Nan mòd Kliyan an (`?kliyan=1`), gen yon dezyèm onglè bò kot
"Katalòg": **"Peye Dèt/Prè"**. Yon kliyan ka:

1. Antre nimewo telefòn li → sistèm nan montre balans li (Dèt sou Kont
   + Prè ki rete, pou chak prè aktif)
2. Voye lajan an sou NatCash/MonCash biznis la
3. Antre montan an ak referans tranzaksyon an → soumèt

Demann yo rive nan onglè **"Kòmand An Atant" → "💳 Peman Dèt/Prè"**
(bò Admin/Anplwaye) kote w tcheke peman an nan app mobil ou, epi klike
**Valide**. Si kliyan an gen plizyè prè aktif oswa dèt jeneral, sistèm
nan mande ou chwazi ki sou li peman an aplike anvan l konfime — balans
kliyan an mete ajou otomatikman, e yon resi WhatsApp voye.

## 📦 Kòmand Founisè (Faz 2)

Onglè **"Kòmand Founisè"** (Admin sèlman, nan gwoup "Finans Biznis")
pèmèt ou:

1. Kreye yon bon kòmand pou yon founisè ki deja nan "Anyè → Founisè" —
   ajoute plizyè pwodwi ak kantite/pri inite
2. Klike **"Make Voye"** lè w fin voye lajan an bay founisè a (via
   NatCash, MonCash, kach, oswa vireman) — antre referans tranzaksyon
   an si genyen
3. Lè machandiz la rive, klike **"Resevwa"** — sa louvri yon fòm ki
   mande **Adrès Livrezon, Chofè, Imatrikilasyon, NIF, Verifikatè, ak
   Kantite pa Ranje pou chak pwodwi**. Apre konfimasyon: estòk la
   **ogmante otomatikman**, yon antre kreye nan "Antre Estòk", epi yon
   **rezime PDF + mesaj WhatsApp voye bay founisè a** (si li gen yon
   nimewo telefòn nan fich li) pou konfime resepsyon an ak tout detay
   sa yo.

Kòmand founisè yo sove nan menm blòk `app_state` ak rès done biznis
yo (pa nan tab SQL apa a, kontrèman ak kòmand kliyan yo), donk yo
senkwonize otomatikman chak fwa `leadstock-erp.html` konekte sou sèvè
a — pa gen okenn etap ekstra pou fè yo mache.

## 🧾 Faktirasyon — Nimewo Otomatik, Kòmantè, Enpresyon

Chak faktè kounye a gen yon **nimewo otomatik** (`FAC-000001`,
`FAC-000002`, elt.), yon chan **Kòmantè** opsyonèl, ak yon bouton
**🖨️ Enprime** nan istorik faktè yo ki louvri rezi a nan yon nouvo
onglè epi deklanche bwat dyalòg enpresyon navigatè a otomatikman.

## 📤 Sòti Estòk — Retire

Modil "Sòti Estòk" (antre manyèl pou pèt/domaj/transfè) retire nan
app la. **Sèl fason pou retire estòk kounye a se atravè yon Faktè**
(Faktirasyon) — chak vant soustrè kantite otomatikman e kreye yon
antre nan istorik pou rapò yo rete kòrèk.

## 🗂️ Envantè — Enprime oswa PDF

Nan "Envantè", de nouvo bouton disponib: **🖨️ Enprime** (louvri bwat
dyalòg enpresyon navigatè a) ak **⬇ PDF** (telechaje yon fichye PDF
ak lis pwodwi yo, kolòn vid pou konte manyèlman epi konpare).

## ⚠️ Enpòtan — deplwaman reyèl sou entènèt

Sèvè sa a fèt pou itilizasyon lokal/entèn sou menm rezo Wi-Fi a. Si
w vle mete l sou entènèt piblik (aksesib kèlkeswa kote w ye):
- Ajoute HTTPS (sètifika SSL)
- Ranplase modpas an tèks klè yo ak yon sistèm hash (bcrypt)
- Ajoute limit sou kantite tantativ koneksyon (rate limiting)
- Konsidere yon sèvis ostaj ki toujou ap kouri (Render, Railway) olye
  yon telefòn, ki ka pèdi Wi-Fi oswa batri

