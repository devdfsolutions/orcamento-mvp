import ConfirmSubmit from '@/components/ConfirmSubmit';
import AutoCloseForm from '@/components/AutoCloseForm';
import DocInput from '@/components/DocInput';
import { prisma } from '@/lib/prisma';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import {
  criarFornecedor,
  atualizarFornecedor,
  excluirFornecedor,
} from '@/actions/fornecedores';

export const dynamic = 'force-dynamic';

function docMask(v?: string | null) {
  if (!v) return '—';
  const d = String(v).replace(/\D+/g, '');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return v;
}

export default async function Page({
  searchParams,
}: { searchParams?: { e?: string; ok?: string } }) {
  // auth
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const fornecedores = await prisma.fornecedor.findMany({
    orderBy: [{ nome: 'asc' }],
    select: { id: true, nome: true, cnpjCpf: true, contato: true },
  });

  const msgErro = searchParams?.e ? decodeURIComponent(searchParams.e) : null;
  const ok = searchParams?.ok === '1';

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Cadastros / Fornecedores</h1>

      {msgErro && (
        <div style={{ padding: '10px 12px', border: '1px solid #f1d0d0', background: '#ffeaea', color: '#7a0000', borderRadius: 8 }}>
          {msgErro}
        </div>
      )}
      {ok && (
        <div style={{ padding: '10px 12px', border: '1px solid #d9f0d0', background: '#f3fff0', color: '#235c00', borderRadius: 8 }}>
          Salvo com sucesso.
        </div>
      )}

      {/* CSS do botão Salvar em edição inline */}
      <style>{`
        td .save-btn { display: none; margin-left: 6px; }
        td details[open] + .save-btn { display: inline-block; }
      `}</style>

      {/* Novo fornecedor */}
      <section style={card}>
        <h2 style={h2}>Novo fornecedor</h2>

        <form action={criarFornecedor} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 220px 1fr' }}>
          <input name="nome" placeholder="Razão/Nome" required style={input} />
          <DocInput name="cnpjCpf" placeholder="CNPJ/CPF (apenas números)" style={input} />
          <input name="contato" placeholder="Contato (tel/email/obs)" style={input} />
          <div style={{ gridColumn: '1 / span 3', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={btn}>Salvar</button>
          </div>
        </form>
      </section>

      {/* Lista */}
      <section>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Nome</th>
              <th style={th}>CNPJ/CPF</th>
              <th style={th}>Contato</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.map(f => (
              <tr key={f.id}>
                <td style={td}>{f.id}</td>
                <td style={td}>{f.nome}</td>
                <td style={td}>{docMask(f.cnpjCpf)}</td>
                <td style={td}>{f.contato || '—'}</td>
                <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <details style={{ display: 'inline-block', marginRight: 8 }}>
                    <summary style={linkBtn}>Editar</summary>
                    <div style={{ paddingTop: 8 }}>
                      <AutoCloseForm
                        id={`edit-${f.id}`}
                        action={atualizarFornecedor}
                        style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 220px 1fr', maxWidth: 800 }}
                      >
                        <input type="hidden" name="id" value={f.id} />
                        <input name="nome" defaultValue={f.nome} required style={input} />
                        <DocInput name="cnpjCpf" defaultValue={f.cnpjCpf} placeholder="CNPJ/CPF" style={input} />
                        <input name="contato" defaultValue={f.contato ?? ''} placeholder="Contato" style={input} />
                      </AutoCloseForm>
                    </div>
                  </details>

                  <button type="submit" form={`edit-${f.id}`} className="save-btn" style={primaryBtn}>
                    Salvar
                  </button>

                  <form action={excluirFornecedor} style={{ display: 'inline', marginLeft: 8 }}>
                    <input type="hidden" name="id" value={f.id} />
                    <ConfirmSubmit style={dangerBtn} message="Excluir este fornecedor?">
                      Excluir
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
            {fornecedores.length === 0 && (
              <tr><td style={td} colSpan={5}>Nenhum fornecedor cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

/* estilos inline */
const card: React.CSSProperties = { padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' };
const h2: React.CSSProperties = { fontSize: 16, margin: '0 0 10px' };
const th: React.CSSProperties = { textAlign: 'left', padding: 10, borderBottom: '1px solid #eee', background: '#fafafa', fontWeight: 600, whiteSpace: 'normal' };
const td: React.CSSProperties = { padding: 10, borderBottom: '1px solid #f2f2f2', verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'anywhere' };
const input: React.CSSProperties = { height: 36, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8, outline: 'none', width: '100%', boxSizing: 'border-box' };
const btn: React.CSSProperties = { height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #ddd', background: '#111', color: '#fff', cursor: 'pointer' };
const primaryBtn: React.CSSProperties = { height: 30, padding: '0 12px', borderRadius: 8, border: '1px solid #111', background: '#111', color: '#fff', cursor: 'pointer' };
const dangerBtn: React.CSSProperties = { height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #f1d0d0', background: '#ffeaea', color: '#b40000', cursor: 'pointer' };
const linkBtn: React.CSSProperties = { cursor: 'pointer', display: 'inline-block', padding: '4px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f8f8f8' };
