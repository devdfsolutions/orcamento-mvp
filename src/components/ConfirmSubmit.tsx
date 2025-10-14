// src/components/ConfirmSubmit.tsx
'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  message?: string;
};

export default function ConfirmSubmit({ children, style, message = 'Excluir este item?' }: Props) {
  return (
    <button
      type="submit"
      style={style}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
