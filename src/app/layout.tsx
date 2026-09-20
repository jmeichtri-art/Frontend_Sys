import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthContext';

// Roboto es la tipografía de servysis.com. Se carga con next/font, que la auto-hospeda
// en el build: sin request a Google en runtime y sin el salto de fuente del @import.
// Sin el peso 800 a propósito: Roboto no lo tiene, y dejarlo caer en 700 es más
// consistente que dejar que el navegador resuelva `font-extrabold` en 900.
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ForkBuilder | Configurador de Autoelevadores',
  description: 'Sistema de configuración y cotización de autoelevadores taylor-made.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={roboto.variable} suppressHydrationWarning>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
