-- =============================================
-- Bảng sản phẩm nông sản (Products Table)
-- 20 sản phẩm nông sản Việt Nam với giá sỉ thực tế
-- =============================================

CREATE TABLE products (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  category VARCHAR(50) NOT NULL, -- fruit|coffee|vegetable|spice|other
  unit VARCHAR(20) DEFAULT 'kg',
  emoji VARCHAR(10),
  primary_region VARCHAR(50),
  image_url TEXT,
  price_range_min INTEGER, -- giá sàn VND/đơn vị
  price_range_max INTEGER, -- giá trần VND/đơn vị
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm comment cho bảng
COMMENT ON TABLE products IS 'Danh sách 20 sản phẩm nông sản Việt Nam';
COMMENT ON COLUMN products.price_range_min IS 'Giá sàn điển hình (VND/đơn vị)';
COMMENT ON COLUMN products.price_range_max IS 'Giá trần điển hình (VND/đơn vị)';

-- =============================================
-- Seed data: 20 sản phẩm nông sản
-- =============================================

INSERT INTO products (id, name, name_en, category, unit, emoji, primary_region, price_range_min, price_range_max) VALUES
  -- Cà phê (Coffee)
  ('SP001', 'Cà phê Robusta',       'Robusta Coffee',       'coffee',    'kg',   '☕', 'Tây Nguyên',    95000,  130000),
  ('SP002', 'Cà phê Arabica',       'Arabica Coffee',       'coffee',    'kg',   '☕', 'Tây Nguyên',   150000,  220000),

  -- Khác (Other)
  ('SP003', 'Ca cao',               'Cacao',                'other',     'kg',   '🍫', 'Miền Tây',      55000,   75000),

  -- Trái cây (Fruits)
  ('SP004', 'Sầu riêng Ri6',       'Ri6 Durian',           'fruit',     'kg',   '🥑', 'Tiền Giang',    55000,   85000),
  ('SP005', 'Sầu riêng Musang King','Musang King Durian',   'fruit',     'kg',   '🥑', 'Đông Nam Bộ',  150000,  300000),
  ('SP006', 'Bơ Booth',            'Booth Avocado',         'fruit',     'kg',   '🥑', 'Tây Nguyên',    25000,   45000),
  ('SP007', 'Bơ 034',              '034 Avocado',           'fruit',     'kg',   '🥑', 'Tây Nguyên',    30000,   55000),
  ('SP008', 'Chuối già Nam Mỹ',    'Cavendish Banana',      'fruit',     'nải',  '🍌', 'Miền Tây',       8000,   18000),
  ('SP009', 'Dứa (Khóm)',          'Pineapple',             'fruit',     'quả',  '🍍', 'Miền Tây',       5000,   12000),
  ('SP010', 'Khoai lang tím',      'Purple Sweet Potato',   'vegetable', 'kg',   '🍠', 'Miền Tây',       8000,   15000),
  ('SP011', 'Xoài cát Hòa Lộc',   'Hoa Loc Mango',         'fruit',     'kg',   '🥭', 'Miền Tây',      35000,   65000),
  ('SP012', 'Mít Thái',            'Thai Jackfruit',        'fruit',     'kg',   '🍈', 'Miền Nam',      15000,   30000),
  ('SP013', 'Dừa khô',             'Dried Coconut',         'fruit',     'trái', '🥥', 'Bến Tre',       15000,   25000),
  ('SP014', 'Thanh long ruột đỏ',  'Red Dragon Fruit',      'fruit',     'kg',   '🐉', 'Miền Nam',      15000,   35000),
  ('SP015', 'Nhãn Ido',            'Ido Longan',            'fruit',     'kg',   '🍇', 'Miền Tây',      25000,   45000),
  ('SP016', 'Chôm chôm Java',      'Java Rambutan',         'fruit',     'kg',   '🍒', 'Miền Nam',      15000,   30000),
  ('SP017', 'Vải thiều',           'Lychee',                'fruit',     'kg',   '🍒', 'Miền Bắc',      30000,   60000),
  ('SP018', 'Măng cụt',            'Mangosteen',            'fruit',     'kg',   '🍊', 'Miền Nam',      35000,   70000),
  ('SP019', 'Chanh không hạt',     'Seedless Lime',         'fruit',     'kg',   '🍋', 'Miền Tây',       8000,   20000),

  -- Rau củ (Vegetables)
  ('SP020', 'Ớt chỉ thiên',        'Thai Chili',            'vegetable', 'kg',   '🌶️', 'Miền Nam',      25000,   60000);
