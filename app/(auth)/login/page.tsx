"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const supabase = getSupabaseBrowser();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }
    router.replace("/projetos"); // onde você quer cair depois do login
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        width: 420,
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 6px 24px rgba(0,0,0,.05)",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 16 }}>
        Entrar
      </h1>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Email"
        required
        style={input}
      />
      <input
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        type="password"
        placeholder="Senha"
        required
        style={{ ...input, marginTop: 8 }}
      />

      {err && (
        <div style={{ color: "#b40000", fontSize: 12, marginTop: 8 }}>
          {err}
        </div>
      )}

      <button type="submit" disabled={loading} style={{ ...btn, marginTop: 12 }}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  outline: "none",
  background: "#fff",
};

const btn: React.CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 8,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};
