-- =============================================
-- Migration: Phân quyền Profiles, Nguồn cào, và WebRTC Call Logs
-- =============================================

-- 1. Tạo bảng profiles liên kết với auth.users của Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100),
  email VARCHAR(100),
  role VARCHAR(20) DEFAULT 'buyer', -- buyer|seller|admin
  avatar_url TEXT,
  phone VARCHAR(15),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm comment cho bảng profiles
COMMENT ON TABLE public.profiles IS 'Thông tin tài khoản và phân quyền người dùng';
COMMENT ON COLUMN public.profiles.role IS 'Quyền hạn: buyer (người mua), seller (người bán), admin (quản trị viên)';

-- Enable Row Level Security (RLS) nhưng cho phép đọc công khai để đơn giản hóa local dev
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép đọc công khai profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Cho phép người dùng tự cập nhật profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Hàm trigger tự động tạo profile khi người dùng đăng ký qua auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role VARCHAR(20) := 'buyer';
BEGIN
  -- Nếu email đăng ký là admin@livedas.com thì tự động gán role admin cho tiện test
  IF new.email = 'admin@livedas.com' THEN
    default_role := 'admin';
  ELSE
    default_role := COALESCE(new.raw_user_meta_data->>'role', 'buyer');
  END IF;

  INSERT INTO public.profiles (id, name, email, role, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    default_role,
    new.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gán trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Tạo bảng quản lý các nguồn liên kết cào dữ liệu từ bên ngoài
CREATE TABLE IF NOT EXISTS public.crawl_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  vertical VARCHAR(20) NOT NULL, -- agriculture|seafood
  status VARCHAR(20) DEFAULT 'active', -- active|inactive
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.crawl_sources IS 'Danh sách các link liên kết cào dữ liệu từ bên ngoài';

-- Seed dữ liệu mẫu cho crawl_sources
INSERT INTO public.crawl_sources (name, url, vertical) VALUES
  ('Chợ đầu mối Bình Điền', 'https://chobinhdien.com.vn/gia-ca-hang-ngay/', 'agriculture'),
  ('Sở NN&PTNT Tiền Giang', 'http://sonnptnt.tiengiang.gov.vn/tin-gia-ca-thi-truong', 'agriculture'),
  ('Vựa Thủy Sản Miền Tây', 'https://vuthuysanmientay.vn/gia-tom-ca-realtime', 'seafood'),
  ('Hợp tác xã Thủy sản Cà Mau', 'https://htxthuysancamau.com.vn/gia-cua-bien', 'seafood');
