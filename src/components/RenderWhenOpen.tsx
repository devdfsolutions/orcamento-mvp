"use client";

import React, { PropsWithChildren, useEffect, useState } from "react";

type Props = { detailsId: string };

export default function RenderWhenOpen({ detailsId, children }: PropsWithChildren<Props>) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = document.getElementById(detailsId) as HTMLDetailsElement | null;
    if (!el) return;
    const update = () => setOpen(el.open);
    update();
    el.addEventListener("toggle", update);
    return () => el.removeEventListener("toggle", update);
  }, [detailsId]);

  return open ? <>{children}</> : null;
}
