import type { Metadata } from 'next';
import '@/styles/globals.css';
import { ToastContainer } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: { default: 'FlowAI Platform', template: '%s | FlowAI Platform' },
  description: 'AI-Powered Workflow Infrastructure Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
