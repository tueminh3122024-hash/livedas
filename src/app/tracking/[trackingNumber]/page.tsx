'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DispatchInfo {
  id: string;
  order_id: string;
  carrier_name: string;
  tracking_number: string;
  shipping_fee: number;
  status: string;
  rider_name: string;
  rider_phone: string;
  estimated_delivery_time: string;
  current_location_name: string;
  current_latitude: number;
  current_longitude: number;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  delivery_address: string;
  buyer_phone: string;
  total_amount: number;
  quantity_kg: number;
  order_status: string;
  product_name: string;
  product_emoji: string;
  product_unit: string;
  seller_name: string;
  buyer_name: string;
}

interface TrackingLog {
  id: string;
  status: string;
  location_name: string;
  latitude: number;
  longitude: number;
  notes: string;
  created_at: string;
}

export default function TrackingPage({ params }: { params: { trackingNumber: string } }) {
  const [dispatch, setDispatch] = useState<DispatchInfo | null>(null);
  const [logs, setLogs] = useState<TrackingLog[]>([]);
  const [viewer, setViewer] = useState<{ role: string; isOwner: boolean }>({ role: 'public', isOwner: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState(false);

  const trackingNumber = params.trackingNumber;

  const fetchTrackingData = async () => {
    try {
      const res = await fetch(`/api/logistics/tracking/${trackingNumber}`);
      if (!res.ok) {
        throw new Error('Không tìm thấy thông tin vận đơn này.');
      }
      const data = await res.json();
      setDispatch(data.dispatch);
      setLogs(data.logs || []);
      setViewer(data.viewer || { role: 'public', isOwner: false });
    } catch (err: any) {
      setError(err.message || 'Lỗi tải thông tin vận đơn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, [trackingNumber]);

  // Giả lập di chuyển
  const handleSimulateStep = async () => {
    if (!dispatch || simulating) return;
    setSimulating(true);

    try {
      const res = await fetch('/api/logistics/simulate-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatchId: dispatch.id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Cập nhật lại UI sau khi di chuyển
        await fetchTrackingData();
        alert(`Mô phỏng cập nhật thành công!\nTrạng thái mới: ${data.status.toUpperCase()}\nVị trí: ${data.locationName}`);
      } else {
        alert(`Lỗi mô phỏng: ${data.error}`);
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ mô phỏng.');
    } finally {
      setSimulating(false);
    }
  };

  // Buyer xác nhận giao hàng
  const handleConfirmDelivery = async () => {
    if (!dispatch) return;
    const agree = confirm('Xác nhận bạn đã nhận đủ hàng sỉ và đồng ý giải ngân tiền cọc ký quỹ cho người bán?');
    if (!agree) return;

    try {
      const res = await fetch('/api/logistics/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: dispatch.order_id }),
      });

      if (res.ok) {
        alert('Tất toán đơn hàng thành công! Sàn đã giải ngân tiền cọc ký quỹ cho người bán.');
        fetchTrackingData();
      } else {
        const data = await res.json();
        alert(`Lỗi giải ngân: ${data.error}`);
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ.');
    }
  };

  // Map vĩ độ và kinh độ thực tế sang tọa độ SVG 500x300
  const getSVGCoords = (lat: number, lng: number) => {
    // Phạm vi địa lý tương đối giữa Cần Thơ (9.9 -> 10.1) đến TP.HCM (10.7 -> 10.8)
    const minLng = 105.6;
    const maxLng = 106.8;
    const minLat = 9.9;
    const maxLat = 10.9;

    // Linear scaling
    const x = ((lng - minLng) / (maxLng - minLng)) * 500;
    const y = 300 - ((lat - minLat) / (maxLat - minLat)) * 300;

    return { x: Math.max(10, Math.min(490, x)), y: Math.max(10, Math.min(290, y)) };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 gap-3">
        <span className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Đang tải live định vị vận đơn sỉ...</p>
      </div>
    );
  }

  if (error || !dispatch) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-center">
        <span className="text-4xl mb-3">⚠️</span>
        <h2 className="text-lg font-bold text-white mb-2">{error || 'Không tìm thấy vận đơn'}</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-6">Mã vận đơn có thể không chính xác hoặc chưa được khởi tạo với hệ thống logistics.</p>
        <Link href="/gia-si" className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200">
          Quay lại Bảng Giá Sỉ
        </Link>
      </div>
    );
  }

  // Khởi tạo tọa độ SVG vẽ đường đi
  const org = getSVGCoords(dispatch.origin_latitude, dispatch.origin_longitude);
  const dest = getSVGCoords(dispatch.destination_latitude, dispatch.destination_longitude);
  const curr = getSVGCoords(dispatch.current_latitude, dispatch.current_longitude);

  // Tọa độ trung gian Tiền Giang (Cai Lậy)
  const mid1 = getSVGCoords(10.360153, 106.357112);
  // Tọa độ Kho Tổng TP.HCM (Quận 7)
  const mid2 = getSVGCoords(10.75822, 106.65811);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Đã lên lịch (Assigned)';
      case 'picked_up': return 'Đã lấy hàng (Picked Up)';
      case 'in_transit': return 'Đang vận chuyển (In Transit)';
      case 'out_for_delivery': return 'Đang đi giao (Out for Delivery)';
      case 'delivered': return 'Giao thành công (Delivered)';
      case 'failed': return 'Giao thất bại (Failed)';
      default: return status.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚚</span>
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                Live Delivery Tracking
                <span className="text-[10px] bg-cyan-950/50 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">REALTIME</span>
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Mã vận đơn: {dispatch.tracking_number}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {viewer.role === 'seller' && (
              <Link
                href="/seller"
                className="px-4 py-1.5 rounded-full bg-slate-850 hover:bg-slate-800 text-xs font-bold transition-all border border-slate-700/60"
              >
                ← Kênh Người Bán
              </Link>
            )}
            {viewer.role === 'buyer' && (
              <Link
                href="/buyer/orders"
                className="px-4 py-1.5 rounded-full bg-slate-850 hover:bg-slate-800 text-xs font-bold transition-all border border-slate-700/60"
              >
                ← Đơn Hàng Của Tôi
              </Link>
            )}
            <Link
              href="/gia-si"
              className="px-4 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all"
            >
              Xem Sàn Giá Sỉ
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Interactive Map & Shipper Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* MOCK LIVE MAP CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">🗺️ Bản Đồ Hành Trình Ký Quỹ</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Mô phỏng chặng đường Cần Thơ ➔ Cai Lậy ➔ Sài Gòn</p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                <span className="text-cyan-400 font-bold font-mono">Live GPS</span>
              </div>
            </div>

            {/* SVG MAP CONTAINER */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-2 relative h-[300px] overflow-hidden shadow-inner flex justify-center items-center">
              
              {/* Grid backgrounds */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-25" />

              <svg viewBox="0 0 500 300" className="w-full h-full relative z-10 select-none">
                
                {/* 1. Tuyển đường chính nét đứt */}
                <path
                  d={`M ${org.x} ${org.y} L ${mid1.x} ${mid1.y} L ${mid2.x} ${mid2.y} L ${dest.x} ${dest.y}`}
                  stroke="#1e293b"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={`M ${org.x} ${org.y} L ${mid1.x} ${mid1.y} L ${mid2.x} ${mid2.y} L ${dest.x} ${dest.y}`}
                  stroke="#0891b2"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6 4"
                  className="animate-dash"
                />

                {/* 2. Đường đã di chuyển qua (Solid line màu cyan) */}
                {dispatch.status !== 'assigned' && (
                  <path
                    d={
                      dispatch.status === 'picked_up' ? `M ${org.x} ${org.y} L ${curr.x} ${curr.y}` :
                      dispatch.status === 'in_transit' ? `M ${org.x} ${org.y} L ${mid1.x} ${mid1.y} L ${curr.x} ${curr.y}` :
                      dispatch.status === 'out_for_delivery' ? `M ${org.x} ${org.y} L ${mid1.x} ${mid1.y} L ${mid2.x} ${mid2.y} L ${curr.x} ${curr.y}` :
                      `M ${org.x} ${org.y} L ${mid1.x} ${mid1.y} L ${mid2.x} ${mid2.y} L ${dest.x} ${dest.y}`
                    }
                    stroke="#22d3ee"
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* 3. Chấm trạm dừng chân chính */}
                {/* Xuất phát: Vựa Cần Thơ */}
                <circle cx={org.x} cy={org.y} r="6" fill="#10b981" />
                <circle cx={org.x} cy={org.y} r="12" stroke="#10b981" strokeWidth="1.5" fill="none" className="animate-ping" opacity="0.3" />

                {/* Trạm 1: Cai Lậy */}
                <circle cx={mid1.x} cy={mid1.y} r="4.5" fill={dispatch.status === 'assigned' ? '#334155' : '#22d3ee'} />
                
                {/* Trạm 2: Kho Quận 7 */}
                <circle cx={mid2.x} cy={mid2.y} r="4.5" fill={(dispatch.status === 'assigned' || dispatch.status === 'picked_up' || dispatch.status === 'in_transit') ? '#334155' : '#22d3ee'} />

                {/* Đích: Buyer Address */}
                <circle cx={dest.x} cy={dest.y} r="6" fill="#3b82f6" />
                <circle cx={dest.x} cy={dest.y} r="12" stroke="#3b82f6" strokeWidth="1.5" fill="none" className="animate-ping" opacity="0.3" />

                {/* 4. Shipper/Truck Icon */}
                <g transform={`translate(${curr.x - 14}, ${curr.y - 14})`} className="cursor-pointer">
                  {/* Wave pulse aura around the truck */}
                  <circle cx="14" cy="14" r="14" fill="#06b6d4" opacity="0.15" className="animate-pulse" />
                  <circle cx="14" cy="14" r="24" stroke="#06b6d4" strokeWidth="1" fill="none" className="animate-ping" opacity="0.25" />
                  
                  {/* Truck Background marker circle */}
                  <circle cx="14" cy="14" r="11" fill="#0891b2" stroke="#ffffff" strokeWidth="1" />
                  {/* Truck emoji */}
                  <text x="14" y="18.5" fontSize="12" textAnchor="middle">
                    {dispatch.status === 'delivered' ? '✓' : '🚚'}
                  </text>
                </g>

                {/* Labels */}
                <text x={org.x + 8} y={org.y + 4} fill="#10b981" fontSize="9" fontWeight="bold">Vựa sỉ</text>
                <text x={mid1.x + 6} y={mid1.y - 4} fill="#94a3b8" fontSize="8">Trạm Tiền Giang</text>
                <text x={mid2.x - 8} y={mid2.y + 12} fill="#94a3b8" fontSize="8" textAnchor="end">Kho TP.HCM</text>
                <text x={dest.x + 8} y={dest.y + 4} fill="#3b82f6" fontSize="9" fontWeight="bold">Người nhận</text>
              </svg>

              {/* Floating coordinates indicator */}
              <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[9px] font-mono text-slate-400 space-y-0.5 z-20 shadow-md">
                <p><span className="text-cyan-400 font-bold">LAT:</span> {dispatch.current_latitude.toFixed(6)}</p>
                <p><span className="text-cyan-400 font-bold">LNG:</span> {dispatch.current_longitude.toFixed(6)}</p>
              </div>

              {/* Floating station status */}
              <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] text-slate-200 z-20 shadow-md">
                📍 Vị trí: <span className="font-extrabold text-cyan-400">{dispatch.current_location_name}</span>
              </div>
            </div>

            {/* Quick Map Legend */}
            <div className="flex flex-wrap justify-between items-center gap-3 text-[10px] text-slate-500 mt-4">
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Cần Thơ (Vùng sỉ)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Vị trí shipper</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Điểm nhận hàng</span>
              </div>
              <span className="font-bold font-mono">Carrier: {dispatch.carrier_name.toUpperCase()}</span>
            </div>
          </div>

          {/* SHIPPER PROFILE INFO */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">🧑‍✈️ Shipper Phụ Trách Vận Đơn</h3>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-xl font-bold select-none text-cyan-400">
                  {dispatch.rider_name ? dispatch.rider_name.charAt(0) : 'S'}
                </div>
                <div>
                  <span className="font-extrabold text-sm text-white block">{dispatch.rider_name || 'Đang phân công'}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">✓ Đơn vị vận tải xác thực</span>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <a
                  href={`tel:${dispatch.rider_phone}`}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all text-center flex items-center justify-center gap-1.5"
                >
                  📞 {dispatch.rider_phone || 'Không có SĐT'}
                </a>
                <a
                  href={`https://zalo.me/${dispatch.rider_phone}`}
                  target="_blank"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all text-center flex items-center justify-center gap-1.5"
                >
                  💬 Zalo
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Timeline & Order Details */}
        <div className="space-y-6">
          
          {/* SIMULATOR & ACTION CONTROL BOX */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">🛡️ Bảng điều khiển giao dịch</h3>
            
            <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-2xl space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Trạng thái giao:</span>
                <span className="font-black text-cyan-400 font-mono text-[11px] bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/15">
                  {getStatusText(dispatch.status)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Đơn hàng Livedas:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase border ${
                  dispatch.order_status === 'completed' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' :
                  dispatch.order_status === 'shipping' ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20' :
                  'bg-amber-950/40 text-amber-400 border-amber-500/20'
                }`}>
                  {dispatch.order_status === 'completed' ? 'Đã Tất Toán ✓' : 
                   dispatch.order_status === 'shipping' ? 'Đang Giao Hàng' : 'Đã xác nhận'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Dự kiến giao hàng:</span>
                <span className="font-bold text-white">
                  {new Date(dispatch.estimated_delivery_time).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            {/* Buyer Action Panel: Release Escrow */}
            {viewer.role === 'buyer' && (dispatch.status === 'confirmed' || dispatch.status === 'shipping' || dispatch.status === 'out_for_delivery') && (
              <div className="space-y-2.5">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  * Nhấp nút bên dưới để xác nhận bạn đã nhận đủ số lượng và chất lượng sỉ hàng hóa. Sàn sẽ giải ngân cọc ký quỹ cho người bán.
                </p>
                <button
                  type="button"
                  onClick={handleConfirmDelivery}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-950/20 cursor-pointer text-center"
                >
                  ✔️ Đã Nhận Hàng & Giải Ngân Ví
                </button>
              </div>
            )}

            {/* Seller & Admin Action Panel: Simulate Transit Steps */}
            {(viewer.role === 'seller' || viewer.role === 'admin') && dispatch.status !== 'delivered' && (
              <div className="space-y-3 bg-slate-950/40 border border-slate-850 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider block mb-1">⚡ Mô Phỏng Giao Hàng (Demo)</span>
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    Bạn là {viewer.role === 'admin' ? 'Admin' : 'Vựa Bán Sỉ'}. Nhấn nút dưới đây để mô phỏng dịch chuyển vị trí của shipper trên bản đồ và cập nhật nhật ký timeline realtime.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleSimulateStep}
                  disabled={simulating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {simulating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Đang xử lý di chuyển...
                    </>
                  ) : (
                    '⚡ Giao Hàng Chặng Tiếp Theo'
                  )}
                </button>
              </div>
            )}

            {/* Already Completed status message */}
            {dispatch.status === 'delivered' && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-center text-emerald-400 text-xs font-black">
                ✓ Vận đơn đã giao nhận thành công & Tất toán ví sỉ hoàn thành.
              </div>
            )}
          </div>

          {/* TRANSIT TIMELINE LOGS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col flex-1">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-5">📋 Nhật ký lịch sử hành trình ({logs.length})</h3>
            
            <div className="relative border-l border-slate-800 pl-4 ml-2.5 space-y-6 text-xs flex-1">
              {logs.length > 0 ? (
                logs.map((log, index) => {
                  const isLatest = index === 0;
                  return (
                    <div key={log.id} className="relative animate-fadeIn">
                      
                      {/* Timeline dot */}
                      <span className={`absolute -left-[22.5px] top-1 w-3 h-3 rounded-full border ${
                        isLatest
                          ? 'bg-cyan-400 border-cyan-500 shadow-[0_0_8px_#22d3ee] scale-110'
                          : 'bg-slate-800 border-slate-700'
                      }`} />
                      
                      {/* Timeline item body */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center gap-2">
                          <span className={`font-extrabold ${isLatest ? 'text-cyan-400' : 'text-slate-300'}`}>
                            {log.location_name}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">
                            {new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(log.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-slate-400 leading-relaxed">{log.notes}</p>
                        
                        <div className="flex gap-2 text-[8px] font-mono text-slate-600 mt-1 uppercase">
                          <span>Status: {log.status}</span>
                          <span>•</span>
                          <span>GPS: {log.latitude?.toFixed(4)}, {log.longitude?.toFixed(4)}</span>
                        </div>
                      </div>

                    </div>
                  );
                })
              ) : (
                <p className="text-slate-600 text-center py-6">Chưa có nhật ký hành trình được ghi nhận.</p>
              )}
            </div>
          </div>

          {/* ITEM TRANSACTION BRIEF */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 text-xs">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">📦 Chi tiết đơn hàng giao dịch</h3>
            
            <div className="flex items-center gap-2.5 p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl">
              <span className="text-3xl">{dispatch.product_emoji}</span>
              <div>
                <span className="font-extrabold text-white text-sm block">{dispatch.product_name}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Số lượng: {dispatch.quantity_kg} {dispatch.product_unit}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex justify-between border-b border-slate-800/40 pb-2">
                <span>Vựa/Nhà vườn bán:</span>
                <span className="text-slate-200 font-bold">{dispatch.seller_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/40 pb-2">
                <span>Người mua sỉ:</span>
                <span className="text-slate-200 font-bold">{dispatch.buyer_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/40 pb-2">
                <span>Địa chỉ giao nhận:</span>
                <span className="text-slate-200 font-semibold max-w-[180px] text-right truncate" title={dispatch.delivery_address}>
                  {dispatch.delivery_address}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/40 pb-2">
                <span>Phí vận chuyển:</span>
                <span className="text-slate-200 font-bold font-mono">{dispatch.shipping_fee.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Tổng giá trị giao dịch:</span>
                <span className="text-emerald-400 font-black text-sm font-mono">{dispatch.total_amount.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      <style jsx global>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -40;
          }
        }
        .animate-dash {
          animation: dash 5s linear infinite;
        }
      `}</style>
    </div>
  );
}
