-- =============================================
-- Migration: Bổ sung ngành hàng Thủy Hải Sản
-- =============================================

-- 1. Thêm cột vertical vào bảng products để phân chia ngành hàng
ALTER TABLE products ADD COLUMN IF NOT EXISTS vertical VARCHAR(20) DEFAULT 'agriculture';
COMMENT ON COLUMN products.vertical IS 'Ngành hàng: agriculture (nông sản), seafood (thủy hải sản)';

-- Cập nhật các sản phẩm cũ thành ngành hàng nông sản
UPDATE products SET vertical = 'agriculture' WHERE vertical IS NULL;

-- 2. Seed 20 sản phẩm thủy hải sản sỉ đặc trưng miền Tây Nam Bộ
INSERT INTO products (id, name, name_en, category, unit, emoji, primary_region, price_range_min, price_range_max, vertical) VALUES
  ('SP021', 'Tôm sú sỉ',            'Tiger Prawn',           'seafood',   'kg',   '🦐', 'Bến Tre',     180000, 320000, 'seafood'),
  ('SP022', 'Tôm thẻ chân trắng',  'Whiteleg Shrimp',       'seafood',   'kg',   '🦐', 'Sóc Trăng',    90000, 150000, 'seafood'),
  ('SP023', 'Cua biển Cà Mau',      'Ca Mau Crab',           'seafood',   'kg',   '🦀', 'Cà Mau',      250000, 450000, 'seafood'),
  ('SP024', 'Cá tra sỉ',            'Pangasius',             'seafood',   'kg',   '🐟', 'An Giang',     26000,  32000, 'seafood'),
  ('SP025', 'Cá điêu hồng',         'Red Tilapia',           'seafood',   'kg',   '🐟', 'Tiền Giang',   40000,  55000, 'seafood'),
  ('SP026', 'Cá lóc bông',          'Giant Snakehead',       'seafood',   'kg',   '🐟', 'Trà Vinh',     50000,  70000, 'seafood'),
  ('SP027', 'Tôm càng xanh',        'Giant River Prawn',     'seafood',   'kg',   '🦞', 'Bến Tre',     130000, 220000, 'seafood'),
  ('SP028', 'Nghêu Bến Tre',        'Clam',                  'seafood',   'kg',   '🦪', 'Bến Tre',      30000,  50000, 'seafood'),
  ('SP029', 'Sò huyết sỉ',          'Blood Cockle',          'seafood',   'kg',   '🦪', 'Bạc Liêu',    120000, 200000, 'seafood'),
  ('SP030', 'Hàu sữa nuôi',         'Oyster',                'seafood',   'kg',   '🦪', 'Kiên Giang',   25000,  45000, 'seafood'),
  ('SP031', 'Cá tai tượng',         'Giant Gourami',         'seafood',   'kg',   '🐟', 'Vĩnh Long',    55000,  75000, 'seafood'),
  ('SP032', 'Cá chẽm sỉ',           'Barramundi',            'seafood',   'kg',   '🐟', 'Sóc Trăng',    85000, 120000, 'seafood'),
  ('SP033', 'Ghẹ xanh Hàm Ninh',    'Blue Crab',             'seafood',   'kg',   '🦀', 'Phú Quốc',    220000, 380000, 'seafood'),
  ('SP034', 'Ốc hương nuôi',        'Babylon Snail',         'seafood',   'kg',   '🐚', 'Kiên Giang',  200000, 350000, 'seafood'),
  ('SP035', 'Mực ống sỉ',           'Squid',                 'seafood',   'kg',   '🦑', 'Kiên Giang',  180000, 280000, 'seafood'),
  ('SP036', 'Bạch tuộc sỉ',         'Octopus',               'seafood',   'kg',   '🐙', 'Bến Tre',      90000, 140000, 'seafood'),
  ('SP037', 'Cá bớp lồng bè',       'Cobia',                 'seafood',   'kg',   '🐟', 'Kiên Giang',  140000, 200000, 'seafood'),
  ('SP038', 'Cá đuối sỉ',           'Ray Fish',              'seafood',   'kg',   '🐟', 'Tiền Giang',   70000, 110000, 'seafood'),
  ('SP039', 'Sò lông sỉ',           'Hairy Ark',             'seafood',   'kg',   '🐚', 'Trà Vinh',     35000,  60000, 'seafood'),
  ('SP040', 'Cá lóc đồng',          'Snakehead Fish',        'seafood',   'kg',   '🐟', 'Cà Mau',       75000, 110000, 'seafood');

-- 3. Seed 10 người bán / vựa chuyên hải sản sỉ
INSERT INTO sellers (name, phone, zalo_id, region, province, verified, rating, total_transactions, specialty, status, last_active) VALUES
  (
    'Vựa Tôm Út Đạt',
    '0901234567',
    'vuatomutdat_zalo',
    'Miền Tây',
    'Bến Tre',
    true,
    4.85,
    312,
    ARRAY['SP021', 'SP022', 'SP027'],
    'online',
    NOW() - INTERVAL '3 minutes'
  ),
  (
    'Hợp tác xã Cua biển Năm Căn',
    '0931234567',
    'cuabiennamcan_zalo',
    'Miền Tây',
    'Cà Mau',
    true,
    4.92,
    489,
    ARRAY['SP023', 'SP040'],
    'online',
    NOW() - INTERVAL '1 minute'
  ),
  (
    'Vựa Cá Tra Thanh Hải',
    '0941234567',
    'catrathanhhai_zalo',
    'Miền Tây',
    'An Giang',
    true,
    4.70,
    215,
    ARRAY['SP024', 'SP025', 'SP031'],
    'online',
    NOW() - INTERVAL '8 minutes'
  ),
  (
    'Đầm Nghêu Trương Hùng',
    '0961234568',
    'ngheutruonghung_zalo',
    'Miền Tây',
    'Bến Tre',
    true,
    4.60,
    178,
    ARRAY['SP028', 'SP036', 'SP039'],
    'offline',
    NOW() - INTERVAL '4 hours'
  ),
  (
    'Hải Sản Biển Kiên Giang',
    '0971234567',
    'haisanbienkg_zalo',
    'Miền Tây',
    'Kiên Giang',
    true,
    4.78,
    354,
    ARRAY['SP030', 'SP034', 'SP035', 'SP037'],
    'online',
    NOW() - INTERVAL '5 minutes'
  ),
  (
    'Thương Lái Sò Huyết Bạc Liêu',
    '0981234567',
    'sohuyetbl_zalo',
    'Miền Tây',
    'Bạc Liêu',
    false,
    4.10,
    64,
    ARRAY['SP029', 'SP039'],
    'offline',
    NOW() - INTERVAL '1 day'
  ),
  (
    'Vựa Cá Điêu Hồng Sông Tiền',
    '0915123456',
    'cadieuhongst_zalo',
    'Miền Tây',
    'Tiền Giang',
    true,
    4.65,
    198,
    ARRAY['SP025', 'SP026', 'SP038'],
    'online',
    NOW() - INTERVAL '11 minutes'
  ),
  (
    'Hợp tác xã Tôm Sóc Trăng',
    '0955123456',
    'hptxtomst_zalo',
    'Miền Tây',
    'Sóc Trăng',
    true,
    4.80,
    276,
    ARRAY['SP022', 'SP032'],
    'online',
    NOW() - INTERVAL '4 minutes'
  ),
  (
    'Ghe Cá Mực Phú Quốc',
    '0899123456',
    'ghecamucpq_zalo',
    'Miền Tây',
    'Kiên Giang',
    false,
    3.90,
    42,
    ARRAY['SP033', 'SP035', 'SP037'],
    'offline',
    NOW() - INTERVAL '7 hours'
  ),
  (
    'Vựa Cá Lóc Bông Trà Vinh',
    '0922123456',
    'calocbongtv_zalo',
    'Miền Tây',
    'Trà Vinh',
    true,
    4.55,
    115,
    ARRAY['SP026', 'SP040'],
    'offline',
    NOW() - INTERVAL '2 hours'
  );

-- 4. Khởi tạo giá sỉ hiện tại cho 20 sản phẩm thủy hải sản mới
INSERT INTO current_prices (product_id, price_avg, price_min, price_max, price_recommended, trend_direction, change_24h, active_sellers, supply_level, total_volume_kg, source_count, updated_at) VALUES
  ('SP021', 250000, 225000, 275000, 245000, 'up',     1.50,  2, 'medium', 12000,   5, NOW() - INTERVAL '6 minutes'),
  ('SP022', 120000, 108000, 132000, 118000, 'down',  -3.20,  2, 'high',   45000,   9, NOW() - INTERVAL '8 minutes'),
  ('SP023', 350000, 315000, 385000, 340000, 'up',     4.50,  1, 'low',    4000,    4, NOW() - INTERVAL '3 minutes'),
  ('SP024',  29000,  26100,  31900,  28500, 'stable', 0.00,  1, 'high',   85000,  12, NOW() - INTERVAL '20 minutes'),
  ('SP025',  47500,  42750,  52250,  46000, 'stable', 0.50,  2, 'medium', 25000,   7, NOW() - INTERVAL '15 minutes'),
  ('SP026',  60000,  54000,  66000,  59000, 'down',  -2.00,  2, 'medium', 14000,   5, NOW() - INTERVAL '12 minutes'),
  ('SP027', 175000, 157500, 192500, 170000, 'up',     2.80,  2, 'low',    6000,    6, NOW() - INTERVAL '9 minutes'),
  ('SP028',  40000,  36000,  44000,  39000, 'stable', 0.00,  1, 'high',   38000,   8, NOW() - INTERVAL '30 minutes'),
  ('SP029', 160000, 144000, 176000, 155000, 'up',     5.00,  2, 'low',    8000,    7, NOW() - INTERVAL '5 minutes'),
  ('SP030',  35000,  31500,  38500,  34000, 'down',  -1.80,  1, 'medium', 18000,   4, NOW() - INTERVAL '18 minutes'),
  ('SP031',  65000,  58500,  71500,  63000, 'stable', 0.00,  1, 'medium', 15000,   6, NOW() - INTERVAL '25 minutes'),
  ('SP032', 102500,  92250, 112750, 100000, 'up',     1.20,  1, 'medium', 22000,   5, NOW() - INTERVAL '10 minutes'),
  ('SP033', 300000, 270000, 330000, 290000, 'up',     3.50,  1, 'low',    3000,    3, NOW() - INTERVAL '4 minutes'),
  ('SP034', 275000, 247500, 302500, 270000, 'stable',-0.80,  1, 'low',    5000,    4, NOW() - INTERVAL '14 minutes'),
  ('SP035', 230000, 207000, 253000, 225000, 'up',     2.00,  2, 'medium', 16000,   8, NOW() - INTERVAL '7 minutes'),
  ('SP036', 115000, 103500, 126500, 110000, 'down',  -4.20,  1, 'high',   28000,   7, NOW() - INTERVAL '16 minutes'),
  ('SP037', 170000, 153000, 187000, 165000, 'stable', 0.00,  2, 'low',    7000,    5, NOW() - INTERVAL '22 minutes'),
  ('SP038',  90000,  81000,  99000,  88000, 'stable', 0.80,  1, 'medium', 12000,   4, NOW() - INTERVAL '28 minutes'),
  ('SP039',  47500,  42750,  52250,  46000, 'down',  -1.50,  2, 'high',   30000,   6, NOW() - INTERVAL '35 minutes'),
  ('SP040',  92500,  83250, 101750,  90000, 'up',     2.20,  2, 'medium', 10000,   5, NOW() - INTERVAL '11 minutes');
