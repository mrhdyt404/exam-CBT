import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'CBT High-Concurrency Engine - Ujian Online Nasional',
  description: 'Sistem Ujian Berbasis Komputer Cepat, Andal, dan Tahan Beban 15.000++ Peserta',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
