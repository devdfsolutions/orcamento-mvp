"use client";

import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  message: string;
};

export default function ConfirmSubmit({
  message,
  children,
  className,
  style,
  onClick,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={className}
      style={style}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
