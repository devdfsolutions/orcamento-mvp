// app/projetos/novo/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NovoProjetoWizard() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/projetos/criar-and-go', {
        method: 'POST',
        body: fd,
      });

      // lê a resposta (pode ter {error})
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const message =
          (payload && typeof payload.error === 'string' && payload.error) ||
          `Falha ao criar projeto (HTTP ${res.status})`;
        throw new Error(message);
      }

      if (!payload?.id) {
        throw new Error('A API não retornou o ID do projeto.');
      }

      router.push(`/projetos/${payload.id}/itens`);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro inesperado ao criar projeto.');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
        Novo projeto
      </h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <input
          name="nome"
          placeholder="Nome do projeto"
          required
          disabled={submitting}
          style={{
            height: 36,
            padding: '0 10px',
            border: '1px solid #ddd',
            borderRadius: 8,
          }}
        />

        <ClienteSelect disabled={submitting} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={submitting}
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid #111',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
              opacity: submitting ? 0.8 : 1,
            }}
          >
            {submitting ? 'Criando…' : 'Criar e montar orçamento'}
          </button>

          <a
            href="/projetos"
            style={{
              height: 36,
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 8,
              background: '#fff',
              textDecoration: 'none',
              color: '#111',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Cancelar
          </a>
        </div>

        {err && (
          <p style={{ color: '#b40000', marginTop: 6 }}>
            {err}
          </p>
        )}
      </form>
    </main>
  );
}

function ClienteSelect({ disabled }: { disabled?: boolean }) {
  const [options, setOptions] = useState<{ id: number; nome: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  async function load() {
    if (loaded || loading) return;
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await fetch('/api/clientes/options', { cache: 'no-store' });
      const data = await res.json().catch(() => []);
      setOptions(Array.isArray(data) ? data : []);
      setLoaded(true);
    } catch (e: any) {
      setLoadErr(e?.message ?? 'Falha ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <select
        name="clienteId"
        onFocus={load}
        defaultValue=""
        disabled={disabled}
        style={{
          height: 36,
          padding: '0 10px',
          border: '1px solid #ddd',
          borderRadius: 8,
        }}
      >
        <option value="">
          {loading ? 'Carregando clientes…' : 'Cliente (opcional)'}
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
      {loadErr && (
        <span style={{ color: '#b40000', fontSize: 12 }}>{loadErr}</span>
      )}
    </>
  );
}
