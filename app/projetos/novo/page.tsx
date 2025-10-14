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
      if (!res.ok) throw new Error('Falha ao criar projeto');
      const data = await res.json();
      router.push(`/projetos/${data.id}/itens`);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro inesperado');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Novo projeto</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <input name="nome" placeholder="Nome do projeto" required
               style={{ height: 36, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8 }} />

        <ClienteSelect />

        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={submitting}
                  style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #111', background: '#111', color: '#fff', cursor: 'pointer' }}>
            {submitting ? 'Criando…' : 'Criar e montar orçamento'}
          </button>
          <a href="/projetos" style={{ height: 36, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', textDecoration: 'none', color: '#111' }}>
            Cancelar
          </a>
        </div>

        {err && <p style={{ color: '#b40000' }}>{err}</p>}
      </form>
    </main>
  );
}

function ClienteSelect() {
  const [options, setOptions] = useState<{ id: number; nome: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) return;
    setLoaded(true);
    const res = await fetch('/api/clientes/options', { cache: 'no-store' });
    const data = await res.json();
    setOptions(data ?? []);
  }

  return (
    <select name="clienteId" onFocus={load} defaultValue=""
            style={{ height: 36, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8 }}>
      <option value="">Cliente (opcional)</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
    </select>
  );
}
