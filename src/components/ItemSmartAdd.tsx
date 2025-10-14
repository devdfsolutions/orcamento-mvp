'use client';

import * as React from 'react';
import AutoCloseForm from '@/components/AutoCloseForm';
import { adicionarItem } from '@/actions/estimativas';

type Unidade = { id: number; sigla: string; nome?: string };
type ProdutoOpt = { id: number; nome: string; unidade?: { id: number; sigla: string } };

type FonteMat = 'P1' | 'P2' | 'P3';
type FonteMo  = 'M1' | 'M2' | 'M3';

type TierMat = { valor: number; fornecedorId: number; fonte: FonteMat } | null;
type TierMo  = { valor: number; fornecedorId: number; fonte: FonteMo  } | null;

type OfertasResp = {
  produtoId: number;
  unidade: { id: number; sigla: string } | null;
  fornecedores: Array<{
    id: number;
    nome: string;
    mat: Partial<Record<FonteMat, number | null>>;
    mo:  Partial<Record<FonteMo,  number | null>>;
  }>;
  tiers: {
    mat: { min: TierMat; mid: TierMat; max: TierMat };
    mo:  { min: TierMo;  mid: TierMo;  max: TierMo  };
  }
};

function money(n?: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const input: React.CSSProperties = {
  height: 36, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8, outline: 'none', width: '100%', boxSizing: 'border-box',
};
const primaryBtn: React.CSSProperties = {
  height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #111', background: '#111', color: '#fff', cursor: 'pointer',
};

type Props = {
  estimativaId: number;
  produtos: ProdutoOpt[];
  unidades: Unidade[];
};

export default function ItemSmartAdd({ estimativaId, produtos, unidades }: Props) {
  const [produtoId, setProdutoId] = React.useState<number | ''>('');
  const [ofertas, setOfertas] = React.useState<OfertasResp | null>(null);

  // seleção atual
  const [fornecedorId, setFornecedorId] = React.useState<number | ''>('');
  const [fonteMat, setFonteMat] = React.useState<FonteMat | ''>('');
  const [fonteMo, setFonteMo]   = React.useState<FonteMo  | ''>('');
  const [unidadeId, setUnidadeId] = React.useState<number | ''>('');
  const [quantidade, setQuantidade] = React.useState<string>('');

  // preços correntes
  const precoMatAtual = React.useMemo(() => {
    if (!ofertas || !fornecedorId || !fonteMat) return null;
    const f = ofertas.fornecedores.find(x => x.id === fornecedorId);
    const val = f?.mat?.[fonteMat];
    return (val ?? null) as number | null;
  }, [ofertas, fornecedorId, fonteMat]);

  const precoMoAtual = React.useMemo(() => {
    if (!ofertas || !fornecedorId || !fonteMo) return null;
    const f = ofertas.fornecedores.find(x => x.id === fornecedorId);
    const val = f?.mo?.[fonteMo];
    return (val ?? null) as number | null;
  }, [ofertas, fornecedorId, fonteMo]);

  const totalPreview = React.useMemo(() => {
    const q = Number(String(quantidade).replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(q)) return null;
    const m = Number(precoMatAtual ?? 0);
    const o = Number(precoMoAtual  ?? 0);
    return Math.round(q * (m + o) * 100) / 100;
  }, [quantidade, precoMatAtual, precoMoAtual]);

  // carrega ofertas ao escolher o produto
  React.useEffect(() => {
    let ignore = false;
    async function run() {
      setOfertas(null);
      setFornecedorId(''); setFonteMat(''); setFonteMo(''); setUnidadeId('');
      if (!produtoId) return;

      const res = await fetch(`/api/produtos/${produtoId}/ofertas`, { cache: 'no-store' });
      const data: OfertasResp = await res.json();
      if (ignore) return;

      setOfertas(data);
      if (data.unidade?.id) setUnidadeId(data.unidade.id);

      // default “inteligente”: se houver materiais, pega menor materiais; senão, menor mão de obra
      if (data.tiers.mat.min) {
        setFornecedorId(data.tiers.mat.min.fornecedorId);
        setFonteMat(data.tiers.mat.min.fonte);
      } else if (data.tiers.mo.min) {
        setFornecedorId(data.tiers.mo.min.fornecedorId);
        setFonteMo(data.tiers.mo.min.fonte);
      }
    }
    run();
    return () => { ignore = true; };
  }, [produtoId]);

  // garantir fonte válida ao trocar de fornecedor
  React.useEffect(() => {
    if (!ofertas || !fornecedorId) return;
    const f = ofertas.fornecedores.find(x => x.id === fornecedorId);
    if (!f) return;

    if (!fonteMat || f.mat[fonteMat] == null) {
      const c = (['P1','P2','P3'] as FonteMat[])
        .map(k => ({ k, v: f.mat[k] }))
        .filter(x => x.v != null) as Array<{ k: FonteMat; v: number }>;
      if (c.length) c.sort((a,b)=>a.v-b.v), setFonteMat(c[0].k);
      else setFonteMat('');
    }
    if (!fonteMo || f.mo[fonteMo] == null) {
      const c = (['M1','M2','M3'] as FonteMo[])
        .map(k => ({ k, v: f.mo[k] }))
        .filter(x => x.v != null) as Array<{ k: FonteMo; v: number }>;
      if (c.length) c.sort((a,b)=>a.v-b.v), setFonteMo(c[0].k);
      else setFonteMo('');
    }
  }, [fornecedorId, ofertas, fonteMat, fonteMo]);

  const matOptions = React.useMemo(() => {
    if (!ofertas || !fornecedorId) return [];
    const f = ofertas.fornecedores.find(x => x.id === fornecedorId);
    if (!f) return [];
    return (['P1','P2','P3'] as FonteMat[])
      .filter(k => f.mat[k] != null)
      .map(k => ({ k, v: f.mat[k] as number }));
  }, [ofertas, fornecedorId]);

  const moOptions = React.useMemo(() => {
    if (!ofertas || !fornecedorId) return [];
    const f = ofertas.fornecedores.find(x => x.id === fornecedorId);
    if (!f) return [];
    return (['M1','M2','M3'] as FonteMo[])
      .filter(k => f.mo[k] != null)
      .map(k => ({ k, v: f.mo[k] as number }));
  }, [ofertas, fornecedorId]);

  // pode enviar se tiver: produto, fornecedor, um, qtd e ao menos UMA fonte (mat OU mo)
  const canSubmit = Boolean(
    estimativaId && produtoId && fornecedorId && unidadeId && quantidade &&
    (fonteMat || fonteMo)
  );

  return (
    <AutoCloseForm
      action={adicionarItem}
      style={{
        display: 'grid',
        gap: 8,
        // sem a coluna dos chips; redistribuímos o espaço
        gridTemplateColumns: '2fr 90px 110px 1fr 1fr 1fr',
        alignItems: 'center'
      }}
    >
      {/* hidden base */}
      <input type="hidden" name="estimativaId" value={estimativaId} />
      <input type="hidden" name="produtoId" value={produtoId || ''} />
      <input type="hidden" name="fornecedorId" value={fornecedorId || ''} />
      <input type="hidden" name="fontePrecoMat" value={fonteMat || ''} />
      <input type="hidden" name="fontePrecoMo"  value={fonteMo  || ''} />

      {/* 1. Produto */}
      <select
        name="__produto_visual"
        value={String(produtoId)}
        onChange={(e) => setProdutoId(Number(e.target.value) || '')}
        required
        style={input}
      >
        <option value="">Produto/Serviço</option>
        {produtos.map(p => (
          <option key={p.id} value={p.id}>
            {p.nome} {p.unidade?.sigla ? `(${p.unidade.sigla})` : ''}
          </option>
        ))}
      </select>

      {/* 2. Quantidade */}
      <input
        name="quantidade"
        placeholder="Qtd"
        inputMode="decimal"
        value={quantidade}
        onChange={(e) => setQuantidade(e.target.value)}
        required
        style={input}
      />

      {/* 3. UM */}
      <select
        name="unidadeId"
        value={String(unidadeId)}
        onChange={(e) => setUnidadeId(Number(e.target.value) || '')}
        required
        style={input}
      >
        <option value="">UM</option>
        {unidades.map(u => (
          <option key={u.id} value={u.id}>{u.sigla}</option>
        ))}
      </select>

      {/* 4. Fornecedor */}
      <select
        name="__fornecedor_visual"
        value={String(fornecedorId)}
        onChange={(e) => setFornecedorId(Number(e.target.value) || '')}
        disabled={!ofertas}
        style={input}
      >
        <option value="">Fornecedor</option>
        {ofertas?.fornecedores.map(f => (
          <option key={f.id} value={f.id}>{f.nome}</option>
        ))}
      </select>

      {/* 5. Fonte Materiais / 6. Fonte Mão de Obra */}
      <select
        name="__fonte_mat_visual"
        value={fonteMat}
        onChange={(e) => setFonteMat((e.target.value || '') as FonteMat | '')}
        disabled={!fornecedorId || matOptions.length === 0}
        style={input}
      >
        <option value="">Materiais: —</option>
        {matOptions.map(o => (
          <option key={o.k} value={o.k}>
            {o.k} — {money(o.v)}
          </option>
        ))}
      </select>

      <select
        name="__fonte_mo_visual"
        value={fonteMo}
        onChange={(e) => setFonteMo((e.target.value || '') as FonteMo | '')}
        disabled={!fornecedorId || moOptions.length === 0}
        style={input}
      >
        <option value="">Mão de Obra: —</option>
        {moOptions.map(o => (
          <option key={o.k} value={o.k}>
            {o.k} — {money(o.v)}
          </option>
        ))}
      </select>

      {/* Preview */}
      <div style={{ gridColumn: '1 / span 6', display: 'flex', gap: 12, alignItems: 'center', color: '#555' }}>
        <span>Unit. Materiais: <b>{money(precoMatAtual)}</b></span>
        <span>Unit. Mão de Obra: <b>{money(precoMoAtual)}</b></span>
        <span>Total prev.: <b>{money(totalPreview)}</b></span>
      </div>

      <div style={{ gridColumn: '1 / span 6', display: 'flex', justifyContent: 'flex-end' }}>
        <button style={primaryBtn} disabled={!canSubmit}>Adicionar item</button>
      </div>
    </AutoCloseForm>
  );
}
