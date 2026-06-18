'use client';

import { useEffect, useState, useRef } from 'react';
import { ProductWithPrice } from '@/lib/types';

interface PriceBoxProps {
  product: ProductWithPrice;
  onClick: (productId: string) => void;
}

export default function PriceBox({ product, onClick }: PriceBoxProps) {
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [flashType, setFlashType] = useState<'up' | 'down' | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentPrice = product.current_price?.price_avg || 0;

  // Lắng nghe sự thay đổi giá để kích hoạt hiệu ứng flash
  useEffect(() => {
    if (prevPrice !== null && currentPrice !== prevPrice) {
      if (currentPrice > prevPrice) {
        setFlashType('up');
      } else if (currentPrice < prevPrice) {
        setFlashType('down');
      }

      // Tắt flash sau 2 giây
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setFlashType(null);
      }, 2000);
    }
    setPrevPrice(currentPrice);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentPrice, prevPrice]);

  const priceMin = product.current_price?.price_min || product.price_range_min;
  const priceMax = product.current_price?.price_max || product.price_range_max;
  const change24h = product.current_price?.change_24h || 0;
  const trend = product.current_price?.trend_direction || 'stable';
  const activeSellers = product.current_price?.active_sellers || 0;

  // Quyết định màu sắc nền tương ứng với hiệu ứng flash
  let borderClass = 'border-slate-900 bg-slate-950/60';
  if (flashType === 'up') {
    borderClass = 'border-rose-500 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
  } else if (flashType === 'down') {
    borderClass = 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
  }

  const isSeafood = product.vertical === 'seafood';
  const textAccent = isSeafood ? 'text-cyan-400' : 'text-emerald-400';
  const hoverTextAccent = isSeafood ? 'group-hover:text-cyan-400' : 'group-hover:text-emerald-400';
  const btnAccent = isSeafood 
    ? 'text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 group-hover:border-cyan-500'
    : 'text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 group-hover:border-emerald-500';

  return (
    <div
      onClick={() => onClick(product.id)}
      className={`relative rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-col justify-between items-stretch gap-3 sm:gap-0 cursor-pointer transition-all duration-300 hover:border-slate-800 hover:-translate-y-0.5 group ${borderClass}`}
    >
      <div className="flex flex-row sm:flex-col justify-between items-center sm:items-stretch gap-4 sm:gap-0">
        
        {/* LEFT SECTION: Icon + Product Details */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-xl sm:text-2xl select-none flex-shrink-0">
            {product.emoji || '🌾'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
              <h3 className={`font-extrabold text-sm sm:text-base text-slate-100 ${hoverTextAccent} transition-colors truncate`}>
                {product.name}
              </h3>
              <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded-full border border-slate-900">
                {product.category}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              📍 {product.primary_region} <span className="sm:hidden text-slate-600">• {product.category.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* MIDDLE SECTION: Price Display (Stacked vertically) */}
        <div className="flex flex-col items-end sm:items-stretch justify-center gap-0.5 sm:my-3">
          <div className="flex items-baseline justify-end sm:justify-start gap-0.5 sm:gap-1">
            <span className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {currentPrice > 0 ? currentPrice.toLocaleString('vi-VN') : '---'}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400">đ/{product.unit}</span>
          </div>
          
          {/* Price Range */}
          <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 flex gap-1.5 justify-end sm:justify-between font-mono">
            <span className="hidden sm:inline">Sàn: {priceMin.toLocaleString('vi-VN')}đ</span>
            <span className="sm:hidden">{priceMin.toLocaleString('vi-VN')}đ</span>
            <span>-</span>
            <span className="hidden sm:inline">Trần: {priceMax.toLocaleString('vi-VN')}đ</span>
            <span className="sm:hidden">{priceMax.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>

      </div>

      {/* RIGHT SECTION: Sellers Count, Trend Indicator & CTAs */}
      <div className="flex flex-row items-center justify-between gap-2 sm:border-t sm:border-slate-900/60 sm:pt-3 sm:mt-auto">
        {/* Trend & Sellers */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-1.5 flex-row sm:flex-col">
          {change24h !== 0 && (
            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
              change24h > 0 ? 'text-rose-400 bg-rose-950/30' : 'text-emerald-400 bg-emerald-950/30'
            }`}>
              {change24h > 0 ? '▲' : '▼'} {Math.abs(change24h)}%
            </span>
          )}
          <div className="text-slate-400 font-medium text-[10px] sm:text-[11px] whitespace-nowrap">
            👥 <span className="font-bold text-slate-200">{activeSellers}</span> <span className="hidden sm:inline">nhà vườn</span><span className="sm:hidden">vựa</span>
          </div>
        </div>

        {/* Action Button */}
        <button className={`px-3 py-1 sm:px-3 sm:py-1 rounded-lg bg-slate-900 border border-slate-800 font-extrabold text-[10px] sm:text-xs transition-all duration-200 ${btnAccent}`}>
          Kết nối
        </button>
      </div>

      {/* Hiệu ứng flash viền nhấp nháy */}
      {flashType && (
        <span className={`absolute top-0 right-0 w-3 h-3 rounded-full m-3 animate-ping ${
          flashType === 'up' ? 'bg-rose-500' : 'bg-emerald-500'
        }`} />
      )}
    </div>
  );
}
