'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

export default function SellerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
  // Tài chính
  const [wallet, setWallet] = useState<{ balance: number; locked_balance: number }>({ balance: 0, locked_balance: 0 });
  const [topupAmount, setTopupAmount] = useState<string>('5000000');
  
  // Trạng thái nạp tiền Sepay VietQR
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);
  const [depositRequest, setDepositRequest] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [isSyncingPayment, setIsSyncingPayment] = useState<boolean>(false);
  
  // Tin đăng chào sỉ
  const [listings, setListings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [pricePerKg, setPricePerKg] = useState<string>('50000');
  const [minQuantityKg, setMinQuantityKg] = useState<string>('100');
  const [totalAvailableKg, setTotalAvailableKg] = useState<string>('1000');
  const [listingError, setListingError] = useState<string>('');
  const [listingSuccess, setListingSuccess] = useState<string>('');

  // Đơn hàng nhận được
  const [orders, setOrders] = useState<any[]>([]);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<{ [orderId: string]: string }>({});

  useEffect(() => {
    // 1. Kiểm tra xác thực và phân quyền
    fetch('/api/prices')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        if (data.products && data.products.length > 0) {
          setSelectedProductId(data.products[0].id);
        }
      })
      .catch(err => console.error('Error fetching products:', err));

    fetchWallet();
    fetchListings();
    fetchOrders();
    setLoading(false);
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/seller/wallet');
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet);
      } else if (res.status === 401) {
        router.push('/login?redirect=/seller');
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    }
  };

  const fetchListings = async () => {
    try {
      const res = await fetch('/api/seller/listings');
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders/seller');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const handleInitiateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(topupAmount, 10);
    if (isNaN(val) || val <= 0) return;

    try {
      const res = await fetch('/api/payment/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val }),
      });
      if (res.ok) {
        const data = await res.json();
        setDepositRequest(data.request);
        setQrCodeUrl(data.qrUrl);
        setBankAccount(data.bankInfo);
        setShowTopupModal(true);
      }
    } catch (err) {
      console.error('Error creating deposit request:', err);
    }
  };

  const handleSyncPayment = async () => {
    if (!depositRequest) return;
    setIsSyncingPayment(true);

    try {
      const res = await fetch('/api/payment/sepay/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: depositRequest.id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        setShowTopupModal(false);
        setDepositRequest(null);
        fetchWallet();
      } else {
        alert(data.error || 'Chưa tìm thấy giao dịch ngân hàng khớp lệnh. Vui lòng thử lại sau vài giây!');
      }
    } catch (err) {
      console.error('Lỗi khi đồng bộ thanh toán:', err);
    } finally {
      setIsSyncingPayment(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setListingError('');
    setListingSuccess('');

    const price = parseInt(pricePerKg, 10);
    const moq = parseInt(minQuantityKg, 10);
    const total = parseInt(totalAvailableKg, 10);

    if (isNaN(price) || isNaN(moq) || isNaN(total) || price <= 0 || moq <= 0 || total < moq) {
      setListingError('Thông số nhập vào không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    const depositNeeded = price * moq;
    if (wallet.balance < depositNeeded) {
      setListingError(`Số dư ví không đủ. Cần ký quỹ tối thiểu ${depositNeeded.toLocaleString('vi-VN')} đ cho tin đăng này.`);
      return;
    }

    try {
      const res = await fetch('/api/seller/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          pricePerKg: price,
          minQuantityKg: moq,
          totalAvailableKg: total,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setListingSuccess('Đăng tin chào sỉ ký quỹ thành công!');
        setWallet(data.wallet);
        fetchListings();
      } else {
        setListingError(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      setListingError('Lỗi kết nối máy chủ.');
    }
  };

  // Xác nhận đơn hàng ký quỹ (Assign logistics)
  const handleConfirmOrder = async (orderId: string) => {
    const carrier = selectedCarrier[orderId] || 'GHTK';
    setProcessingOrderId(orderId);

    try {
      const res = await fetch('/api/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, carrierName: carrier }),
      });

      if (res.ok) {
        alert('Đơn hàng đã được xác nhận. Vận đơn logistics đã được tạo!');
        fetchOrders();
      } else {
        const data = await res.json();
        alert(`Lỗi xác nhận: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Mô phỏng shipper lấy hàng (Release Escrow)
  const handlePickupSimulation = async (orderId: string) => {
    setProcessingOrderId(orderId);

    try {
      const res = await fetch('/api/logistics/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Shipper đối tác đã lấy hàng thành công!\nSàn đã giải ngân +${parseInt(data.sellerEarnings, 10).toLocaleString('vi-VN')} đ vào ví khả dụng và trả lại cọc đăng tin.`);
        fetchOrders();
        fetchWallet();
        fetchListings();
      } else {
        alert(`Lỗi bốc hàng: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Tính toán tiền cọc tức thời
  const calculatedDeposit = (parseInt(pricePerKg) || 0) * (parseInt(minQuantityKg) || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 gap-3">
        <span className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p>Đang tải trang quản lý nhà vườn...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      
      {/* Header */}
      <Header />

      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CỘT TRÁI: VÍ & ĐĂNG CHÀO SỈ */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Ví Wallet widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">💰 Ví Số Dư Ký Quỹ Livedas</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Khả Dụng</span>
                <span className="text-lg font-black text-emerald-400">{wallet.balance.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Ký Quỹ</span>
                <span className="text-lg font-black text-amber-500">{wallet.locked_balance.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Top-up form */}
            <form onSubmit={handleInitiateDeposit} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Nạp Ví Ký Quỹ Tự Động</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={e => setTopupAmount(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
                    placeholder="Số tiền nạp"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-md"
                  >
                    Nạp VietQR
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Form Đăng tin sỉ */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">📦 Đăng Chào Sỉ Nông - Thủy Sản</h2>
            
            {listingError && <p className="mb-4 text-xs text-rose-400 font-bold bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/20">{listingError}</p>}
            {listingSuccess && <p className="mb-4 text-xs text-emerald-400 font-bold bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">{listingSuccess}</p>}

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Chọn Sản Phẩm</label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.name} ({p.category.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Giá Sỉ Chào (đ/kg)</label>
                  <input
                    type="number"
                    value={pricePerKg}
                    onChange={e => setPricePerKg(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Sản Lượng Tối Thiểu (MOQ kg)</label>
                  <input
                    type="number"
                    value={minQuantityKg}
                    onChange={e => setMinQuantityKg(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Tổng sản lượng sẵn có tại vườn (kg)</label>
                <input
                  type="number"
                  value={totalAvailableKg}
                  onChange={e => setTotalAvailableKg(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              {/* Deposit breakdown block */}
              <div className="p-3.5 bg-slate-950/80 border border-amber-500/20 rounded-2xl">
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block mb-1">🔒 Tiền cọc đăng tin ký quỹ (Sàn giữ)</span>
                <p className="text-xs text-slate-400">Yêu cầu đóng băng số tiền bằng MOQ * Đơn giá để tránh chào bán ảo.</p>
                <p className="text-lg font-black text-amber-400 mt-2">{calculatedDeposit.toLocaleString('vi-VN')} đ</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg"
              >
                🔐 Đăng Tin & Đóng Băng Ký Quỹ
              </button>
            </form>
          </div>

        </div>

        {/* CỘT GIỮA + PHẢI: QUẢN LÝ ĐƠN HÀNG VÀ TIN ĐANG CHÀO SỈ */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PHẦN 1: QUẢN LÝ ĐƠN HÀNG NHẬN ĐƯỢC */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-5">📋 Đơn Hàng Sỉ Nhận Được ({orders.length})</h2>
            
            <div className="space-y-4">
              {orders.length > 0 ? (
                orders.map(o => {
                  const buyerDeposit = parseInt(o.buyer_deposit_amount, 10);
                  const totalAmt = parseInt(o.total_amount, 10);
                  const carrier = selectedCarrier[o.id] || 'GHTK';

                  return (
                    <div key={o.id} className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-4">
                      
                      {/* Left: Info */}
                      <div className="space-y-2.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xl">{o.product_emoji}</span>
                          <span className="font-extrabold text-sm text-white">{o.product_name}</span>
                          <span className="text-[10px] text-slate-500">#{o.id.substring(0, 8).toUpperCase()}</span>
                          
                          {/* Order Badges */}
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                            o.status === 'escrowed' ? 'bg-amber-950/50 text-amber-400 border-amber-500/20' :
                            o.status === 'confirmed' ? 'bg-blue-950/50 text-blue-400 border-blue-500/20' :
                            o.status === 'shipping' ? 'bg-cyan-950/50 text-cyan-400 border-cyan-500/20' :
                            o.status === 'completed' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/20' :
                            'bg-slate-800 text-slate-400 border-slate-700/20'
                          }`}>
                            {o.status === 'escrowed' ? 'Đã Cọc (Escrow)' :
                             o.status === 'confirmed' ? 'Đã Xác Nhận' :
                             o.status === 'shipping' ? 'Đang Giao' :
                             o.status === 'completed' ? 'Hoàn Thành' : o.status}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 space-y-1">
                          <p>👤 Người mua: <span className="text-white font-bold">{o.buyer_name}</span> ({o.buyer_phone})</p>
                          <p>📍 Địa chỉ giao: {o.delivery_address}</p>
                          <p>📦 Số lượng mua: <span className="text-emerald-400 font-bold">{o.quantity_kg} kg</span></p>
                          <p>📅 Ngày lấy hàng dự kiến: {new Date(o.delivery_date).toLocaleDateString('vi-VN')}</p>
                          
                          {o.tracking_number && (
                            <div className="p-2 bg-slate-900 border border-slate-800/80 rounded-xl mt-2 text-[11px] space-y-0.5">
                              <p>🚚 Vận chuyển: <span className="text-slate-300 font-bold">{o.carrier_name}</span></p>
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
                              <p>Trạng thái Logistics: <span className="text-emerald-400 font-bold">{o.shipping_status?.toUpperCase()}</span></p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Escrow price details & Actions */}
                      <div className="flex md:flex-col justify-between items-end md:justify-center gap-3 border-t md:border-t-0 border-slate-800/40 pt-3 md:pt-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Tổng giá trị đơn</span>
                          <span className="text-base font-black text-white">{totalAmt.toLocaleString('vi-VN')}đ</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Đặt cọc {o.deposit_percentage}%: {buyerDeposit.toLocaleString('vi-VN')}đ</span>
                        </div>

                        {/* Order confirmation or logistics actions */}
                        <div className="flex gap-2">
                          {o.status === 'escrowed' && (
                            <div className="flex flex-col gap-1.5 items-end">
                              <div className="flex gap-2">
                                <select
                                  value={carrier}
                                  onChange={e => setSelectedCarrier({ ...selectedCarrier, [o.id]: e.target.value })}
                                  className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300"
                                >
                                  <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                                  <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                                  <option value="ViettelPost">Viettel Post</option>
                                  <option value="LivedasCarrier">Livedas Logistics</option>
                                </select>
                                <button
                                  onClick={() => handleConfirmOrder(o.id)}
                                  disabled={processingOrderId !== null}
                                  className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all"
                                >
                                  Duyệt
                                </button>
                              </div>
                            </div>
                          )}

                          {o.status === 'confirmed' && (
                            <button
                              onClick={() => handlePickupSimulation(o.id)}
                              disabled={processingOrderId !== null}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5"
                            >
                              🚚 Shipper Đến Lấy (Mô phỏng)
                            </button>
                          )}

                          {o.status === 'completed' && (
                            <span className="text-xs text-emerald-400 font-black flex items-center gap-1 bg-emerald-950/20 border border-emerald-500/20 px-2 py-1 rounded-lg">
                              ✓ Đã Tất Toán
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              ) : (
                <div className="py-12 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-xs">
                  <span>📋</span>
                  <p className="mt-1">Hiện chưa có đơn đặt mua sỉ ký quỹ nào từ khách hàng.</p>
                </div>
              )}
            </div>
          </div>

          {/* PHẦN 2: DANH SÁCH TIN CHÀO SỈ ĐÃ ĐĂNG */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-5">📋 Tin Chào Bán Sỉ Đang Hoạt Động ({listings.length})</h2>
            
            <div className="space-y-3">
              {listings.length > 0 ? (
                listings.map(l => (
                  <div key={l.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">{l.product_emoji}</span>
                        <span className="font-extrabold text-sm text-white">{l.product_name}</span>
                        <span className="text-[10px] text-slate-500">#{l.id.substring(0, 6).toUpperCase()}</span>
                      </div>
                      
                      <div className="text-xs text-slate-400 space-y-1">
                        <p>📦 MOQ tối thiểu: <span className="font-bold text-white">{l.min_quantity_kg} kg</span></p>
                        <p>🌾 Sẵn có: <span className="font-bold text-emerald-400">{l.total_available_kg} kg</span></p>
                        <p>🔒 Tiền cọc bảo chứng đang giữ: <span className="text-amber-400 font-semibold">{parseInt(l.deposit_amount).toLocaleString('vi-VN')} đ</span></p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-400">{l.price_per_kg.toLocaleString('vi-VN')}đ/{l.product_unit}</span>
                      <span className="text-[9px] text-slate-500 block mt-1 uppercase tracking-wider font-bold">Trạng thái: {l.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-xs text-slate-500">Bạn chưa đăng tin chào sỉ ký quỹ nào.</p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Sepay top-up modal */}
      {showTopupModal && depositRequest && bankAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 flex flex-col items-center">
            
            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider mb-2">💸 Nạp Tiền Ký Quỹ Tự Động</h3>
            <p className="text-xs text-slate-400 text-center mb-4">
              Vui lòng mở App Ngân hàng quét mã VietQR bên dưới hoặc chuyển khoản chính xác thông tin để được cộng tiền tự động.
            </p>

            {/* QR code block */}
            <div className="p-3 bg-white rounded-2xl mb-4 relative shadow-md">
              <img src={qrCodeUrl} alt="VietQR Sepay" className="w-52 h-52 object-contain" />
              <div className="absolute inset-0 bg-transparent" />
            </div>

            {/* Bank details info list */}
            <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-[11px] space-y-2 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">NGÂN HÀNG:</span>
                <span className="text-white font-extrabold">{bankAccount.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">SỐ TÀI KHOẢN:</span>
                <span className="text-white font-extrabold tracking-wider">{bankAccount.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">CHỦ TÀI KHOẢN:</span>
                <span className="text-white font-extrabold">{bankAccount.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">SỐ TIỀN NẠP:</span>
                <span className="text-emerald-400 font-extrabold text-sm">{depositRequest.amount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl mt-1.5">
                <span className="text-amber-500 font-black">NỘI DUNG CK:</span>
                <span className="text-amber-400 font-black text-sm tracking-widest">{depositRequest.code}</span>
              </div>
            </div>

            {/* Actions button */}
            <div className="w-full flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTopupModal(false);
                  setDepositRequest(null);
                }}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Đóng
              </button>
              
              <button
                type="button"
                onClick={handleSyncPayment}
                disabled={isSyncingPayment}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {isSyncingPayment ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Đang khớp lệnh...
                  </>
                ) : (
                  'Đã Chuyển Tiền ✓'
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
