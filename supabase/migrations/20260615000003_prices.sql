-- =============================================
-- Bảng giá nông sản (Prices Tables)
-- price_entries: lịch sử báo giá
-- current_prices: giá hiện tại (view tổng hợp)
-- =============================================

-- Bảng lịch sử báo giá từ nhiều nguồn
CREATE TABLE price_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(10) REFERENCES products(id),
  seller_id UUID REFERENCES sellers(id),
  source_type VARCHAR(30) NOT NULL, -- market|dealer|social|manual
  source_name VARCHAR(100),
  price_min INTEGER,
  price_max INTEGER,
  price_avg INTEGER NOT NULL,
  volume_kg INTEGER,
  region VARCHAR(50),
  confidence DECIMAL(3,2) DEFAULT 0.80,
  raw_text TEXT,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE price_entries IS 'Lịch sử báo giá từ các nguồn: chợ, thương lái, mạng xã hội, nhập tay';
COMMENT ON COLUMN price_entries.source_type IS 'Nguồn giá: market (chợ), dealer (thương lái), social (MXH), manual (nhập tay)';
COMMENT ON COLUMN price_entries.confidence IS 'Độ tin cậy nguồn giá (0.00-1.00)';

-- Bảng giá hiện tại (tổng hợp cho hiển thị realtime)
CREATE TABLE current_prices (
  product_id VARCHAR(10) PRIMARY KEY REFERENCES products(id),
  price_avg INTEGER NOT NULL,
  price_min INTEGER,
  price_max INTEGER,
  price_recommended INTEGER,
  trend_direction VARCHAR(10) DEFAULT 'stable', -- up|down|stable
  change_24h DECIMAL(5,2) DEFAULT 0,
  active_sellers INTEGER DEFAULT 0,
  supply_level VARCHAR(10) DEFAULT 'medium', -- low|medium|high
  total_volume_kg INTEGER DEFAULT 0,
  source_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE current_prices IS 'Giá hiện tại tổng hợp cho từng sản phẩm - dùng cho bảng giá realtime';
COMMENT ON COLUMN current_prices.trend_direction IS 'Xu hướng giá: up (tăng), down (giảm), stable (ổn định)';
COMMENT ON COLUMN current_prices.change_24h IS 'Phần trăm thay đổi giá trong 24h gần nhất';
COMMENT ON COLUMN current_prices.supply_level IS 'Mức cung: low (ít), medium (trung bình), high (nhiều)';

-- =============================================
-- Indexes cho truy vấn nhanh
-- =============================================

-- Truy vấn lịch sử giá theo sản phẩm + thời gian
CREATE INDEX idx_price_entries_product_time ON price_entries(product_id, created_at DESC);

-- Truy vấn theo vùng
CREATE INDEX idx_price_entries_region ON price_entries(region);

-- Truy vấn giá chưa xử lý (cho AI pipeline)
CREATE INDEX idx_price_entries_unprocessed ON price_entries(processed) WHERE processed = false;

-- =============================================
-- Seed data: Giá hiện tại cho 20 sản phẩm
-- Giá trung bình = midpoint của price_range
-- Giá min/max = ±10% so với trung bình
-- =============================================

INSERT INTO current_prices (product_id, price_avg, price_min, price_max, price_recommended, trend_direction, change_24h, active_sellers, supply_level, total_volume_kg, source_count, updated_at) VALUES
  -- SP001: Cà phê Robusta — midpoint 112500
  ('SP001', 112500, 101250, 123750, 110000, 'up',     2.50,  3, 'medium', 45000,  12, NOW() - INTERVAL '10 minutes'),
  -- SP002: Cà phê Arabica — midpoint 185000
  ('SP002', 185000, 166500, 203500, 180000, 'up',     1.80,  2, 'low',    12000,   8, NOW() - INTERVAL '15 minutes'),
  -- SP003: Ca cao — midpoint 65000
  ('SP003',  65000,  58500,  71500,  63000, 'stable', 0.00,  2, 'medium', 8000,    6, NOW() - INTERVAL '30 minutes'),
  -- SP004: Sầu riêng Ri6 — midpoint 70000
  ('SP004',  70000,  63000,  77000,  68000, 'up',     3.20,  4, 'high',   32000,  15, NOW() - INTERVAL '5 minutes'),
  -- SP005: Sầu riêng Musang King — midpoint 225000
  ('SP005', 225000, 202500, 247500, 220000, 'stable', 0.50,  2, 'low',    3000,    5, NOW() - INTERVAL '20 minutes'),
  -- SP006: Bơ Booth — midpoint 35000
  ('SP006',  35000,  31500,  38500,  33000, 'down',  -4.10,  3, 'high',   28000,  10, NOW() - INTERVAL '8 minutes'),
  -- SP007: Bơ 034 — midpoint 42500
  ('SP007',  42500,  38250,  46750,  41000, 'down',  -2.30,  2, 'high',   22000,   9, NOW() - INTERVAL '12 minutes'),
  -- SP008: Chuối già Nam Mỹ — midpoint 13000
  ('SP008',  13000,  11700,  14300,  12500, 'stable', 0.00,  3, 'high',   65000,  11, NOW() - INTERVAL '25 minutes'),
  -- SP009: Dứa (Khóm) — midpoint 8500
  ('SP009',   8500,   7650,   9350,   8000, 'down',  -1.50,  2, 'high',   42000,   7, NOW() - INTERVAL '18 minutes'),
  -- SP010: Khoai lang tím — midpoint 11500
  ('SP010',  11500,  10350,  12650,  11000, 'stable', 0.80,  2, 'medium', 18000,   6, NOW() - INTERVAL '35 minutes'),
  -- SP011: Xoài cát Hòa Lộc — midpoint 50000
  ('SP011',  50000,  45000,  55000,  48000, 'up',     5.20,  3, 'low',    9000,    8, NOW() - INTERVAL '7 minutes'),
  -- SP012: Mít Thái — midpoint 22500
  ('SP012',  22500,  20250,  24750,  22000, 'down',  -3.00,  3, 'high',   35000,  10, NOW() - INTERVAL '22 minutes'),
  -- SP013: Dừa khô — midpoint 20000
  ('SP013',  20000,  18000,  22000,  19500, 'stable', 0.00,  2, 'medium', 15000,   5, NOW() - INTERVAL '40 minutes'),
  -- SP014: Thanh long ruột đỏ — midpoint 25000
  ('SP014',  25000,  22500,  27500,  24000, 'up',     2.00,  4, 'medium', 28000,  12, NOW() - INTERVAL '6 minutes'),
  -- SP015: Nhãn Ido — midpoint 35000
  ('SP015',  35000,  31500,  38500,  34000, 'up',     4.50,  2, 'low',    7000,    6, NOW() - INTERVAL '14 minutes'),
  -- SP016: Chôm chôm Java — midpoint 22500
  ('SP016',  22500,  20250,  24750,  22000, 'stable',-0.50,  2, 'medium', 12000,   7, NOW() - INTERVAL '28 minutes'),
  -- SP017: Vải thiều — midpoint 45000
  ('SP017',  45000,  40500,  49500,  43000, 'up',     6.80,  1, 'low',    4000,    4, NOW() - INTERVAL '45 minutes'),
  -- SP018: Măng cụt — midpoint 52500
  ('SP018',  52500,  47250,  57750,  51000, 'down',  -1.20,  2, 'medium', 10000,   6, NOW() - INTERVAL '16 minutes'),
  -- SP019: Chanh không hạt — midpoint 14000
  ('SP019',  14000,  12600,  15400,  13500, 'down',  -5.30,  3, 'high',   55000,  13, NOW() - INTERVAL '3 minutes'),
  -- SP020: Ớt chỉ thiên — midpoint 42500
  ('SP020',  42500,  38250,  46750,  40000, 'up',     8.50,  2, 'low',    5000,    5, NOW() - INTERVAL '9 minutes');
