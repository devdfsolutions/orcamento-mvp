"use client";

import { useEffect } from "react";

export default function ToggleRowEditing({
  detailsId,
  rowId,
}: {
  detailsId: string;
  rowId: string;
}) {
  useEffect(() => {
    const det = document.getElementById(detailsId) as HTMLDetailsElement | null;
    const row = document.getElementById(rowId) as HTMLTableRowElement | null;
    if (!det || !row) return;

    const sync = () => {
      if (det.open) row.classList.add("editing");
      else row.classList.remove("editing");
    };

    // estado inicial
    sync();

    // quando abre/fecha o details
    det.addEventListener("toggle", sync);

    return () => {
      det.removeEventListener("toggle", sync);
    };
  }, [detailsId, rowId]);

  return null;
}
