"use client";
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as fbSignOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence,
} from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getFb, isCloudConfigured } from "./firebase";
import { freshDB, normalizeDB } from "./constants";

const StoreContext = createContext(null);
const LOCAL_KEY = "lt.db.v2";

function cleanForCloud(obj) {
  return JSON.parse(JSON.stringify(obj)); // strips undefined, converts to plain objects
}

export function StoreProvider({ children }) {
  const cloud = isCloudConfigured();
  const [mode] = useState(cloud ? "cloud" : "local");
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [theme, setThemeState] = useState("light");

  const docRef = useRef(null);
  const docUnsub = useRef(null);
  const saveTimer = useRef(null);

  // ---- theme ----
  const applyTheme = useCallback((t) => {
    const resolved = t || (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", resolved === "dark");
    }
    setThemeState(resolved);
  }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lt-theme") : null;
    applyTheme(saved);
  }, [applyTheme]);

  // ---- persistence ----
  const persist = useCallback((next) => {
    if (mode === "cloud" && docRef.current) {
      clearTimeout(saveTimer.current);
      const ref = docRef.current;
      saveTimer.current = setTimeout(() => {
        setDoc(ref, cleanForCloud(next)).catch((e) => console.error("save failed", e));
      }, 600);
    } else {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
    }
  }, [mode]);

  const update = useCallback((mutator) => {
    setDb((prev) => {
      const next = structuredClone(prev);
      mutator(next);
      persist(next);
      return next;
    });
  }, [persist]);

  const setTheme = useCallback((t) => {
    try { localStorage.setItem("lt-theme", t); } catch (e) {}
    applyTheme(t);
    update((d) => { d.settings.theme = t; });
  }, [applyTheme, update]);

  // ---- boot ----
  useEffect(() => {
    if (mode === "local") {
      let data;
      try { data = JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch (e) { data = null; }
      const dbData = data && Array.isArray(data.leads) ? normalizeDB(data) : freshDB();
      setDb(dbData);
      setUser({ uid: "local", email: "Local mode", local: true });
      if (dbData.settings.theme) applyTheme(dbData.settings.theme);
      setReady(true);
      return;
    }
    // cloud
    const fb = getFb();
    if (!fb) { setReady(true); return; }
    try { setPersistence(fb.auth, browserLocalPersistence); } catch (e) {}
    const unsubAuth = onAuthStateChanged(fb.auth, (u) => {
      setUser(u);
      if (docUnsub.current) { docUnsub.current(); docUnsub.current = null; }
      if (!u) { setDb(null); setReady(true); return; }
      const ref = doc(fb.db, "users", u.uid);
      docRef.current = ref;
      docUnsub.current = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = normalizeDB(snap.data());
          setDb(data);
          if (data.settings.theme) applyTheme(data.settings.theme);
        } else {
          const seed = freshDB();
          setDb(seed);
          setDoc(ref, cleanForCloud(seed)).catch((e) => console.error(e));
        }
        setReady(true);
      }, (err) => { console.error("snapshot error", err); setReady(true); });
    });
    return () => { unsubAuth(); if (docUnsub.current) { docUnsub.current(); docUnsub.current = null; } };
  }, [mode, applyTheme]);

  // ---- auth actions ----
  const signIn = useCallback((email, pw) => {
    const fb = getFb();
    return signInWithEmailAndPassword(fb.auth, email, pw);
  }, []);
  const signUp = useCallback((email, pw) => {
    const fb = getFb();
    return createUserWithEmailAndPassword(fb.auth, email, pw);
  }, []);
  const resetPassword = useCallback((email) => {
    const fb = getFb();
    return sendPasswordResetEmail(fb.auth, email);
  }, []);
  const signOut = useCallback(() => {
    const fb = getFb();
    return fbSignOut(fb.auth);
  }, []);

  const value = {
    ready, mode, user, db, theme,
    signedIn: mode === "local" ? true : !!user,
    actions: { update, setTheme, signIn, signUp, resetPassword, signOut },
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
