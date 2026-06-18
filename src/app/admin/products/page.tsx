'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { Product } from '@/lib/types';
import Link from 'next/link';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [vertical, setVertical] = useState<'agriculture' | 'seafood'>('agriculture');
  
  // Trạng thái Form thêm/sửa
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmoji, setFormEmoji] = useState('');
  const [formCategory, setFormCategory] = useState('fruit');
  const [formUnit, setFormUnit] = useState('kg');
  const [formRegion, setFormRegion] = useState('');
  const [formMinPrice, setFormMinPrice] = useState(10000);
  const [formMaxPrice, setFormMaxPrice] = useState(30000);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from('products')
        .select('*')
        .eq('vertical', vertical)
        .order('id');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [vertical]);

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setFormId(p.id);
    setFormName(p.name);
    setFormEmoji(p.emoji || '');
    setFormCategory(p.category);
    setFormUnit(p.unit);
    setFormRegion(p.primary_region);
    setFormMinPrice(p.price_range_min);
    setFormMaxPrice(p.price_range_max);
  };

  const handleCreateClick = () => {
    setEditingProduct({ id: '' }); // Mark as new
    setFormId(`SP${String(products.length + 21).padStart(3, '0')}`); // Auto suggest ID
    setFormName('');
    setFormEmoji('🌾');
    setFormCategory(vertical === 'agriculture' ? 'fruit' : 'seafood');
    setFormUnit('kg');
    setFormRegion('Miền Tây');
    setFormMinPrice(10000);
    setFormMaxPrice(30000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabaseBrowser();

    const payload = {
      id: formId,
      name: formName,
      emoji: formEmoji,
      category: formCategory,
      unit: formUnit,
      primary_region: formRegion,
      price_range_min: formMinPrice,
      price_range_max: formMaxPrice,
      vertical,
      active: true
    };

    try {
      let error = null;
      if (editingProduct?.id) {
        // Update
        const { error: err } = await sb
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);
        error = err;
      } else {
        // Insert
        const { error: err } = await sb
          .from('products')
          .insert(payload);
        error = err;
      }

      if (error) throw error;

      // Reset
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Không thể lưu thông tin sản phẩm sỉ');
    }
  };

  const toggleActive = async (id: string, activeState: boolean) => {
    try {
      const sb = getSupabaseBrowser();
      const { error } = await sb
        .from('products')
        .update({ active: !activeState })
        .eq('id', id);
      if (error) throw error;
      fetchProducts();
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">📦</span>
          <h1 className="font-extrabold text-base text-white">Quản lý danh mục sản phẩm</h1>
        </div>
        <div className="flex gap-3 text-xs">
          <Link href="/admin" className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold transition-colors">
            ⚙️ Quay lại Admin Panel
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col md:flex-row gap-6">
        
        {/* Left pane: Products list */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col max-h-[80vh]">
          
          {/* Vertical Toggle Tab */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                onClick={() => setVertical('agriculture')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${vertical === 'agriculture' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
              >
                🌾 Nông Sản
              </button>
              <button
                onClick={() => setVertical('seafood')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${vertical === 'seafood' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}
              >
                🐟 Thủy Sản
              </button>
            </div>

            <button
              onClick={handleCreateClick}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold rounded-lg transition-colors"
            >
              ＋ Thêm Sản Phẩm
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              Đang tải danh mục...
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-2.5">ID</th>
                    <th className="py-2.5">Sản Phẩm</th>
                    <th className="py-2.5">Loại</th>
                    <th className="py-2.5">Đơn Vị</th>
                    <th className="py-2.5">Giá Sàn/Trần</th>
                    <th className="py-2.5 text-center">Trạng Thái</th>
                    <th className="py-2.5 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className="border-b border-slate-800/40 hover:bg-slate-950/20 text-slate-300">
                      <td className="py-2.5 font-mono font-bold text-slate-400">{p.id}</td>
                      <td className="py-2.5 flex items-center gap-1.5 font-extrabold text-white">
                        <span>{p.emoji}</span>
                        <span>{p.name}</span>
                      </td>
                      <td className="py-2.5 uppercase font-semibold text-[10px] text-slate-500">{p.category}</td>
                      <td className="py-2.5">{p.unit}</td>
                      <td className="py-2.5 font-semibold text-slate-400">
                        {p.price_range_min.toLocaleString('vi-VN')} - {p.price_range_max.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => toggleActive(p.id, p.active)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.active 
                              ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
                              : 'bg-rose-950/40 border border-rose-500/20 text-rose-400'
                          }`}
                        >
                          {p.active ? 'Hoạt Động' : 'Ẩn'}
                        </button>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded"
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Right pane: CRUD Editor form */}
        {editingProduct && (
          <div className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit animate-fadeIn">
            <h3 className="text-sm font-black text-white mb-4">
              {editingProduct.id ? `Chỉnh sửa: ${editingProduct.name}` : 'Thêm sản phẩm mới'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Mã Sản Phẩm (ID)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingProduct.id}
                  value={formId}
                  onChange={e => setFormId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Tên Sản Phẩm</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Emoji Icon</label>
                  <input
                    type="text"
                    required
                    value={formEmoji}
                    onChange={e => setFormEmoji(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Đơn vị sỉ</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Danh mục sỉ</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300"
                >
                  {vertical === 'agriculture' ? (
                    <>
                      <option value="fruit">Trái cây (Fruit)</option>
                      <option value="coffee">Cà phê (Coffee)</option>
                      <option value="vegetable">Rau củ (Vegetable)</option>
                      <option value="spice">Gia vị (Spice)</option>
                      <option value="other">Khác</option>
                    </>
                  ) : (
                    <>
                      <option value="seafood">Hải sản (Seafood)</option>
                      <option value="other">Khác</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Vùng chuyên canh chính</label>
                <input
                  type="text"
                  required
                  value={formRegion}
                  onChange={e => setFormRegion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Giá sàn sỉ (VND)</label>
                  <input
                    type="number"
                    required
                    value={formMinPrice}
                    onChange={e => setFormMinPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Giá trần sỉ (VND)</label>
                  <input
                    type="number"
                    required
                    value={formMaxPrice}
                    onChange={e => setFormMaxPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition-colors"
                >
                  Lưu Lại
                </button>
              </div>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
