-- ==========================================================
-- Migration: Live Shipping Tracking, Coordinates, & Timeline Logs
-- ==========================================================

-- 1. Thêm các trường vị trí và nhân viên giao hàng vào bảng public.logistic_dispatches
ALTER TABLE public.logistic_dispatches 
  ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS current_location_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS rider_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rider_phone VARCHAR(15),
  ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS origin_latitude DECIMAL(9,6) DEFAULT 10.03711,
  ADD COLUMN IF NOT EXISTS origin_longitude DECIMAL(9,6) DEFAULT 105.78825,
  ADD COLUMN IF NOT EXISTS destination_latitude DECIMAL(9,6) DEFAULT 10.762622,
  ADD COLUMN IF NOT EXISTS destination_longitude DECIMAL(9,6) DEFAULT 106.660172;

COMMENT ON COLUMN public.logistic_dispatches.current_latitude IS 'Vĩ độ vị trí hiện tại của shipper';
COMMENT ON COLUMN public.logistic_dispatches.current_longitude IS 'Kinh độ vị trí hiện tại của shipper';
COMMENT ON COLUMN public.logistic_dispatches.origin_latitude IS 'Vĩ độ điểm xuất phát (mặc định Cần Thơ)';
COMMENT ON COLUMN public.logistic_dispatches.origin_longitude IS 'Kinh độ điểm xuất phát (mặc định Cần Thơ)';
COMMENT ON COLUMN public.logistic_dispatches.destination_latitude IS 'Vĩ độ điểm giao nhận đích (mặc định TP.HCM)';
COMMENT ON COLUMN public.logistic_dispatches.destination_longitude IS 'Kinh độ điểm giao nhận đích (mặc định TP.HCM)';

-- 2. Tạo bảng lưu nhật ký hành trình / lịch sử di chuyển (Logistic Tracking Logs)
CREATE TABLE IF NOT EXISTS public.logistic_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID REFERENCES public.logistic_dispatches(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL, -- pickup_scheduled|picked_up|in_transit|out_for_delivery|delivered|failed
  location_name VARCHAR(200) NOT NULL, -- Ví dụ: "Kho Cần Thơ", "QL1A Tiền Giang"
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.logistic_tracking_logs IS 'Nhật ký lịch sử di chuyển chi tiết thời gian thực của vận đơn';

-- 3. Tạo index phục vụ tối ưu hóa truy vấn tracking logs
CREATE INDEX IF NOT EXISTS idx_tracking_logs_dispatch_id ON public.logistic_tracking_logs(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_created_at ON public.logistic_tracking_logs(created_at DESC);
