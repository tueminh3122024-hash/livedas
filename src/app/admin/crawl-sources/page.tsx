'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';

interface CrawlSource {
  id: string;
  name: string;
  url: string;
  vertical: 'agriculture' | 'seafood';
  status: 'active' | 'inactive';
  last_crawled_at: string | null;
}

export default function AdminCrawlSourcesPage() {
  const [sources, setSources] = useState<CrawlSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawlingId, setCrawlingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [vertical, setVertical] = useState<'agriculture' | 'seafood'>('agriculture');
  const [message, setMessage] = useState('');

  const fetchSources = async () => {
    setLoading(true);
    try {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from('crawl_sources')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSources(data || []);
    } catch (err) {
      console.error('Error fetching crawl sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    try {
      const sb = getSupabaseBrowser();
      const { error } = await sb
        .from('crawl_sources')
        .insert({ name, url, vertical, status: 'active' });

      if (error) throw error;

      setName('');
      setUrl('');
      fetchSources();
      setMessage('Thêm nguồn liên kết cào dữ liệu thành công!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Error adding crawl source:', err);
      alert('Không thể thêm nguồn cào');
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const sb = getSupabaseBrowser();
      const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await sb
        .from('crawl_sources')
        .update({ status: nextStatus })
        .eq('id', id);
      if (error) throw error;
      fetchSources();
    } catch (err) {
      console.error('Error toggling crawl source status:', err);
    }
  };

  const triggerCrawl = async (source: CrawlSource) => {
    setCrawlingId(source.id);
    setMessage(`Đang kích hoạt cào từ: ${source.name}...`);
    
    try {
      // Gọi thử API mock generate để thay thế hành động cào thật (đóng vai trò giả lập cào dữ liệu)
      const res = await fetch('/api/mock/generate', { method: 'POST' });
      if (!res.ok) throw new Error('Cào dữ liệu thất bại');

      // Cập nhật ngày cào cuối cùng
      const sb = getSupabaseBrowser();
      await sb
        .from('crawl_sources')
        .update({ last_crawled_at: new Date().toISOString() })
        .eq('id', source.id);

      setMessage(`Đã cào & đồng bộ dữ liệu ${source.vertical === 'agriculture' ? 'Nông sản' : 'Thủy sản'} thành công!`);
      fetchSources();
    } catch (err) {
      setMessage('Lỗi cào dữ liệu bên ngoài');
    } finally {
      setCrawlingId(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔗</span>
          <h1 className="font-extrabold text-base text-white">Quản lý liên kết nguồn cào dữ liệu</h1>
        </div>
        <div className="flex gap-3 text-xs">
          <Link href="/admin" className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold transition-colors">
            ⚙️ Quay lại Admin Panel
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col md:flex-row gap-6">
        
        {/* Left Pane: Sources List */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col max-h-[80vh]">
          <h3 className="text-sm font-black text-white mb-6">Nguồn liên kết hiện tại</h3>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              Đang tải nguồn cào...
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-2.5">Nguồn</th>
                    <th className="py-2.5">URL liên kết</th>
                    <th className="py-2.5">Ngành dọc</th>
                    <th className="py-2.5">Cào cuối cùng</th>
                    <th className="py-2.5 text-center">Trạng Thái</th>
                    <th className="py-2.5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(s => (
                    <tr key={s.id} className="border-b border-slate-800/40 hover:bg-slate-950/20 text-slate-300">
                      <td className="py-2.5 font-extrabold text-white">{s.name}</td>
                      <td className="py-2.5 font-mono text-[10px] text-slate-500 max-w-xs truncate">{s.url}</td>
                      <td className="py-2.5 font-bold uppercase text-[9px] text-slate-400">
                        {s.vertical === 'agriculture' ? '🌾 Nông Sản' : '🐟 Thủy Sản'}
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {s.last_crawled_at 
                          ? new Date(s.last_crawled_at).toLocaleTimeString('vi-VN') + ' ' + new Date(s.last_crawled_at).toLocaleDateString('vi-VN')
                          : 'Chưa từng cào'}
                      </td>
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => toggleStatus(s.id, s.status)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'active' 
                              ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
                              : 'bg-rose-950/40 border border-rose-500/20 text-rose-400'
                          }`}
                        >
                          {s.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
                        </button>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => triggerCrawl(s)}
                          disabled={crawlingId !== null || s.status !== 'active'}
                          className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 text-[10px] font-extrabold rounded"
                        >
                          {crawlingId === s.id ? 'Đang cào...' : 'Kích hoạt cào'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Right Pane: Add Form */}
        <div className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit animate-fadeIn">
          <h3 className="text-sm font-black text-white mb-4">Thêm nguồn cào mới</h3>

          <form onSubmit={handleAddSource} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Tên Nguồn Báo Cáo</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Chợ Bình Điền, FB Group..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">URL Liên Kết</label>
              <input
                type="url"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/tin-gia"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Ngành hàng</label>
              <select
                value={vertical}
                onChange={e => setVertical(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="agriculture">🌾 Nông Sản sỉ</option>
                <option value="seafood">🐟 Thủy Hải Sản sỉ</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-950/20"
            >
              Thêm Nguồn Cào
            </button>
          </form>
        </div>

      </main>

      {/* Toast Notification message */}
      {message && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-slate-200 text-xs px-4 py-3 rounded-xl shadow-lg z-50 animate-bounce">
          {message}
        </div>
      )}

    </div>
  );
}
