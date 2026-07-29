import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Go Shopping — Panel del Vendedor',
  description: 'Gestiona tu tienda, pedidos y productos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#F5F7FA] min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}

