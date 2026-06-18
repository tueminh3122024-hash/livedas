-- ==========================================================
-- Migration: Seller Hub, Escrow/Deposit & Logistics Tables
-- ==========================================================

-- A. Bảng ví số dư (Wallets) cho người dùng
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance BIGINT DEFAULT 0 CHECK (balance >= 0),                 -- Số dư khả dụng
  locked_balance BIGINT DEFAULT 0 CHECK (locked_balance >= 0),   -- Số dư bị đóng băng ký quỹ
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.wallets IS 'Quản lý số dư khả dụng và đóng băng ký quỹ của người dùng';

-- B. Bảng lịch sử giao dịch ví (Wallet Transactions)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,                                       -- Số tiền giao dịch (dương = nhận, âm = chi/khóa)
  tx_type VARCHAR(30) NOT NULL,                                 -- deposit|withdraw|lock_listing|unlock_listing|lock_escrow|release_escrow|refund
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.wallet_transactions IS 'Lịch sử giao dịch ví tài chính';

-- C. Bảng tin bán sỉ của Seller kèm ký quỹ (Seller Listings)
CREATE TABLE IF NOT EXISTS public.seller_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  product_id VARCHAR(10) REFERENCES public.products(id) ON DELETE CASCADE,
  price_per_kg INTEGER NOT NULL CHECK (price_per_kg > 0),
  min_quantity_kg INTEGER NOT NULL CHECK (min_quantity_kg > 0),
  total_available_kg INTEGER NOT NULL CHECK (total_available_kg >= 0),
  deposit_amount BIGINT NOT NULL CHECK (deposit_amount >= 0),   -- Tiền ký quỹ tương ứng (MOQ * Price)
  status VARCHAR(20) DEFAULT 'active',                          -- active|sold_out|inactive
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.seller_listings IS 'Danh sách tin chào bán sỉ của nhà vườn kèm ký quỹ đảm bảo';

-- D. Bảng đơn đặt hàng sỉ trung gian (Wholesale Orders / Escrow Transactions)
CREATE TABLE IF NOT EXISTS public.wholesale_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.seller_listings(id) ON DELETE CASCADE,
  quantity_kg INTEGER NOT NULL CHECK (quantity_kg > 0),
  price_per_kg INTEGER NOT NULL CHECK (price_per_kg > 0),
  total_amount BIGINT NOT NULL CHECK (total_amount > 0),
  deposit_percentage INTEGER NOT NULL CHECK (deposit_percentage BETWEEN 30 AND 50),
  buyer_deposit_amount BIGINT NOT NULL CHECK (buyer_deposit_amount > 0), -- Số tiền buyer ký quỹ thực tế
  status VARCHAR(30) DEFAULT 'pending_deposit',                 -- pending_deposit|escrowed|confirmed|shipping|completed|cancelled
  delivery_address TEXT NOT NULL,
  buyer_phone VARCHAR(15) NOT NULL,
  delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.wholesale_orders IS 'Đơn đặt hàng mua sỉ ký quỹ trung gian Escrow';

-- E. Bảng vận đơn Logistics kết nối mở (Logistic Dispatches)
CREATE TABLE IF NOT EXISTS public.logistic_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.wholesale_orders(id) ON DELETE CASCADE UNIQUE,
  carrier_name VARCHAR(50) NOT NULL,                            -- GHTK|GHN|ViettelPost|LivedasCarrier
  tracking_number VARCHAR(100) UNIQUE,
  shipping_fee INTEGER DEFAULT 0 CHECK (shipping_fee >= 0),
  status VARCHAR(30) DEFAULT 'draft',                           -- draft|assigned|picked_up|in_transit|delivered|failed
  pickup_scheduled_at TIMESTAMPTZ,
  actual_pickup_at TIMESTAMPTZ,
  actual_delivery_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.logistic_dispatches IS 'Thông tin vận đơn của đối tác logistics liên kết';

-- F. Trigger tự động cấp ví rỗng khi có profile mới được tạo
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, locked_balance)
  VALUES (new.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();

-- G. Tự tạo ví cho các profile đã tồn tại sẵn trong hệ thống (nếu có)
INSERT INTO public.wallets (user_id, balance, locked_balance)
SELECT id, 100000000, 0 -- Nạp sẵn 100 triệu cho các tài khoản hiện tại test cho tiện
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
