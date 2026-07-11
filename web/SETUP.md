# Lead Tracker (Next.js + shadcn/ui + Firebase) — setup & deploy

This is the modern rebuild: a real web app with **login** and a **permanent cloud
database** that syncs across all your tabs and devices in real time. Frontend is
Next.js + Tailwind + shadcn-style UI; auth + data are Firebase (Auth + Firestore).

> Runs **without** any setup in **local mode** (data saved in the browser only).
> Do the two steps below to turn on login + cloud sync.

---

## Step 1 — Create a Firebase project (free, ~5 min)

1. Go to **https://console.firebase.google.com** → **Add project** (any name, e.g.
   `lead-tracker`). You can disable Google Analytics.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
3. **Build → Firestore Database → Create database → Production mode → (pick a location) → Enable.**
4. In Firestore, open the **Rules** tab, replace everything with the contents of
   [`firestore.rules`](firestore.rules), and click **Publish**. (This makes each
   user's data private to them.)
5. Project **Settings (gear) → Your apps → Web (`</>`)** → register an app (any
   nickname) → copy the **firebaseConfig** values (apiKey, authDomain, etc.).

## Step 2 — Deploy to Vercel (free, ~3 min)

1. Push this repo to GitHub (already set up — the app lives in the `web/` folder).
2. Go to **https://vercel.com/new**, **Import** the `lead-tracker` repo.
3. Set **Root Directory** to **`web`**.
4. Expand **Environment Variables** and add these six (from your firebaseConfig):

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | apiKey |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | authDomain |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | projectId |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | storageBucket |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | appId |

5. Click **Deploy**. You'll get a live URL like `https://lead-tracker-xxx.vercel.app`.
6. Back in Firebase → **Authentication → Settings → Authorized domains → Add domain**,
   add your `*.vercel.app` domain so login works there.

Open the URL, click **Create an account**, and you're in — your leads now sync
everywhere you log in.

---

## Run locally (optional)

```bash
cd web
# one-time: copy env and fill in your Firebase values (or leave blank for local mode)
cp .env.local.example .env.local
# install + run  (pnpm recommended on Windows)
pnpm install
pnpm dev        # http://localhost:3000
```

## How the data works
- **Signed in (cloud):** your whole workspace is one document at
  `users/{your-uid}` in Firestore, streamed live via `onSnapshot` — change it in one
  tab and every other tab/device updates instantly.
- **Local mode (no Firebase):** saved in this browser's `localStorage`.
