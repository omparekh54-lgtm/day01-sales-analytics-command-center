import type { Metadata } from 'next';
import './globals.css';
import './v3.css';
import './v4.css';

export const metadata: Metadata = {
  title: 'Signal Sales Intelligence | Day 01',
  description: 'Upload CSV or Excel sales data, validate it, explain what changed, rank commercial leakage, forecast revenue, simulate decisions, and generate management intelligence.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
