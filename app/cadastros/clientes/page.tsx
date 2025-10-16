import React from 'react';
import ConfirmSubmit from '@/components/ConfirmSubmit';
import AutoCloseForm from '@/components/AutoCloseForm';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import {
  criarClienteUsuario,
  atualizarClienteUsuario,
  excluirClienteUsuario,
} from '@/actions/clientes';

export const dynamic = 'force-dynamic';

/* ===== helpers de exibição ===== */
const digits = (s?: string | null) => (s ? s.replace(/\D+/g, '') : '');

/** 000.000.000-00 */
function formatCPF(v?: string | null) {
  const d = digits(v);
  if (d.length !== 11) return v || '—';
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/** 00.000.000/0000-00 */
function formatCNPJ(v?: string | null) {
  const d = digits(v);
  if (d.length !== 14) return v || '—';
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export default async function Page() {
  // precisa estar logado
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // busca o registro do usuário interno (tabela Usuario)
  const me = await prisma.usuario.findUnique({
    where: { supabaseUserId: user.id },
    select: { id: true },
  });

  if (!me) redirect('/login');

  // Clientes só deste usuário
  const clientes = await prisma.clienteUsuario.findMany({
    where: { usuarioId: me.id },
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      cpf: true,
      cnpj: true,
      email: true,
      telefone: true,
      endereco: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <main
      style={{
        padding: 24,
        display: 'grid',
        gap: 16,
        maxWidth: 1100,
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Cadastros / Clientes</h1>

      {/* criar */}
      <section style={card}>
        <h2 style={h2}>Novo cliente</h2>

        <form
          action={criarClienteUsuario}
          style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            alignItems: 'center',
          }}
        >
          <input type="hidden" name="usuarioId" value={me.id} />

          <input
            name="nome"
            placeholder="Nome"
            required
            style={{ ...input, gridColumn: '1 / span 1' }}
          />

          {/* CPF */}
          <input
            name="cpf"
            placeholder="CPF (opcional)"
            maxLength={14}
            style={input}
            onInput={(e) => {
              const target = e.currentTarget;
              let v = target.value.replace(/\D/g, '');
              if (v.length > 11) v = v.slice(0, 11);
              v = v.replace(/(\d{3})(\d)/, '$1.$2');
              v = v.replace(/(\d{3})(\d)/, '$1.$2');
              v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
              target.value = v;
            }}
          />

          {/* CNPJ */}
          <input
            name="cnpj"
            placeholder="CNPJ (opcional)"
            maxLength={18}
            style={input}
            onInput={(e) => {
              const target = e.currentTarget;
              let v = target.value.replace(/\D/g, '');
              if (v.length > 14) v = v.slice(0, 14);
              v = v.replace(/^(\d{2})(\d)/, '$1.$2');
              v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
              v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
              v = v.replace(/(\d{4})(\d)/, '$1-$2');
              target.value = v;
            }}
          />

          <input
            name="email"
            placeholder="E-mail (opcional)"
            style={{ ...input, gridColumn: '1 / span 1' }}
          />
          <input name="telefone" placeholder="Telefone (opcional)" style={input} />

          {/* CEP */}
          <input
            name="cep"
            placeholder="CEP (opcional)"
            maxLength={9}
            style={input}
            onInput={(e) => {
              const target = e.currentTarget;
              let v = target.value.replace(/\D/g, '');
              if (v.length > 8) v = v.slice(0, 8);
              if (v.length > 5) v = v.replace(/(\d{5})(\d)/, '$1-$2');
              target.value = v;
            }}
            onBlur={async (e) => {
              const cep = e.currentTarget.value.replace(/\D/g, '');
              if (cep.length === 8) {
                try {
                  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                  const data = await res.json();
                  if (!data.erro) {
                    const endereco = [
                      data.logradouro,
                      data.bairro,
                      data.localidade,
                      data.uf,
                    ]
                      .filter(Boolean)
                      .join(', ');
                    const enderecoInput = document.querySelector<HTMLInputElement>(
                      'input[name="endereco"]'
                    );
                    if (enderecoInput) enderecoInput.value = endereco;
                  }
                } catch (err) {
                  console.warn('Erro ao buscar CEP', err);
                }
              }
            }}
          />

          <input
            name="endereco"
            placeholder="Endereço (opcional)"
            style={{ ...input, gridColumn: '1 / span 3' }}
          />

          <div
            style={{
              gridColumn: '1 / span 4',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button style={btn}>Adicionar Novo</button>
          </div>
        </form>
      </section>

      {/* lista */}
      <section>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#fff',
          }}
        >
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Nome</th>
              <th style={th}>CPF</th>
              <th style={th}>CNPJ</th>
              <th style={th}>E-mail</th>
              <th style={th}>Telefone</th>
              <th style={th}>Endereço</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td style={td}>{c.id}</td>
                <td style={td}>{c.nome}</td>
                <td style={td}>{formatCPF(c.cpf)}</td>
                <td style={td}>{formatCNPJ(c.cnpj)}</td>
                <td style={td}>{c.email ?? '—'}</td>
                <td style={td}>{c.telefone ?? '—'}</td>
                <td style={td}>{c.endereco ?? '—'}</td>
                <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <details style={{ display: 'inline-block', marginRight: 8 }}>
                    <summary style={linkBtn}>Editar</summary>
                    <div style={{ paddingTop: 8 }}>
                      <AutoCloseForm
                        id={`edit-${c.id}`}
                        action={atualizarClienteUsuario}
                        style={{
                          display: 'grid',
                          gap: 8,
                          gridTemplateColumns: '2fr 1fr 1fr 1fr',
                          maxWidth: 900,
                        }}
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <input name="nome" defaultValue={c.nome} required style={input} />
                        <input
                          name="cpf"
                          defaultValue={c.cpf ?? ''}
                          placeholder="CPF"
                          maxLength={14}
                          style={input}
                          onInput={(e) => {
                            const t = e.currentTarget;
                            let v = t.value.replace(/\D/g, '');
                            if (v.length > 11) v = v.slice(0, 11);
                            v = v.replace(/(\d{3})(\d)/, '$1.$2');
                            v = v.replace(/(\d{3})(\d)/, '$1.$2');
                            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                            t.value = v;
                          }}
                        />
                        <input
                          name="cnpj"
                          defaultValue={c.cnpj ?? ''}
                          placeholder="CNPJ"
                          maxLength={18}
                          style={input}
                          onInput={(e) => {
                            const t = e.currentTarget;
                            let v = t.value.replace(/\D/g, '');
                            if (v.length > 14) v = v.slice(0, 14);
                            v = v.replace(/^(\d{2})(\d)/, '$1.$2');
                            v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                            v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
                            v = v.replace(/(\d{4})(\d)/, '$1-$2');
                            t.value = v;
                          }}
                        />
                        <input
                          name="email"
                          defaultValue={c.email ?? ''}
                          placeholder="E-mail"
                          style={input}
                        />
                        <input
                          name="telefone"
                          defaultValue={c.telefone ?? ''}
                          placeholder="Telefone"
                          style={input}
                        />
                        <input
                          name="endereco"
                          defaultValue={c.endereco ?? ''}
                          placeholder="Endereço"
                          style={{ ...input, gridColumn: '1 / span 3' }}
                        />
                      </AutoCloseForm>
                    </div>
                  </details>

                  <button
                    type="submit"
                    form={`edit-${c.id}`}
                    className="save-btn"
                    style={primaryBtn}
                  >
                    Salvar
                  </button>

                  <form
                    action={excluirClienteUsuario}
                    style={{ display: 'inline', marginLeft: 8 }}
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmSubmit style={dangerBtn} message="Excluir este cliente?">
                      Excluir
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td style={td} colSpan={8}>
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* CSS embutido */}
      <style>{`
        td .save-btn {
          display: none;
          margin-left: 6px;
        }
        td details[open] + .save-btn {
          display: inline-block;
        }
      `}</style>
    </main>
  );
}

/* estilos inline */
const card: React.CSSProperties = {
  padding: 12,
  border: '1px solid #eee',
  borderRadius: 8,
  background: '#fff',
};
const h2: React.CSSProperties = {
  fontSize: 16,
  margin: '0 0 10px',
};
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 10,
  borderBottom: '1px solid #eee',
  background: '#fafafa',
  fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #f2f2f2',
  verticalAlign: 'top',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
};
const input: React.CSSProperties = {
  height: 36,
  padding: '0 10px',
  border: '1px solid #ddd',
  borderRadius: 8,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
const btn: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 8,
  border: '1px solid #ddd',
  background: '#111',
  color: '#fff',
  cursor: 'pointer',
};
const primaryBtn: React.CSSProperties = {
  height: 30,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid #111',
  background: '#111',
  color: '#fff',
  cursor: 'pointer',
};
const dangerBtn: React.CSSProperties = {
  height: 30,
  padding: '0 10px',
  borderRadius: 8,
  border: '1px solid #f1d0d0',
  background: '#ffeaea',
  color: '#b40000',
  cursor: 'pointer',
};
const linkBtn: React.CSSProperties = {
  cursor: 'pointer',
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: 8,
  border: '1px solid #ddd',
  background: '#f8f8f8',
};
