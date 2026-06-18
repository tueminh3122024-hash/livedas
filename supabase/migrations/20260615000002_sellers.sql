-- =============================================
-- Bảng người bán (Sellers Table)
-- 10 nhà vườn / thương lái mẫu
-- =============================================

CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  zalo_id VARCHAR(50),
  region VARCHAR(50),
  province VARCHAR(50),
  verified BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  specialty TEXT[], -- mảng product_id chuyên cung cấp
  status VARCHAR(20) DEFAULT 'offline', -- online|offline|in_call
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ
);

-- Thêm comment
COMMENT ON TABLE sellers IS 'Danh sách người bán / nhà vườn / thương lái';
COMMENT ON COLUMN sellers.specialty IS 'Danh sách mã sản phẩm (SP001-SP020) mà người bán chuyên cung cấp';
COMMENT ON COLUMN sellers.status IS 'Trạng thái: online (đang hoạt động), offline (không hoạt động), in_call (đang gọi)';

-- Index cho tìm kiếm theo vùng và trạng thái
CREATE INDEX idx_sellers_region ON sellers(region);
CREATE INDEX idx_sellers_status ON sellers(status);

-- =============================================
-- Seed data: 10 người bán mẫu
-- =============================================

INSERT INTO sellers (name, phone, zalo_id, region, province, verified, rating, total_transactions, specialty, status, last_active) VALUES
  (
    'Nguyễn Văn Tâm',
    '0912345678',
    'nguyenvantam_zalo',
    'Miền Tây',
    'Tiền Giang',
    true,
    4.80,
    256,
    ARRAY['SP004', 'SP011', 'SP012'],
    'online',
    NOW() - INTERVAL '5 minutes'
  ),
  (
    'Trần Thị Mai',
    '0987654321',
    'tranthimai_zalo',
    'Miền Tây',
    'Bến Tre',
    true,
    4.65,
    189,
    ARRAY['SP008', 'SP009', 'SP013'],
    'online',
    NOW() - INTERVAL '12 minutes'
  ),
  (
    'Lê Hoàng Phúc',
    '0935123456',
    'lehoangphuc_zalo',
    'Tây Nguyên',
    'Đắk Lắk',
    true,
    4.90,
    412,
    ARRAY['SP001', 'SP002', 'SP006', 'SP007'],
    'online',
    NOW() - INTERVAL '2 minutes'
  ),
  (
    'Phạm Minh Đức',
    '0908765432',
    'phamminhduc_zalo',
    'Miền Tây',
    'Vĩnh Long',
    true,
    4.50,
    178,
    ARRAY['SP004', 'SP014', 'SP019'],
    'offline',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'Võ Thị Hương',
    '0976543210',
    'vothihuong_zalo',
    'Miền Tây',
    'Đồng Tháp',
    true,
    4.70,
    321,
    ARRAY['SP009', 'SP011', 'SP015'],
    'online',
    NOW() - INTERVAL '8 minutes'
  ),
  (
    'Huỳnh Thanh Sơn',
    '0943216789',
    'huynhthanhson_zalo',
    'Miền Nam',
    'Bình Dương',
    false,
    3.85,
    87,
    ARRAY['SP005', 'SP014', 'SP016', 'SP018'],
    'offline',
    NOW() - INTERVAL '1 day'
  ),
  (
    'Đặng Văn Hải',
    '0961234567',
    'dangvanhai_zalo',
    'Miền Tây',
    'Cần Thơ',
    true,
    4.40,
    234,
    ARRAY['SP003', 'SP008', 'SP010', 'SP019'],
    'online',
    NOW() - INTERVAL '15 minutes'
  ),
  (
    'Bùi Thị Lan',
    '0923456789',
    'buithilan_zalo',
    'Tây Nguyên',
    'Lâm Đồng',
    true,
    4.95,
    567,
    ARRAY['SP001', 'SP002', 'SP006'],
    'online',
    NOW() - INTERVAL '1 minute'
  ),
  (
    'Ngô Quốc Cường',
    '0954321876',
    'ngoquoccuong_zalo',
    'Miền Nam',
    'Long An',
    false,
    3.60,
    45,
    ARRAY['SP012', 'SP014', 'SP016', 'SP020'],
    'offline',
    NOW() - INTERVAL '6 hours'
  ),
  (
    'Lý Thị Ngọc Ánh',
    '0899876543',
    'lythingocanh_zalo',
    'Miền Bắc',
    'Bắc Giang',
    true,
    4.75,
    198,
    ARRAY['SP017', 'SP015', 'SP020'],
    'offline',
    NOW() - INTERVAL '2 hours'
  );
