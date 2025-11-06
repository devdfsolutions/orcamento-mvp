'use client';
import { useEffect } from 'react';

type Props = {
  paramKey: string;   // ex: "e"
  badValue: string;   // ex: "NEXT_REDIRECT"
};

export default function CleanRedirectParam({ paramKey, badValue }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const v = url.searchParams.get(paramKey);
    if (v === badValue) {
      url.searchParams.delete(paramKey);
      const clean = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '');
      window.history.replaceState({}, '', clean);
    }
  }, [paramKey, badValue]);

  return null;
}
