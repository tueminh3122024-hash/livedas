import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: '🌾 Livedas — Sàn Giá Sỉ Nông Sản Realtime',
  description: 'Bảng tra cứu giá sỉ nông sản Việt Nam trực tuyến cập nhật liên tục 15 phút. Kết nối nhà vườn chuyên doanh qua Zalo & SĐT.',
  keywords: ['giá sỉ nông sản', 'sầu riêng Ri6', 'giá cà phê robusta', 'nông sản sạch', 'chợ đầu mối', 'livedas'],
  authors: [{ name: 'Livedas Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="vi" className={`${inter.variable} h-full antialiased dark`}>
        <body className="min-h-full bg-slate-950 font-sans antialiased text-slate-100 flex flex-col">
          {children}
        </body>
      </html>
    );
}
