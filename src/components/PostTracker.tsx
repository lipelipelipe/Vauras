// src/components/PostTracker.tsx
'use client';

import { useEffect } from 'react';
import { trackView, startReadTimePings } from '@/lib/tracking';

type Props = {
  postId: string;
  locale: string;
  category?: string;
  intervalSec?: number; // opcional: override do intervalo de ping (default 15s)
};

export default function PostTracker({ postId, locale, category, intervalSec = 15 }: Props) {
  useEffect(() => {
    if (!postId) return;
    // Pageview imediato
    trackView(postId, locale, { category });

    // Pings de leitura
    const stop = startReadTimePings(postId, locale, category, intervalSec);
    return () => { try { (stop as any)?.(); } catch {} };
  }, [postId, locale, category, intervalSec]);

  return null;
}