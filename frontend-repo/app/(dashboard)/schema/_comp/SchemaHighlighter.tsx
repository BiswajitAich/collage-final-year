'use client';

import dynamic from 'next/dynamic';
import { atelierForestDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const SyntaxHighlighter = dynamic(() => import('react-syntax-highlighter').then(m => m.default), { ssr: false });

export default function SchemaHighlighter({ language, children }: { language: string; children: string }) {
  return (
    <SyntaxHighlighter language={language} style={atelierForestDark}>
      {children}
    </SyntaxHighlighter>
  );
}
