import { Product, CurrentPrice, PriceEntry, Seller } from './types';

// Danh sách baseline giá trị điển hình của 20 sản phẩm sỉ nông sản Việt Nam
export const PRODUCT_BASELINES: Record<string, { min: number; max: number; emoji: string; name: string }> = {
  SP001: { name: 'Cà phê Robusta',       emoji: '☕', min: 95000,  max: 130000 },
  SP002: { name: 'Cà phê Arabica',       emoji: '☕', min: 150000, max: 220000 },
  SP003: { name: 'Ca cao',               emoji: '🍫', min: 55000,  max: 75000 },
  SP004: { name: 'Sầu riêng Ri6',       emoji: '🥑', min: 55000,  max: 85000 },
  SP005: { name: 'Sầu riêng Musang King',emoji: '🥑', min: 150000, max: 300000 },
  SP006: { name: 'Bơ Booth',            emoji: '🥑', min: 25000,  max: 45000 },
  SP007: { name: 'Bơ 034',              emoji: '🥑', min: 30000,  max: 55000 },
  SP008: { name: 'Chuối già Nam Mỹ',    emoji: '🍌', min: 8000,   max: 18000 },
  SP009: { name: 'Dứa (Khóm)',          emoji: '🍍', min: 5000,   max: 12000 },
  SP010: { name: 'Khoai lang tím',      emoji: '🍠', min: 8000,   max: 15000 },
  SP011: { name: 'Xoài cát Hòa Lộc',   emoji: '🥭', min: 35000,  max: 65000 },
  SP012: { name: 'Mít Thái',            emoji: '🍈', min: 15000,  max: 30000 },
  SP013: { name: 'Dừa khô',             emoji: '🥥', min: 15000,  max: 25000 },
  SP014: { name: 'Thanh long ruột đỏ',  emoji: '🐉', min: 15000,  max: 35000 },
  SP015: { name: 'Nhãn Ido',            emoji: '🍇', min: 25000,  max: 45000 },
  SP016: { name: 'Chôm chôm Java',      emoji: '🍒', min: 15000,  max: 30000 },
  SP017: { name: 'Vải thiều',           emoji: '🍒', min: 30000,  max: 60000 },
  SP018: { name: 'Măng cụt',            emoji: '🍊', min: 35000,  max: 70000 },
  SP019: { name: 'Chanh không hạt',     emoji: '🍋', min: 8000,   max: 20000 },
  SP020: { name: 'Ớt chỉ thiên',        emoji: '🌶️', min: 25000,  max: 60000 },
  SP021: { name: 'Tôm sú sỉ',            emoji: '🦐', min: 180000, max: 320000 },
  SP022: { name: 'Tôm thẻ chân trắng',  emoji: '🦐', min: 90000,  max: 150000 },
  SP023: { name: 'Cua biển Cà Mau',      emoji: '🦀', min: 250000, max: 450000 },
  SP024: { name: 'Cá tra sỉ',            emoji: '🐟', min: 26000,  max: 32000 },
  SP025: { name: 'Cá điêu hồng',         emoji: '🐟', min: 40000,  max: 55000 },
  SP026: { name: 'Cá lóc bông',          emoji: '🐟', min: 50000,  max: 70000 },
  SP027: { name: 'Tôm càng xanh',        emoji: '🦞', min: 130000, max: 220000 },
  SP028: { name: 'Nghêu Bến Tre',        emoji: '🦪', min: 30000,  max: 50000 },
  SP029: { name: 'Sò huyết sỉ',          emoji: '🦪', min: 120000, max: 200000 },
  SP030: { name: 'Hàu sữa nuôi',         emoji: '🦪', min: 25000,  max: 45000 },
  SP031: { name: 'Cá tai tượng',         emoji: '🐟', min: 55000,  max: 75000 },
  SP032: { name: 'Cá chẽm sỉ',           emoji: '🐟', min: 85000,  max: 120000 },
  SP033: { name: 'Ghẹ xanh Hàm Ninh',    emoji: '🦀', min: 220000, max: 380000 },
  SP034: { name: 'Ốc hương nuôi',        emoji: '🐚', min: 200000, max: 350000 },
  SP035: { name: 'Mực ống sỉ',           emoji: '🦑', min: 180000, max: 280000 },
  SP036: { name: 'Bạch tuộc sỉ',         emoji: '🐙', min: 90000,  max: 140000 },
  SP037: { name: 'Cá bớp lồng bè',       emoji: '🐟', min: 140000, max: 200000 },
  SP038: { name: 'Cá đuối sỉ',           emoji: '🐟', min: 70000,  max: 110000 },
  SP039: { name: 'Sò lông sỉ',           emoji: '🐚', min: 35000,  max: 60000 },
  SP040: { name: 'Cá lóc đồng',          emoji: '🐟', min: 75000,  max: 110000 },
};

/** Tạo giá ngẫu nhiên dao động xung quanh baseline */
export function generateRandomPrice(productId: string): { avg: number; min: number; max: number } {
  const baseline = PRODUCT_BASELINES[productId];
  if (!baseline) return { avg: 50000, min: 45000, max: 55000 };

  const range = baseline.max - baseline.min;
  // Điểm giữa của dải giá sỉ
  const mid = baseline.min + range / 2;
  
  // Tạo dao động ngẫu nhiên ±15% dựa trên thời điểm hiện tại
  const floatPercent = (Math.random() - 0.5) * 0.3; // -15% đến +15%
  const avg = Math.round(mid * (1 + floatPercent));

  // Giá min/max thực tế cho đợt báo giá cụ thể này
  const min = Math.round(avg * (0.9 + Math.random() * 0.05)); // -5% đến -10% so với avg
  const max = Math.round(avg * (1.05 + Math.random() * 0.05)); // +5% đến +10% so với avg

  return { avg, min, max };
}

/** Tạo ngẫu nhiên một PriceEntry cho sản phẩm */
export function generateMockPriceEntry(productId: string, sellerId: string): Partial<PriceEntry> {
  const { avg, min, max } = generateRandomPrice(productId);
  const sources = [
    { type: 'market', names: ['Chợ đầu mối Bình Điền', 'Chợ đầu mối Thủ Đức', 'Chợ đầu mối Hóc Môn'] },
    { type: 'dealer', names: ['Đầu nậu sỉ miền Tây', 'Vựa trái cây Phong Điền', 'Hợp tác xã Tây Nguyên'] },
    { type: 'social', names: ['Hội chủ vườn sầu riêng', 'Nhóm mua bán nông sản Zalo', 'Chợ sỉ Telegram'] }
  ];

  const randomSourceGroup = sources[Math.floor(Math.random() * sources.length)];
  const sourceName = randomSourceGroup.names[Math.floor(Math.random() * randomSourceGroup.names.length)];
  const sourceRegion = ['Tiền Giang', 'Bến Tre', 'Đắk Lắk', 'Lâm Đồng', 'Đồng Tháp', 'Cần Thơ'][Math.floor(Math.random() * 6)];

  return {
    product_id: productId,
    seller_id: sellerId,
    source_type: randomSourceGroup.type as any,
    source_name: sourceName,
    price_min: min,
    price_max: max,
    price_avg: avg,
    volume_kg: Math.round(100 + Math.random() * 5000), // volume sỉ từ 1 tạ đến 5 tấn
    region: sourceRegion,
    confidence: parseFloat((0.75 + Math.random() * 0.23).toFixed(2)),
    raw_text: `Báo giá sỉ nông sản tại khu vực ${sourceRegion} hôm nay giá trung bình khoảng ${avg.toLocaleString('vi-VN')}đ/kg`,
    processed: true
  };
}

/** Cập nhật hoặc chèn bảng current_prices từ các báo giá ảo */
export function generateMockCurrentPrice(productId: string, activeSellers: number): CurrentPrice {
  const { avg, min, max } = generateRandomPrice(productId);
  const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
  const supplyLevels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];

  return {
    product_id: productId,
    price_avg: avg,
    price_min: min,
    price_max: max,
    price_recommended: Math.round(avg * 0.98), // Đề xuất thấp hơn 2%
    trend_direction: trends[Math.floor(Math.random() * trends.length)],
    change_24h: parseFloat(((Math.random() - 0.5) * 15).toFixed(2)), // biến động -7.5% đến +7.5%
    active_sellers: activeSellers,
    supply_level: supplyLevels[Math.floor(Math.random() * supplyLevels.length)],
    total_volume_kg: Math.round(5000 + Math.random() * 100000),
    source_count: Math.round(3 + Math.random() * 15)
  };
}
