/**
 * 🚚 Livedas Logistics Client SDK (Mock & Modular)
 * Được thiết kế dưới dạng lớp mở (Open SDK) để dễ dàng tích hợp API thật
 * của các hãng vận chuyển hàng đầu Việt Nam như GHTK, GHN, Viettel Post.
 */

export interface ShippingQuoteInput {
  originProvince: string;
  destProvince: string;
  weightKg: number;
}

export interface ShippingQuoteOutput {
  carrier: string;
  carrierLogo: string;
  fee: number;
  estimatedDays: number;
}

export interface CreateShippingOrderInput {
  orderId: string;
  buyerName: string;
  buyerPhone: string;
  deliveryAddress: string;
  weightKg: number;
  carrierName: 'GHTK' | 'GHN' | 'ViettelPost' | 'LivedasCarrier';
}

export interface CreateShippingOrderOutput {
  success: boolean;
  trackingNumber: string;
  shippingFee: number;
  estimatedDeliveryDate: string;
}

export class LogisticsClient {
  /**
   * Lấy báo giá phí ship mô phỏng từ các đối tác vận chuyển
   */
  static async getQuotes(input: ShippingQuoteInput): Promise<ShippingQuoteOutput[]> {
    const { originProvince, destProvince, weightKg } = input;
    
    // Thuật toán tính phí vận chuyển giả định:
    // Cự ly liên tỉnh (ví dụ Tiền Giang -> Hà Nội vs Tiền Giang -> Cần Thơ)
    const isInterRegional = originProvince.trim().toLowerCase() !== destProvince.trim().toLowerCase();
    
    // Đơn giá vận chuyển sỉ nông thủy sản (giá sỉ tối ưu theo khối lượng lớn)
    const baseFeePerKg = isInterRegional ? 1500 : 600; // liên tỉnh 1500đ/kg, nội tỉnh/miền 600đ/kg
    const baseQuote = weightKg * baseFeePerKg;

    return [
      {
        carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
        carrierLogo: '🚚 GHTK',
        fee: Math.max(35000, Math.round(baseQuote * 0.95)), // GHTK chiết khấu nhẹ
        estimatedDays: isInterRegional ? 3 : 1
      },
      {
        carrier: 'Giao Hàng Nhanh (GHN)',
        carrierLogo: '⚡ GHN',
        fee: Math.max(40000, Math.round(baseQuote * 1.05)), // GHN giao nhanh hơn giá cao hơn chút
        estimatedDays: isInterRegional ? 2 : 1
      },
      {
        carrier: 'Viettel Post',
        carrierLogo: '📮 ViettelPost',
        fee: Math.max(30000, Math.round(baseQuote * 1.0)),
        estimatedDays: isInterRegional ? 4 : 2
      },
      {
        carrier: 'Livedas Logistics (Vận tải sàn)',
        carrierLogo: '🌾 Livedas',
        fee: Math.max(25000, Math.round(baseQuote * 0.8)), // Sàn trợ giá sỉ 20%
        estimatedDays: isInterRegional ? 3 : 1
      }
    ];
  }

  /**
   * Tạo đơn giao vận sang hệ thống đối tác vận tải (Mock API)
   * Để tích hợp API thật, bro chỉ cần thế lệnh fetch tới GHTK/GHN endpoints tại đây
   */
  static async createOrder(input: CreateShippingOrderInput): Promise<CreateShippingOrderOutput> {
    const { orderId, buyerName, buyerPhone, deliveryAddress, weightKg, carrierName } = input;
    
    // Mô phỏng độ trễ gọi API của hãng vận chuyển (e.g. GHTK API)
    await new Promise(resolve => setTimeout(resolve, 300));

    // Tính toán phí ship thực tế
    const baseFeePerKg = carrierName === 'LivedasCarrier' ? 500 : 700;
    const shippingFee = Math.max(35000, weightKg * baseFeePerKg);

    // Tự sinh mã tracking định dạng chuẩn đối tác
    const trackingNumber = `LVD-${carrierName.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return {
      success: true,
      trackingNumber,
      shippingFee,
      estimatedDeliveryDate: estimatedDelivery
    };
  }

  /**
   * Hủy đơn vận chuyển (Mock API)
   */
  static async cancelOrder(trackingNumber: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return true;
  }
}
