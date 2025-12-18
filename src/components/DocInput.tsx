"use client";

import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
};

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}

function formatDoc(digs: string) {
  if (digs.length <= 11) {
    // CPF
    return digs
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
      .slice(0, 14);
  }
  // CNPJ
  return digs
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5")
    .slice(0, 18);
}

export default function DocInput({ defaultValue, onChange, ...props }: Props) {
  const [value, setValue] = React.useState(() =>
    formatDoc(onlyDigits(String(defaultValue ?? "")))
  );

  React.useEffect(() => {
    setValue(formatDoc(onlyDigits(String(defaultValue ?? ""))));
  }, [defaultValue]);

  return (
    <input
      {...props}
      inputMode="numeric"
      value={value}
      onChange={(e) => {
        const raw = onlyDigits(e.target.value);
        const masked = formatDoc(raw);
        setValue(masked);
        onChange?.(e);
      }}
    />
  );
}
