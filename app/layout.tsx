import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Apex Wealth Manager — M. Mahin',
  description:
    'High-density local-first personal finance command center by M. Mahin featuring zero-based budgeting, variable burn-rate velocity, multi-month archives, and Warren AI capital allocation.',
  openGraph: {
    title: 'Apex Wealth Manager — M. Mahin',
    description:
      'High-density local-first personal finance command center by M. Mahin featuring zero-based budgeting, variable burn-rate velocity, multi-month archives, and Warren AI capital allocation.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apex Wealth Manager — M. Mahin',
    description:
      'High-density local-first personal finance command center by M. Mahin featuring zero-based budgeting, variable burn-rate velocity, multi-month archives, and Warren AI capital allocation.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#0b0f17] text-gray-100 font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 min-h-screen"
      >
        {children}
      </body>
    </html>
  );
}
