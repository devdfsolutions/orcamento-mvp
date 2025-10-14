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
  ...props
}: AutoCloseFormProps) {
  const ref = React.useRef<HTMLFormElement>(null);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    // NÃO chame e.preventDefault(): deixe a server action rodar normalmente
    props.onSubmit?.(e);

    const form = ref.current;
    if (!form) return;

    // Evita duplo clique no submit até o próximo ciclo
    if (disableButtonsOnSubmit) {
      const btns = form.querySelectorAll('button, input[type="submit"]');
      btns.forEach((el) => {
        (el as HTMLButtonElement | HTMLInputElement).disabled = true;
      });
    }

    // Aguardar um tick (ou o delay configurado) para fechar/limpar
    const run = () => {
      try {
        if (resetOnSubmit) form.reset();
      } catch {}

      if (closeOnSubmit) {
        const details = form.closest('details');
        if (details && details.hasAttribute('open')) {
          details.removeAttribute('open');
        }
      }

      // tira foco do botão/summary
      (document.activeElement as HTMLElement | null)?.blur?.();
    };

    if (delayMs > 0) {
      setTimeout(run, delayMs);
    } else {
      // 0ms: empurra pro final do frame atual
      setTimeout(run, 0);
    }
  };

  return <form ref={ref} {...props} onSubmit={onSubmit} />;
}
