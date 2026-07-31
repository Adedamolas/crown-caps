'use client';

import dynamic from 'next/dynamic';

// R3F is browser-only, and `ssr: false` is not allowed in Server Components — so the
// dynamic import has to live in a Client Component like this one.
const CapGrid = dynamic(() => import('./CapGrid'), {
  ssr: false,
  // No spinner: the field's own loading state is the mint liner (DESIGN.md §7).
  loading: () => <div className="h-dvh w-full bg-paper" />,
});

export default CapGrid;
