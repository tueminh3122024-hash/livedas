'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PriceBox from '@/components/PriceBox';
import SellerModal from '@/components/SellerModal';
import { ProductWithPrice, CurrentPrice } from '@/lib/types';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function GiaSiPage() {
  // Trạng thái ngành hàng chính: agriculture (Nông sản) | seafood (Thủy hải sản)
  const [vertical, setVertical] = useState<'agriculture' | 'seafood'>('agriculture');
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Trạng thái tìm kiếm & bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'change_desc'>('name');

  // Trạng thái modal kết nối nhà vườn
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Reset bộ lọc mỗi khi đổi ngành hàng
  useEffect(() => {
    setSelectedCategory('all');
    setSelectedRegion('all');
    setSearchTerm('');
  }, [vertical]);

  // Fetch dữ liệu từ API route theo vertical
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prices?vertical=${vertical}`);
      if (!res.ok) throw new Error('Không thể kết nối API lấy giá sỉ');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [vertical]);

  // Lắng nghe thay đổi Realtime từ Supabase Local
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    
    // Subscribe kênh cập nhật realtime của bảng current_prices
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // UPDATE, INSERT, DELETE
          schema: 'public',
          table: 'current_prices'
        },
        (payload: any) => {
          console.log('Nhận thông báo cập nhật giá realtime:', payload);
          const newPrice = payload.new as CurrentPrice;
          
          // Cập nhật state cục bộ để giao diện đổi màu flash
          setProducts(prevProducts => 
            prevProducts.map(p => 
              p.id === newPrice.product_id 
                ? { ...p, current_price: newPrice } 
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Lọc và sắp xếp sản phẩm
  const filteredProducts = products
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.name_en && p.name_en.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchRegion = selectedRegion === 'all' || p.primary_region === selectedRegion;
      return matchSearch && matchCat && matchRegion;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      
      const priceA = a.current_price?.price_avg || 0;
      const priceB = b.current_price?.price_avg || 0;
      
      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      
      const changeA = a.current_price?.change_24h || 0;
      const changeB = b.current_price?.change_24h || 0;
      if (sortBy === 'change_desc') return Math.abs(changeB) - Math.abs(changeA);
      
      return 0;
    });

  // Tùy chọn bộ lọc tương ứng theo từng ngành hàng
  const categories = vertical === 'agriculture'
    ? ['fruit', 'coffee', 'vegetable', 'spice', 'other']
    : ['seafood', 'other'];

  const regions = vertical === 'agriculture'
    ? ['Miền Tây', 'Tây Nguyên', 'Miền Nam', 'Bến Tre', 'Miền Bắc']
    : ['Miền Tây', 'Cà Mau', 'Bến Tre', 'Sóc Trăng', 'Kiên Giang', 'Trà Vinh', 'An Giang', 'Bạc Liêu'];

  // Theme màu sắc động
  const isAgri = vertical === 'agriculture';
  const selectionClass = isAgri ? 'selection:bg-emerald-500' : 'selection:bg-cyan-500';
  const tagClass = isAgri 
    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-900/40' 
    : 'text-cyan-400 bg-cyan-950/60 border-cyan-900/40';
  const bannerBg = isAgri 
    ? 'from-emerald-950/40 via-teal-950/20 to-slate-950 border-emerald-900/30' 
    : 'from-blue-950/40 via-cyan-950/20 to-slate-950 border-cyan-900/30';
  const textAccent = isAgri ? 'text-emerald-400' : 'text-cyan-400';
  const borderFocus = isAgri ? 'focus:border-emerald-500' : 'focus:border-cyan-500';
  const spinnerBorder = isAgri ? 'border-emerald-500' : 'border-cyan-500';
  const emptyIcon = isAgri ? '🌾' : '🐟';
  const emptyTitle = isAgri ? 'Chưa có dữ liệu nông sản' : 'Chưa có dữ liệu thủy hải sản';
  const seedBtnBg = isAgri 
    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/20' 
    : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/20';

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${selectionClass}`}>
      
      {/* Header */}
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 md:px-8 flex flex-col animate-fadeIn">
        
        {/* THANH CHUYỂN NGÀNH HÀNG (VERTICAL TAB SELECTOR) */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-900/50 border border-slate-900 rounded-2xl self-start">
          <button
            onClick={() => setVertical('agriculture')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 ${
              isAgri 
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/45' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🌾 Nông Sản Sỉ
          </button>
          <button
            onClick={() => setVertical('seafood')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 ${
              !isAgri 
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/45' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🐟 Thủy Hải Sản Sỉ
          </button>
        </div>

        {/* Banner giới thiệu động theo theme */}
        <div className={`mb-8 p-6 rounded-3xl bg-gradient-to-r ${bannerBg} border`}>
          <div className="max-w-2xl">
            <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border ${tagClass}`}>
              Cập Nhật Liên Tục 15 Phút
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-3 mb-2">
              {isAgri ? 'Sàn Tra Cứu Giá Sỉ Nông Sản Realtime' : 'Sàn Tra Cứu Giá Sỉ Thủy Hải Sản Realtime'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {isAgri 
                ? 'Tổng hợp báo giá từ hệ thống đa tác tử (Multi-Agent) quét chợ đầu mối, đầu nậu sỉ, và mạng xã hội. Kết nối trực tiếp với nhà vườn qua Zalo & cuộc gọi sỉ.'
                : 'Tổng hợp báo giá từ các vựa thu mua lớn, đầm nuôi hải sản nuôi trồng và hợp tác xã thủy sản sông/biển Tây Nam Bộ. Kết nối trực tiếp qua Zalo/Điện thoại.'}
            </p>
          </div>
        </div>

        {/* Bộ lọc và tìm kiếm */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-900/30 border border-slate-900 rounded-2xl">
          
          {/* Ô Tìm kiếm */}
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder={isAgri ? 'Tìm kiếm sầu riêng, cà phê...' : 'Tìm kiếm tôm sú, cua biển, cá tra...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl focus:outline-none ${borderFocus} text-slate-200 placeholder-slate-600 transition-colors`}
            />
          </div>

          {/* Các nút dropdown lọc */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Lọc danh mục */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className={`px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none ${borderFocus}`}
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
              ))}
            </select>

            {/* Lọc vùng miền */}
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className={`px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none ${borderFocus}`}
            >
              <option value="all">Tất cả vùng miền</option>
              {regions.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>

            {/* Sắp xếp */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className={`px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none ${borderFocus}`}
            >
              <option value="name">Tên (A-Z)</option>
              <option value="price_asc">Giá sỉ tăng dần</option>
              <option value="price_desc">Giá sỉ giảm dần</option>
              <option value="change_desc">Biến động mạnh nhất</option>
            </select>

          </div>
        </div>

        {/* Trạng thái Loading / Error / Empty Grid */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <span className={`w-10 h-10 border-4 ${spinnerBorder} border-t-transparent rounded-full animate-spin`} />
            <p className="text-sm">Đang đồng bộ dữ liệu bảng giá...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <span className="text-3xl mb-2">⚠️</span>
            <h3 className="text-base font-bold text-white mb-1">Mất kết nối Supabase Local</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Hãy kiểm tra xem docker container đã khởi chạy hoàn tất chưa bằng cách kiểm tra nút trạng thái ở Header.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl animate-fadeIn">
            <span className="text-4xl mb-3 select-none">{emptyIcon}</span>
            <h3 className="text-sm font-bold text-slate-300 mb-1">{emptyTitle}</h3>
            <p className="text-xs text-slate-500 max-w-xs mb-4">
              Nhấp vào nút nạp dữ liệu giả lập phía dưới để kích hoạt nhanh bảng giá ngành hàng này.
            </p>
            <button
              onClick={async () => {
                setLoading(true);
                await fetch('/api/mock/generate', { method: 'POST' });
                fetchProducts();
              }}
              className={`px-4 py-2 rounded-xl ${seedBtnBg} text-slate-950 text-xs font-bold transition-all shadow-lg`}
            >
              ⚡ Tạo Nhanh Dữ Liệu
            </button>
          </div>
        ) : (
          /* Responsive Price Grid */
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 animate-fadeIn">
            {filteredProducts.map(prod => (
              <PriceBox
                key={prod.id}
                product={prod}
                onClick={id => setSelectedProductId(id)}
              />
            ))}
          </div>
        )}

      </main>

      {/* Modal kết nối nhà vườn */}
      {selectedProductId && (
        <SellerModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-600">
        <p>© 2026 Livedas Marketplace • Bản thử nghiệm cục bộ Local Dev Mode</p>
      </footer>

    </div>
  );
}
