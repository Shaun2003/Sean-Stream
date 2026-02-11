'use client';

import dynamic from 'next/dynamic';

const LibraryClientCore = dynamic(() => import('./library-client-core'), { ssr: false });

export default function LibraryClient() {
  return <LibraryClientCore />;
}
