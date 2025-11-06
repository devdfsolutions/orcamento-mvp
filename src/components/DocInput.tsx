'use client';

import React from 'react';

type Props = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Input de CPF/CNPJ com máscara visual e campo hidden com apenas dígitos.
 * - Visual padrão .input (igual aos demais campos)
 * - Envia somente números no form
 */
export default function DocInput({
  name,
  defaultValue,
  placeholder,
  className = '',
  style,
}: Props) {
  const onlyDigits = (s: string) => s.replace(/\D+/g, '');

  const formatDoc = (digs: string) => {
    if (digs.length <= 11) {
      // CPF: 000.000.000-00
      return digs
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
        .slice(0, 14);
    }
    // CNPJ: 00.000.000/0000-00
    return digs
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
      .slice(0, 18);
  };

  const [visible, setVisible] = React.useState(() => {
    const digs = onlyDigits(defaultValue ?? '');
    return formatDoc(digs);
  });

  const [hidden, setHidden] = React.useState(() => onlyDigits(defaultValue ?? ''));

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = onlyDigits(e.target.value);
    setVisible(formatDoc(raw));
    setHidden(raw);
  };

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder ?? 'CNPJ/CPF'}
        value={visible}
        onChange={onChange}
        className={`input ${className}`}
        style={style}
      />
      <input type="hidden" name={name} value={hidden} />
    </>
  );
}
