"use client";

import React, { forwardRef, InputHTMLAttributes, useCallback } from "react";

type MaskType = "cpf" | "cnpj" | "none";

function onlyDigits(v: string) {
  return v.replace(/\D+/g, "");
}

function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

type Props = InputHTMLAttributes<HTMLInputElement> & {
  mask?: MaskType;
};

const MaskedInput = forwardRef<HTMLInputElement, Props>(function MaskedInput(
  { mask = "none", onInput, ...rest },
  ref
) {
  const handleInput = useCallback<NonNullable<Props["onInput"]>>(
    (e) => {
      const el = e.currentTarget;
      const v = el.value || "";
      if (mask === "cpf") el.value = maskCPF(v);
      else if (mask === "cnpj") el.value = maskCNPJ(v);
      onInput?.(e);
    },
    [mask, onInput]
  );

  return <input ref={ref} onInput={handleInput} {...rest} />;
});

export default MaskedInput;
