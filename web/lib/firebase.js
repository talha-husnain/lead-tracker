"use client";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export function firebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function isCloudConfigured() {
  const c = firebaseConfig();
  return !!(c.apiKey && c.projectId && !/PASTE|YOUR_|xxxx/i.test(String(c.apiKey)));
}

let _fb = null;
export function getFb() {
  if (!isCloudConfigured()) return null;
  if (!_fb) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig());
    _fb = { app, auth: getAuth(app), db: getFirestore(app) };
  }
  return _fb;
}

export function authErrorMessage(err) {
  const map = {
    "auth/invalid-email": "That email looks invalid.",
    "auth/user-not-found": "No account with that email.",
    "auth/wrong-password": "Wrong password.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/email-already-in-use": "An account with that email already exists.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/network-request-failed": "Network error — check your connection.",
    "auth/too-many-requests": "Too many attempts — please try again later.",
  };
  return map[err?.code] || err?.message || "Something went wrong.";
}
