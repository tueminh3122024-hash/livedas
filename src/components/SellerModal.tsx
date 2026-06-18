'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Seller, ProductWithPrice } from '@/lib/types';
import CallInterface from './CallInterface';

interface SellerModalProps {
  productId: string | null;
  onClose: () => void;
}

export default function SellerModal({ productId, onClose }: SellerModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductWithPrice | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [activeTab, setActiveTab] = useState<'sellers' | 'history'>('sellers');
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  // Trạng thái đánh giá người bán
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');

  // Trạng thái cuộc gọi Live WebRTC
  const [activeCallRoom, setActiveCallRoom] = useState<string | null>(null);
  const [activeCallLogId, setActiveCallLogId] = useState<string | null>(null);

  // Trạng thái đơn sỉ ký quỹ Escrow
  const [escrowSeller, setEscrowSeller] = useState<Seller | null>(null);
  const [escrowQty, setEscrowQty] = useState<number>(100);
  const [escrowDepositPct, setEscrowDepositPct] = useState<number>(30);
  const [escrowAddress, setEscrowAddress] = useState<string>('Cần Thơ, Việt Nam');
  const [escrowPhone, setEscrowPhone] = useState<string>('0909123456');
  const [submittingEscrow, setSubmittingEscrow] = useState<boolean>(false);
  const [escrowError, setEscrowError] = useState<string>('');
  const [escrowSuccess, setEscrowSuccess] = useState<string>('');

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`/api/prices/${productId}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data.product);
        setSellers(data.sellers);
        setRecentEntries(data.recentEntries);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching product sellers:', err);
        setLoading(false);
      });
  }, [productId]);

  const handleEscrowBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escrowSeller || !product) return;
    setSubmittingEscrow(true);
    setEscrowError('');
    setEscrowSuccess('');

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: escrowSeller.listing_id,
          quantity: escrowQty,
          depositPercentage: escrowDepositPct,
          deliveryAddress: escrowAddress,
          buyerPhone: escrowPhone,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEscrowSuccess('Chốt đơn mua sỉ ký quỹ thành công! Đang chuyển hướng...');
        setTimeout(() => {
          setEscrowSeller(null);
          onClose(); // Đóng modal hiện tại
          router.push('/buyer/orders');
        }, 1500);
      } else {
        setEscrowError(data.error || 'Lỗi chốt đơn mua sỉ.');
      }
    } catch (err) {
      setEscrowError('Lỗi kết nối máy chủ.');
    } finally {
      setSubmittingEscrow(false);
    }
  };

  const handleContact = async (seller: Seller, method: 'zalo' | 'phone' | 'webrtc') => {
    // Lưu thông tin seller vừa liên hệ để hiển thị panel đánh giá
    setSelectedSeller(seller);
    setRatingMessage('');

    if (method === 'webrtc') {
      try {
        const res = await fetch('/api/calls/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sellerId: seller.id,
            productId: product?.id,
            contactMethod: 'webrtc',
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setActiveCallRoom(data.roomUrl);
          setActiveCallLogId(data.callLogId);
        } else {
          alert('Không thể tạo phòng gọi WebRTC: ' + data.error);
        }
      } catch (err) {
        console.error('Error creating WebRTC call:', err);
        alert('Lỗi tạo phòng gọi sỉ');
      }
    } else if (method === 'zalo') {
      const zaloUrl = `https://zalo.me/${seller.phone}`;
      window.open(zaloUrl, '_blank');
    } else {
      window.open(`tel:${seller.phone}`, '_self');
    }
  };

  const submitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller || !product) return;

    setSubmittingRating(true);
    setRatingMessage('');

    try {
      const res = await fetch(`/api/sellers/${selectedSeller.id}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: ratingVal,
          product_id: product.id,
          contact_method: 'zalo',
          notes: 'Đánh giá chất lượng phục vụ sau cuộc gọi sỉ'
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setRatingMessage('Cảm ơn bạn đã đóng góp đánh giá!');
        
        // Cập nhật rating trực tiếp ở UI
        if (sellers) {
          setSellers(sellers.map(s => 
            s.id === selectedSeller.id 
              ? { ...s, rating: data.newRating, total_transactions: data.total_transactions } 
              : s
          ));
        }

        // Tự động đóng panel đánh giá sau 1.5s
        setTimeout(() => {
          setSelectedSeller(null);
        }, 1500);
      } else {
        setRatingMessage(`Lỗi: ${data.error}`);
      }
    } catch (err) {
      setRatingMessage('Không thể kết nối API đánh giá');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (!productId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80">
          {product ? (
            <div className="flex items-center gap-2">
              <span className="text-3xl select-none">{product.emoji}</span>
              <div>
                <h2 className="text-lg font-black text-white">{product.name}</h2>
                <p className="text-xs text-slate-400">Danh mục: {product.category.toUpperCase()} • Vùng chính: {product.primary_region}</p>
              </div>
            </div>
          ) : (
            <div className="h-10 w-48 bg-slate-800 rounded animate-pulse" />
          )}
          
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors text-lg font-bold">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3 text-slate-400">
            <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Đang tải dữ liệu nhà vườn sỉ...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            
            {/* Post-Call Rating Panel overlay inside modal */}
            {selectedSeller && (
              <div className="mb-6 bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-amber-400">📝 Đánh giá cuộc gọi</h3>
                  <button onClick={() => setSelectedSeller(null)} className="text-xs text-slate-500 hover:text-white">✕ Bỏ qua</button>
                </div>
                
                <p className="text-xs text-slate-300 mb-4">
                  Bạn đang liên hệ với <span className="font-extrabold text-white">{selectedSeller.name}</span> để hỏi mua sỉ <span className="font-bold text-emerald-400">{product?.name}</span>. Hãy để lại đánh giá chất lượng phục vụ sau cuộc gọi nhé!
                </p>

                <form onSubmit={submitRating} className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingVal(star)}
                        className={`text-xl transition-all duration-100 ${star <= ratingVal ? 'text-amber-400' : 'text-slate-700 hover:text-amber-500'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingRating}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all"
                  >
                    {submittingRating ? 'Đang gửi...' : 'Gửi Đánh Giá'}
                  </button>

                  {ratingMessage && (
                    <span className="text-xs font-semibold text-emerald-400 ml-auto">{ratingMessage}</span>
                  )}
                </form>
              </div>
            )}

            {/* Escrow Buy Form Panel */}
            {escrowSeller && (
              <div className="fixed inset-0 sm:absolute sm:inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 sm:bg-slate-950/90 backdrop-blur-sm p-0 sm:p-5 animate-fadeIn">
                <div className="w-full sm:max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-5 flex flex-col max-h-[90vh] sm:max-h-none overflow-y-auto animate-slideUp sm:animate-scaleIn">
                  
                  {/* Mobile Drag Handle */}
                  <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider">📦 Đặt Mua Sỉ Ký Quỹ (Escrow)</h3>
                    <button type="button" onClick={() => setEscrowSeller(null)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors text-xs font-bold">
                      ✕
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-4">
                    Bạn đang chốt mua sỉ sản phẩm <span className="font-bold text-white">{product?.name}</span> trực tiếp từ vựa/nhà vườn <span className="font-bold text-cyan-400">{escrowSeller.name}</span>. Lượng ký quỹ đặt cọc này sẽ được sàn giữ trung gian bảo chứng.
                  </p>

                  {escrowError && <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-xl mb-4 border border-rose-500/20">{escrowError}</p>}
                  {escrowSuccess && <p className="text-xs text-emerald-400 bg-emerald-950/40 p-2 rounded-xl mb-4 border border-emerald-500/20">{escrowSuccess}</p>}

                  <form onSubmit={handleEscrowBuy} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Số lượng mua (kg)</label>
                        <input
                          type="number"
                          value={escrowQty}
                          onChange={e => setEscrowQty(parseInt(e.target.value, 10) || 0)}
                          min={escrowSeller.min_quantity_kg || 100}
                          max={escrowSeller.total_available_kg || 10000}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                        />
                        <span className="text-[9px] text-slate-500 block mt-1">
                          MOQ từ {escrowSeller.min_quantity_kg}kg đến {escrowSeller.total_available_kg}kg
                        </span>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Tỷ lệ đặt cọc (%)</label>
                        <select
                          value={escrowDepositPct}
                          onChange={e => setEscrowDepositPct(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                        >
                          <option value={30}>30% Giá trị đơn</option>
                          <option value={40}>40% Giá trị đơn</option>
                          <option value={50}>50% Giá trị đơn</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Số điện thoại liên hệ</label>
                        <input
                          type="text"
                          value={escrowPhone}
                          onChange={e => setEscrowPhone(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Địa chỉ nhận hàng sỉ</label>
                        <input
                          type="text"
                          value={escrowAddress}
                          onChange={e => setEscrowAddress(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                        />
                      </div>
                    </div>

                    {/* Price summary */}
                    <div className="p-3 bg-slate-950/80 border border-cyan-500/20 rounded-2xl flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Tổng giá trị sỉ</span>
                        <p className="text-sm font-black text-white">
                          {((escrowQty || 0) * (escrowSeller.price_per_kg || 0)).toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-cyan-400 font-bold uppercase">Tiền cọc ({escrowDepositPct}%)</span>
                        <p className="text-sm font-black text-cyan-400">
                          {Math.round(((escrowQty || 0) * (escrowSeller.price_per_kg || 0) * escrowDepositPct) / 100).toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setEscrowSeller(null)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-center"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        disabled={submittingEscrow}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black shadow-lg shadow-cyan-950/30 text-center"
                      >
                        {submittingEscrow ? 'Đang thanh toán...' : '🔐 Thanh Toán Ký Quỹ'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-800/60 pb-3 mb-5">
              <button
                onClick={() => setActiveTab('sellers')}
                className={`text-sm font-bold pb-1 transition-all ${activeTab === 'sellers' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400'}`}
              >
                Nhà Vườn Chuyên Doanh ({sellers?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`text-sm font-bold pb-1 transition-all ${activeTab === 'history' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400'}`}
              >
                Báo Giá Gần Đây ({recentEntries?.length || 0})
              </button>
            </div>

            {/* Tab: Sellers List */}
            {activeTab === 'sellers' && (
              <div className="space-y-4">
                {sellers && sellers.length > 0 ? (
                  sellers.map(seller => {
                    const priceBaseline = product ? Math.round(product.current_price?.price_avg || 0) : 50000;
                    // Sử dụng giá đăng chào sỉ thật nếu có, ngược lại dùng mock giá lệch nhẹ ±5%
                    const offeredPrice = seller.price_per_kg || Math.round(priceBaseline * (0.95 + (parseInt(seller.id.substring(0,2), 16) % 10) / 100));

                    return (
                      <div key={seller.id} className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-extrabold text-white text-sm">{seller.name}</span>
                            {seller.verified && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                Đã Xác Minh
                              </span>
                            )}
                            <span className={`w-2 h-2 rounded-full ${seller.status === 'online' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                          </div>
                          
                          <div className="text-xs text-slate-400 space-y-1">
                            <p>📍 {seller.province} ({seller.region})</p>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400">★ {parseFloat(String(seller.rating)).toFixed(1)}</span>
                              <span>•</span>
                              <span>{seller.total_transactions} giao dịch</span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Contact Call CTAs */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 border-slate-850/60 pt-3 sm:pt-0 w-full sm:w-auto">
                          <div className="sm:text-right">
                            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Giá Chào Sỉ</span>
                            <span className="text-base sm:text-lg font-black text-emerald-400">{offeredPrice.toLocaleString('vi-VN')}đ/kg</span>
                          </div>
                          
                          <div className="grid grid-cols-4 sm:flex gap-1.5 sm:gap-2 w-auto">
                            <button
                              onClick={() => handleContact(seller, 'zalo')}
                              className="px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-0.5"
                              title="💬 Zalo"
                            >
                              💬 <span className="hidden xs:inline">Zalo</span>
                            </button>
                            <button
                              onClick={() => handleContact(seller, 'phone')}
                              className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-0.5"
                              title="📞 Gọi điện"
                            >
                              📞 <span className="hidden xs:inline">Gọi</span>
                            </button>
                            <button
                              onClick={() => handleContact(seller, 'webrtc')}
                              className="px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-0.5"
                              title="📹 Gọi Live Video"
                            >
                              📹 <span className="hidden xs:inline">Live</span>
                            </button>
                            {seller.listing_id ? (
                              <button
                                onClick={() => {
                                  setEscrowSeller(seller);
                                  setEscrowQty(seller.min_quantity_kg || 100);
                                  setEscrowError('');
                                  setEscrowSuccess('');
                                }}
                                className="px-2 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-[11px] font-black transition-all flex items-center justify-center gap-0.5"
                                title="📦 Chốt sỉ"
                              >
                                📦 <span className="hidden xs:inline">Chốt</span>
                              </button>
                            ) : (
                              <div className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 text-[10px] flex items-center justify-center font-bold">
                                N/A
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-6 text-xs text-slate-500">Chưa có nhà vườn nào cung cấp sản phẩm này.</p>
                )}
              </div>
            )}

            {/* Tab: Price History */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {recentEntries && recentEntries.length > 0 ? (
                  recentEntries.map(entry => (
                    <div key={entry.id} className="p-3.5 bg-slate-950/30 border border-slate-800/40 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-200">{entry.source_name || 'AI Agent'}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(entry.created_at).toLocaleTimeString('vi-VN')} - {new Date(entry.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] max-w-md truncate">{entry.raw_text}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white">{entry.price_avg.toLocaleString('vi-VN')}đ</span>
                        <span className="text-[9px] text-slate-500 block">Độ tin cậy: {entry.confidence * 100}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-xs text-slate-500">Chưa có báo giá lịch sử nào.</p>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {activeCallRoom && (
        <CallInterface
          roomUrl={activeCallRoom}
          sellerName={selectedSeller?.name || 'Nhà vườn'}
          productId={product?.id || ''}
          callLogId={activeCallLogId}
          onClose={async (logId, outcome) => {
            setActiveCallRoom(null);
            setActiveCallLogId(null);
            
            if (logId) {
              try {
                await fetch('/api/calls/update', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    callLogId: logId,
                    outcome: outcome,
                  }),
                });
              } catch (e) {
                console.error('Error updating call log status:', e);
              }
            }
          }}
        />
      )}
    </div>
  );
}
