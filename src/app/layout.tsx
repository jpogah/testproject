import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Link Shortener',
  description: 'Shorten your URLs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
