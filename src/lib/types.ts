export interface Product {
  id: string; // SP001 - SP020
  name: string;
  name_en: string | null;
  category: 'fruit' | 'coffee' | 'vegetable' | 'spice' | 'seafood' | 'other';
  unit: string;
  emoji: string;
  primary_region: string;
  price_range_min: number;
  price_range_max: number;
  vertical: 'agriculture' | 'seafood';
  active: boolean;
  created_at?: string;
}

export interface Seller {
  id: string; // UUID
  name: string;
  phone: string | null;
  zalo_id: string | null;
  region: string | null;
  province: string | null;
  verified: boolean;
  rating: number;
  total_transactions: number;
  specialty: string[]; // Danh sách product_id chuyên cung cấp
  status: 'online' | 'offline' | 'in_call';
  avatar_url: string | null;
  created_at?: string;
  last_active?: string;
  listing_id?: string;
  price_per_kg?: number;
  min_quantity_kg?: number;
  total_available_kg?: number;
}

export interface PriceEntry {
  id: string; // UUID
  product_id: string;
  seller_id: string | null;
  source_type: 'market' | 'dealer' | 'social' | 'manual';
  source_name: string | null;
  price_min: number | null;
  price_max: number | null;
  price_avg: number;
  volume_kg: number | null;
  region: string | null;
  confidence: number;
  raw_text: string | null;
  processed: boolean;
  created_at?: string;
}

export interface CurrentPrice {
  product_id: string;
  price_avg: number;
  price_min: number | null;
  price_max: number | null;
  price_recommended: number | null;
  trend_direction: 'up' | 'down' | 'stable';
  change_24h: number;
  active_sellers: number;
  supply_level: 'low' | 'medium' | 'high';
  total_volume_kg: number;
  source_count: number;
  updated_at?: string;
}

export interface CallLog {
  id: string; // UUID
  buyer_session: string | null;
  seller_id: string;
  product_id: string;
  contact_method: 'zalo' | 'phone' | 'webrtc';
  started_at?: string;
  ended_at: string | null;
  duration_seconds: number | null;
  outcome: 'deal' | 'no_deal' | 'no_answer' | 'cancelled' | null;
  buyer_rating: number | null;
  notes: string | null;
}

// Kiểu dữ liệu kết hợp để sử dụng ở UI
export interface ProductWithPrice extends Product {
  current_price: CurrentPrice | null;
}

export interface SellerWithOffer extends Seller {
  offered_price?: number;
}
