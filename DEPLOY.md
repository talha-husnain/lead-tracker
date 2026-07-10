# 🚀 Put Lead Tracker online (free)

Everything is ready. Pick **one** route. All three are free and give you a public
link that works on any device.

> Reminder: leads are stored in the browser, so an online copy starts **empty** on
> each device. To carry your data over, use **Data ▾ → Download backup** on the app
> that has your leads, then **Restore from backup** on the online one.

---

## ⚡ Fastest — Vercel (recommended, ~1 minute, no terminal)

1. Go to **https://vercel.com** and sign up (click **Continue with GitHub**, or use email).
2. Click **Add New… → Project**.
3. Choose **Deploy** / **Import** and, when asked, **drag this whole folder**
   (`Lead-tracker`) into the upload area — or connect the GitHub repo from the
   option below.
4. Leave all settings default (it's a static site) → **Deploy**.
5. You get a link like `https://lead-tracker-xxxx.vercel.app`. Done.

*(Netlify is just as easy: go to **https://app.netlify.com/drop** and drag the
`Lead-tracker` folder onto the page — you get a live link instantly.)*

---

## 🐙 GitHub Pages via GitHub Actions (permanent, matches "GitHub Actions page")

This repo already contains the workflow at `.github/workflows/deploy.yml`, so once
the code is on GitHub it deploys automatically.

### Option A — no terminal (all in the browser)
1. Create a free account at **https://github.com** and click **New repository**.
   Name it `lead-tracker`, keep it **Public**, click **Create repository**.
2. On the new repo page, click **uploading an existing file**.
3. Select **all files** from `d:\bd\Lead-tracker` (including `index.html`,
   `app.js`, `styles.css`) and drop them in → **Commit changes**.
4. Go to **Settings → Pages → Build and deployment → Source** and choose
   **GitHub Actions** (or *Deploy from a branch → main → /root*).
5. Wait ~1 minute. Your site is live at
   `https://YOUR-USERNAME.github.io/lead-tracker/`.

### Option B — terminal (if you have Git + the GitHub CLI)
```bash
cd d:/bd/Lead-tracker
gh auth login                 # one-time browser login
gh repo create lead-tracker --public --source=. --push
```
Then in the repo: **Settings → Pages → Source → GitHub Actions**. Live in ~1 min.

---

## Updating the site later
- **Vercel / Netlify:** re-import or drag the folder again (or connect the GitHub
  repo once and it redeploys on every push).
- **GitHub Pages:** upload the changed files (web) or `git add . && git commit -m
  "update" && git push` (terminal). The Action redeploys automatically.
