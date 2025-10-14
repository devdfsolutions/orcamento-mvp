'use client';

import * as React from 'react';

type MaskKind = 'cpf' | 'cnpj' | 'phone';

function formatCPF(v: string) {
  const s = v.replace(/\D+/g, '').slice(0, 11);
  return s
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}
function formatCNPJ(v: string) {
  const s = v.replace(/\D+/g, '').slice(0, 14);
  return s
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}
function formatPhone(v: string) {
  const s = v.replace(/\D+/g, '').slice(0, 11);
  if (s.length <= 10) {
    return s
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{4})$/, '$1-$2');
  }
  return s
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{4})$/, '$1-$2');
}

const formatMap: Record<MaskKind, (v: string) => string> = {
  cpf: formatCPF,
  cnpj: formatCNPJ,
  phone: formatPhone,
};

export default function MaskedInput(
  { mask, defaultValue, onChange, ...props }:
  React.InputHTMLAttributes<HTMLInputElement> & { mask: MaskKind }
) {
  const [value, setValue] = React.useState<string>(
    typeof defaultValue === 'string' ? defaultValue : String(defaultValue ?? '')
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value ?? '';
    const formatted = formatMap[mask](raw);
    setValue(formatted);
    // propagar o evento como se fosse um input normal
    if (onChange) onChange({ ...e, target: { ...e.target, value: formatted } } as any);
  };

  return (
    <input {...props} value={value} onChange={handleChange} />
  );
}
