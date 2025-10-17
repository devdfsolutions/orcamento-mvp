'use client';

import * as React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  defaultValue?: string | null;
  value?: string;
};

function formatDoc(digits: string) {
  const d = digits.replace(/\D+/g, '').slice(0, 14);
  if (d.length <= 11) {
    // CPF 000.000.000-00
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  // CNPJ 00.000.000/0000-00
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

export default function DocInput({ defaultValue, value, onChange, ...rest }: Props) {
  const [val, setVal] = React.useState<string>(() => {
    const digits = String(value ?? defaultValue ?? '').replace(/\D+/g, '');
    return formatDoc(digits);
  });

  return (
    <input
      {...rest}
      value={val}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D+/g, '');
        const masked = formatDoc(digits);
        setVal(masked);
        // repassa para quem usa (se precisar)
        onChange?.({
          ...e,
          target: { ...e.target, value: masked },
        } as any);
      }}
      // Envia somente dígitos no POST; mantém o valor “bonito” no input:
      onBlur={(e) => {
        const digits = e.currentTarget.value.replace(/\D+/g, '');
        // cria/atualiza um input hidden com o mesmo name, só dígitos
        const form = e.currentTarget.form;
        if (form && rest.name) {
          let hidden = form.querySelector<HTMLInputElement>(`input[type=hidden][name="${rest.name}"]`);
          if (!hidden) {
            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.name = rest.name;
            form.appendChild(hidden);
          }
          hidden.value = digits;
        }
      }}
      inputMode="numeric"
      autoComplete="off"
    />
  );
}
