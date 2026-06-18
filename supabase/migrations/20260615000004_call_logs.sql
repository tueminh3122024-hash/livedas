-- =============================================
-- Bảng lịch sử liên hệ (Call Logs Table)
-- Ghi nhận mỗi lần người mua liên hệ người bán
-- Qua Zalo hoặc điện thoại
-- =============================================

CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_session VARCHAR(100),
  seller_id UUID REFERENCES sellers(id),
  product_id VARCHAR(10) REFERENCES products(id),
  contact_method VARCHAR(20) DEFAULT 'zalo', -- zalo|phone|webrtc
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  outcome VARCHAR(20), -- deal|no_deal|no_answer|cancelled
  buyer_rating INTEGER CHECK (buyer_rating BETWEEN 1 AND 5),
  notes TEXT
);

COMMENT ON TABLE call_logs IS 'Lịch sử liên hệ giữa người mua và người bán';
COMMENT ON COLUMN call_logs.buyer_session IS 'Session ID ẩn danh của người mua (chưa cần đăng ký)';
COMMENT ON COLUMN call_logs.contact_method IS 'Phương thức liên hệ: zalo, phone (điện thoại), webrtc (tương lai)';
COMMENT ON COLUMN call_logs.outcome IS 'Kết quả: deal (thỏa thuận), no_deal (không thỏa thuận), no_answer (không nghe), cancelled (hủy)';

-- =============================================
-- Indexes cho báo cáo và phân tích
-- =============================================

-- Truy vấn lịch sử liên hệ theo người bán
CREATE INDEX idx_call_logs_seller ON call_logs(seller_id, started_at DESC);

-- Truy vấn theo sản phẩm (sản phẩm nào được hỏi nhiều nhất)
CREATE INDEX idx_call_logs_product ON call_logs(product_id, started_at DESC);

-- Truy vấn theo kết quả (thống kê tỷ lệ thành công)
CREATE INDEX idx_call_logs_outcome ON call_logs(outcome);
