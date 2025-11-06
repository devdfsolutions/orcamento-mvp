'use client';

import * as React from 'react';

type AutoCloseFormProps = React.FormHTMLAttributes<HTMLFormElement> & {
  /** Fecha o <details> após submit. Default: true */
  closeOnSubmit?: boolean;
  /** Dá reset() no form após submit. Default: true */
  resetOnSubmit?: boolean;
  /** Delay (ms) antes de fechar/limpar (deixa o submit ir pro servidor). Default: 0 */
  delayMs?: number;
  /** Desabilita os botões para evitar duplo clique até o próximo paint. Default: true */
  disableButtonsOnSubmit?: boolean;
};

export default function AutoCloseForm({
  closeOnSubmit = true,
  resetOnSubmit = true,
  delayMs = 0,
  disableButtonsOnSubmit = true,
  onSubmit,
  ...props
}: AutoCloseFormProps) {
  const ref = React.useRef<HTMLFormElement>(null);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    // Deixa a server action prosseguir normalmente
    onSubmit?.(e);

    const form = ref.current;
    if (!form) return;

    // Evita duplo clique no submit até o próximo ciclo
    if (disableButtonsOnSubmit) {
      const btns = form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
        'button, input[type="submit"]'
      );
      btns.forEach((el) => (el.disabled = true));
    }

    const run = () => {
      try {
        if (resetOnSubmit) form.reset();
      } catch {}

      if (closeOnSubmit) {
        const details = form.closest('details');
        if (details && (details as HTMLDetailsElement).open) {
          (details as HTMLDetailsElement).open = false;
        }
      }

      // tira foco do elemento ativo
      (document.activeElement as HTMLElement | null)?.blur?.();
    };

    if (delayMs > 0) setTimeout(run, delayMs);
    else setTimeout(run, 0);
  };

  return <form ref={ref} {...props} onSubmit={handleSubmit} />;
}
