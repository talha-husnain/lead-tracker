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

        <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-6 shadow-sm">
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
