'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

export default function BuyerOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders/buyer');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else if (res.status === 401) {
        router.push('/login?redirect=/buyer/orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'escrowed': return 1;
      case 'confirmed': return 2;
      case 'shipping': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 gap-3">
        <span className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p>Đang tải lịch sử mua hàng sỉ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      
      {/* Header */}
      <Header />

      <div className="max-w-4xl mx-auto px-4 mt-8">
        
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-6">📦 Lịch sử đơn hàng của tôi ({orders.length})</h2>

        <div className="space-y-6">
          {orders.length > 0 ? (
            orders.map(o => {
              const currentStep = getStatusStep(o.status);
              const totalAmt = parseInt(o.total_amount, 10);
              const depositAmt = parseInt(o.buyer_deposit_amount, 10);

              return (
                <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                  
                  {/* Top section: Product & total price info */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{o.product_emoji}</span>
                      <div>
                        <span className="font-extrabold text-sm text-white block">{o.product_name}</span>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">Mã đơn: #{o.id.substring(0, 8).toUpperCase()}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-sm text-slate-400 block">Tổng thanh toán: <span className="text-base font-black text-white">{totalAmt.toLocaleString('vi-VN')} đ</span></span>
                      <span className="text-[11px] text-cyan-400 font-semibold block mt-0.5">Tiền đã cọc ({o.deposit_percentage}%): {depositAmt.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>

                  {/* Step indicators */}
                  {o.status !== 'cancelled' && (
                    <div className="py-2">
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase mb-2">
                        <span className={currentStep >= 1 ? 'text-cyan-400' : ''}>1. Đã cọc</span>
                        <span className={currentStep >= 2 ? 'text-cyan-400' : ''}>2. Vựa sỉ duyệt</span>
                        <span className={currentStep >= 3 ? 'text-cyan-400' : ''}>3. Đang giao</span>
                        <span className={currentStep >= 4 ? 'text-emerald-400' : ''}>4. Hoàn thành</span>
                      </div>
                      
                      {/* Visual progress bar */}
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            currentStep === 4 ? 'bg-gradient-to-r from-cyan-500 to-emerald-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${(currentStep / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Body: Delivery and logistics info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                    <div className="space-y-1">
                      <p>🌾 Vựa sỉ / Nhà vườn: <span className="text-white font-bold">{o.seller_name}</span></p>
                      <p>📦 Số lượng chốt sỉ: <span className="text-white font-bold">{o.quantity_kg} kg</span></p>
                      <p>📍 Địa chỉ nhận hàng: {o.delivery_address}</p>
                      <p>📅 Ngày lấy hàng dự kiến: {new Date(o.delivery_date).toLocaleDateString('vi-VN')}</p>
                    </div>

                    <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex flex-col justify-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">🚚 Thông Tin Vận Chuyển</span>
                      {o.tracking_number ? (
                        <div className="space-y-0.5 text-[11px]">
                          <p>Hãng vận tải: <span className="text-white font-bold">{o.carrier_name}</span></p>
                          <p>
                            Mã vận đơn:{' '}
                            <Link
                              href={`/tracking/${o.tracking_number}`}
                              className="text-cyan-400 font-bold hover:underline hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                            >
                              {o.tracking_number} 🚚 <span className="text-[9px] bg-cyan-950 px-1 py-0.5 rounded font-mono border border-cyan-500/20">LIVE</span>
                            </Link>
                          </p>
                          <p>Phí ship: {parseInt(o.shipping_fee).toLocaleString('vi-VN')} đ</p>
                          <p>Trạng thái giao: <span className="text-emerald-400 font-bold">{o.shipping_status?.toUpperCase()}</span></p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-600">Đơn hàng đang chờ nhà vườn kiểm kho và bàn giao logistics...</p>
                      )}
                    </div>
                  </div>

                  {/* Buyer action to release escrow */}
                  {(o.status === 'confirmed' || o.status === 'shipping') && (
                    <div className="flex justify-end pt-2.5 border-t border-slate-800/40">
                      <button
                        onClick={async () => {
                          if (confirm('Xác nhận bạn đã nhận đủ hàng sỉ và đồng ý giải ngân tiền cọc ký quỹ cho người bán?')) {
                            try {
                              const res = await fetch('/api/logistics/mock', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ orderId: o.id }),
                              });
                              if (res.ok) {
                                alert('Giải ngân thành công! Đơn hàng đã hoàn tất tất toán.');
                                fetchOrders();
                              } else {
                                const errData = await res.json();
                                alert('Lỗi: ' + errData.error);
                              }
                            } catch (e) {
                              alert('Lỗi kết nối máy chủ.');
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs transition-all shadow-md"
                      >
                        ✔️ Xác Nhận Đã Nhận Hàng & Tất Toán
                      </button>
                    </div>
                  )}

                  {o.status === 'completed' && (
                    <div className="flex justify-end pt-2.5 border-t border-slate-800/40">
                      <span className="text-xs text-emerald-400 font-black flex items-center gap-1 bg-emerald-950/20 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                        ✓ Đơn Hàng Đã Tất Toán Hoàn Tất
                      </span>
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="py-16 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500 text-xs">
              <span>🛒</span>
              <p className="mt-1">Bro chưa chốt mua sỉ ký quỹ đơn hàng nào.</p>
              <button
                onClick={() => router.push('/gia-si')}
                className="mt-4 px-4 py-1.5 rounded-full bg-cyan-500 text-slate-950 font-black"
              >
                Đi Chốt Hàng Sỉ Ngay
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
