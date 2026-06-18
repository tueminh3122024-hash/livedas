-- ==========================================================
-- Migration: Liên kết tài khoản Auth và Hồ sơ Người bán
-- ==========================================================

-- 1. Thêm cột user_id vào bảng sellers để liên kết với auth.users
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE;

COMMENT ON COLUMN public.sellers.user_id IS 'ID tài khoản auth của người bán';

-- 2. Hàm trigger tự động đồng bộ/tạo hồ sơ sellers khi profile là seller hoặc admin
CREATE OR REPLACE FUNCTION public.handle_seller_profile_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Nếu role được đặt là seller hoặc admin, tạo/cập nhật hồ sơ trong bảng sellers
  IF new.role IN ('seller', 'admin') THEN
    INSERT INTO public.sellers (id, name, phone, zalo_id, region, province, verified, rating, status, user_id, specialty)
    VALUES (
      new.id, -- Sử dụng luôn id của profile làm seller id để đơn giản hóa quan hệ 1:1
      new.name,
      new.phone,
      new.phone,
      'Miền Tây', -- Vùng mặc định, seller có thể sửa sau
      'Cần Thơ',  -- Tỉnh mặc định, seller có thể sửa sau
      true,       -- Tự động xác minh cho demo
      5.0,
      'online',
      new.id,
      ARRAY[]::TEXT[]
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      name = COALESCE(new.name, public.sellers.name),
      phone = COALESCE(new.phone, public.sellers.phone),
      user_id = new.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gán trigger cho bảng profiles
DROP TRIGGER IF EXISTS on_profile_role_seller ON public.profiles;
CREATE TRIGGER on_profile_role_seller
  AFTER INSERT OR UPDATE OF role, name, phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_seller_profile_sync();

-- 3. Đồng bộ hóa ví có sẵn số dư lớn cho các seller hoặc admin
-- Cho phép nạp sẵn 100 triệu Credits cho tài khoản test admin
INSERT INTO public.wallets (user_id, balance, locked_balance)
SELECT id, 100000000, 0
FROM public.profiles
WHERE role IN ('seller', 'admin')
ON CONFLICT (user_id) DO NOTHING;
