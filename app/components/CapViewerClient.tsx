'use client';

import dynamic from 'next/dynamic';

// R3F is browser-only. `ssr: false` is not allowed in Server Components, so the
// dynamic import has to live in a Client Component like this one.
const CapViewer = dynamic(() => import('./CapViewer'), {
  ssr: false,
  loading: () => <div className="h-dvh w-full bg-paper" />,
});

export default CapViewer;
