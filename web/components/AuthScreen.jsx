"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { authErrorMessage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";

export function AuthScreen() {
  const { actions } = useStore();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyG, setBusyG] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      if (mode === "signup") await actions.signUp(email.trim(), pw);
      else await actions.signIn(email.trim(), pw);
    } catch (e2) {
      setErr(authErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setErr(""); setOk("");
    if (!email.trim()) { setErr("Enter your email above first, then click reset."); return; }
    try { await actions.resetPassword(email.trim()); setOk("Password reset email sent — check your inbox."); }
    catch (e2) { setErr(authErrorMessage(e2)); }
  };

  const google = async () => {
    setErr(""); setOk(""); setBusyG(true);
    try {
      await actions.signInWithGoogle();
    } catch (e2) {
      if (e2?.code !== "auth/popup-closed-by-user" && e2?.code !== "auth/cancelled-popup-request") setErr(authErrorMessage(e2));
    } finally {
      setBusyG(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-muted/40 to-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Target className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Lead Tracker</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signup" ? "Create your free account" : "Sign in to your account"}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-6 shadow-sm">
          <Button type="button" variant="outline" className="w-full" onClick={google} disabled={busyG}>
            <GoogleIcon /> {busyG ? "Please wait…" : "Continue with Google"}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-2 text-xs text-muted-foreground">or</span></div>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            {ok && <p className="text-sm text-green-600 dark:text-green-500">{ok}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signup" ? (
            <>Already have an account?{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode("signin"); setErr(""); setOk(""); }}>Sign in</button>
            </>
          ) : (
            <>New here?{" "}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode("signup"); setErr(""); setOk(""); }}>Create an account</button>
              {" · "}
              <button type="button" className="text-primary hover:underline" onClick={reset}>Forgot password?</button>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Your data is stored securely in your private cloud database.</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
