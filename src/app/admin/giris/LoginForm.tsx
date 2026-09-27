"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Hangi alanın yanlış olduğunu belli etmemek için tek mesaj.
      setError("E-posta veya şifre hatalı. Lütfen tekrar deneyin.");
      setPending(false);
      return;
    }

    const target = searchParams.get("devam");
    router.replace(target?.startsWith("/admin") ? target : "/admin");
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} noValidate>
      {error ? (
        <p className="admin-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-field">
        <label htmlFor="eposta">E-posta</label>
        <input
          id="eposta"
          name="eposta"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </div>

      <div className="admin-field">
        <label htmlFor="sifre">Şifre</label>
        <input
          id="sifre"
          name="sifre"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
        />
      </div>

      <button className="admin-btn" type="submit" disabled={pending}>
        {pending ? "Giriş yapılıyor" : "Giriş yap"}
      </button>

      <p className="admin-field__hint">
        Panele yeni hesap açılışı kapalıdır. Erişim gerekiyorsa site
        yöneticisiyle görüşün.
      </p>
    </form>
  );
}
