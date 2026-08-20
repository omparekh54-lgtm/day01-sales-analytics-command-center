import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sales Analytics Command Center | Day 01',
  description: 'A portfolio-grade commercial analytics product for profitable growth, margin leakage, product economics and evidence-based decisions.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
