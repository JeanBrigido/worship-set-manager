import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Worship Set Manager',
  description: 'Church worship set management application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
