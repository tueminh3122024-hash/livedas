-- ==========================================================
-- Migration: Sepay Payment Requests & Banking Transactions
-- ==========================================================

-- A. Bảng yêu cầu nạp tiền (Payment Requests)
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  code VARCHAR(30) UNIQUE NOT NULL,                             -- Mã chuyển khoản duy nhất (LVDD1001, LVDD1002...)
  status VARCHAR(20) DEFAULT 'pending',                         -- pending|completed|expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.payment_requests IS 'Danh sách yêu cầu nạp tiền (Credits) của người dùng';
COMMENT ON COLUMN public.payment_requests.code IS 'Mã khớp lệnh chuyển khoản ngân hàng';

-- Index phục vụ tra cứu khớp lệnh nhanh
CREATE INDEX IF NOT EXISTS idx_payment_requests_code ON public.payment_requests(code);

-- B. Bảng lưu trữ lịch sử giao dịch từ Sepay để chống trùng chi
CREATE TABLE IF NOT EXISTS public.sepay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sepay_id BIGINT UNIQUE NOT NULL,                              -- ID giao dịch của hệ thống Sepay
  bank_brand_name VARCHAR(50),                                  -- Thương hiệu ngân hàng nhận (MBBank, Vietcombank...)
  amount BIGINT NOT NULL,                                       -- Số tiền thực nhận chuyển khoản
  transaction_date TIMESTAMPTZ,                                 -- Ngày giờ giao dịch của ngân hàng
  content TEXT,                                                 -- Nội dung chuyển khoản thô
  reference_code VARCHAR(100),                                  -- Mã tham chiếu ngân hàng
  raw_payload JSONB,                                            -- Payload JSON thô từ Sepay để kiểm toán
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.sepay_transactions IS 'Lịch sử nhận giao dịch ngân hàng qua Sepay đối chiếu chống trùng chi';
