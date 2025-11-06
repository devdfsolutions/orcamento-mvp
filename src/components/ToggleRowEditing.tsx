"use client";

import { useEffect } from "react";

export default function ToggleRowEditing({
  detailsId,
  rowId,
}: { detailsId: string; rowId: string }) {
  useEffect(() => {
    const d = document.getElementById(detailsId) as HTMLDetailsElement | null;
    const row = document.getElementById(rowId) as HTMLTableRowElement | null;
    if (!d || !row) return;

    const update = () => {
      if (d.open) row.classList.add("editing");
      else row.classList.remove("editing");
    };
    update();
    d.addEventListener("toggle", update);
    return () => d.removeEventListener("toggle", update);
  }, [detailsId, rowId]);

  return null;
}
