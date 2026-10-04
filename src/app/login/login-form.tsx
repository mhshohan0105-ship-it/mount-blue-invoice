"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="rounded-2xl bg-white p-6 shadow-xl">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="password" className="label">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        className="input"
      />
      {state?.error && <p className="mt-2 text-sm font-medium text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary mt-4 w-full py-2.5">
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
