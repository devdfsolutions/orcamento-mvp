"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

type ServerAction = (formData: FormData) => void | Promise<void>;

function RowSubmitButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Salvando..." : children}
    </button>
  );
}

export default function FormActionRow({
  id,
  action,
  rowId,
  detailsId,
  className,
  children,
  submitClassName = "btn btn-primary btn-sm",
  submitLabel = "Salvar",
}: {
  id: string;
  action: ServerAction;
  rowId?: string;
  detailsId?: string;
  className?: string;
  children: React.ReactNode;
  submitClassName?: string;
  submitLabel?: string;
}) {
  const router = useRouter();

  async function clientAction(formData: FormData) {
    // chama server action
    await action(formData);

    // fecha UI (editor) depois que salvou
    if (detailsId) {
      const det = document.getElementById(detailsId) as HTMLDetailsElement | null;
      if (det) det.open = false;
    }
    if (rowId) {
      const row = document.getElementById(rowId);
      if (row) row.classList.remove("editing");
    }

    // força atualizar a lista com dados novos
    router.refresh();
  }

  return (
    <form id={id} action={clientAction} className={className}>
      {children}
      <RowSubmitButton className={submitClassName}>{submitLabel}</RowSubmitButton>
    </form>
  );
}
