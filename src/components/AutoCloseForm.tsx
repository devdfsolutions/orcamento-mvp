"use client";

import React from "react";

type ServerAction = (formData: FormData) => void | Promise<void>;

type Props = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "id"> & {
  id: string;
  action: ServerAction;
  /** id do <tr> (ex: row-123) */
  rowId?: string;
  /** id do <details> (ex: det-123) */
  detailsId?: string;
};

export default function AutoCloseForm({
  id,
  action,
  rowId,
  detailsId,
  className,
  children,
  ...rest
}: Props) {
  function closeUI() {
    if (detailsId) {
      const det = document.getElementById(detailsId) as HTMLDetailsElement | null;
      if (det) det.open = false;
    }
    if (rowId) {
      const row = document.getElementById(rowId);
      if (row) row.classList.remove("editing");
    }
  }

  return (
    <form
      id={id}
      action={action}
      className={className}
      onSubmitCapture={closeUI}
      {...rest}
    >
      {children}
    </form>
  );
}
