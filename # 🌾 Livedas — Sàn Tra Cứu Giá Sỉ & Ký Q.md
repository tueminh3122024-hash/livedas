# 🌾 Livedas — Sàn Tra Cứu Giá Sỉ & Ký Quỹ Nông - Thủy Sản Realtime
## Tài liệu Giới thiệu & Thuyết trình Dự án MVP (Presentation Data Sheet)

Dự án **Livedas** là nền tảng công nghệ nông nghiệp (AgriTech) tiên tiến, kết hợp giữa Bảng tra cứu giá sỉ thời gian thực, Hệ thống thương lượng đa phương tiện tích hợp AI dịch thuật trực tiếp và Quy trình giao dịch sỉ bảo chứng ký quỹ (Escrow) khép kín với mạng lưới vận chuyển Logistics toàn quốc.

---

## 🌟 Ý tưởng cốt lõi (Core Value Proposition)
Livedas giải quyết 3 bài toán lớn của thị trường sỉ nông - thủy hải sản Việt Nam:
1. **Mất cân bằng thông tin giá**: Thay vì phụ thuộc vào thương lái ép giá, bảng giá sỉ tự động cập nhật liên tục từ mạng lưới AI cào dữ liệu và các vựa sỉ lớn giúp giá cả minh bạch.
2. **Rào cản ngôn ngữ & vùng miền**: Hệ thống gọi thoại WebRTC tích hợp AI tự động chuyển đổi giọng nói vùng miền (Bắc/Trung/Nam) và dịch đa ngữ (Việt - Anh) giúp nhà vườn dễ dàng giao dịch với cả khách quốc tế và các tỉnh khác.
3. **Rủi ro bùng hàng / bùng tiền (Giao dịch ảo)**: Hệ thống ví tín dụng đóng băng ký quỹ (Escrow) ràng buộc trách nhiệm của cả Người mua (cọc 30-50%) và Người bán (ký quỹ số lượng MOQ chào bán) dưới sự tạm giữ của sàn, tự động tất toán giải ngân khi logistics cập nhật trạng thái giao thành công.

---

## 🛠️ Kiến trúc Hệ thống & Công nghệ (Tech Stack)
* **Frontend**: Next.js (App Router, React Server Components), CSS tối ưu Responsive Mobile.
* **Backend & Database**: Supabase Local (PostgreSQL, Supabase Auth, Realtime WebSocket, Storage).
* **Kết nối đa phương tiện**: Daily.co SDK (WebRTC Video/Audio Calling).
* **Trí tuệ nhân tạo (AI Engine)**: Web Speech API (nhận dạng giọng nói), Gemini AI (chuyển đổi giọng vùng miền và dịch thuật), ElevenLabs API (tạo giọng đọc nhân tạo chân thực).
* **Thanh toán tự động**: Cổng Sepay API kết nối VietQR động (MB Bank).
* **Logistics Engine**: Bộ tích hợp SDK đa nhà mạng (GHTK, GHN, ViettelPost, Livedas Logistics).

---

## 📦 Các Module MVP đã hoàn thiện trong ngày hôm nay

### 1. Bảng Giá Sỉ Realtime (Live Pricing Engine)
* **Hiển thị song song**: Hỗ trợ 2 ngành dọc lớn là **Nông Sản Sỉ** (20 mặt hàng baseline: sầu riêng, cà phê Robusta, bơ,...) và **Thủy Hải Sản Sỉ** (20 mặt hàng: tôm sú, cua biển Cà Mau, cá tra,...).
* **Dynamic Theme**: Tự động chuyển đổi giao diện động (Xanh lá Emerald tươi sáng cho nông sản vs Xanh dương Cyan đại dương cho thủy hải sản).
* **Hiệu ứng Flash cập nhật**: Kết nối Supabase Realtime qua kênh WebSocket. Khi có cập nhật giá mới từ thị trường hoặc agent cào dữ liệu gửi về, ô giá sỉ tương ứng sẽ nhấp nháy đỏ (nếu giá tăng) hoặc xanh lá (nếu giá giảm) trong 2 giây.
* **Mock Seeder**: API `/api/mock/generate` tự động nạp ngẫu nhiên hơn 200 báo giá lịch sử 24 giờ qua của 40 nông thủy sản để vẽ biểu đồ biến động tức thời.

### 2. Cuộc gọi Live & Trợ lý phiên dịch AI (WebRTC & Voice AI translation)
* **📹 Cuộc gọi Video WebRTC**: Tích hợp Daily.co trực tiếp trong Modal thông tin nhà vườn, cho phép người mua gọi video trực tiếp xem chất lượng nông sản tại vườn.
* **🎙️ AI Transcript & Translate**:
  * Tự động ghi âm và nhận dạng giọng nói tiếng Việt bằng Web Speech API.
  * Gửi đoạn text tới Gemini AI để dịch chuẩn hóa sang giọng Bắc phổ thông hoặc tiếng Anh.
  * Phát giọng đọc nhân tạo (Text-to-Speech) thông qua ElevenLabs API giúp người nghe hiểu ngay lập tức.
* **Giao diện di động**: Tận dụng tối đa chiều cao màn hình (`92vh`), phím micro tròn dạng nổi nhấp nháy bắt mắt và dễ bấm bằng một ngón tay.

### 3. Hệ thống Ví điểm & Đăng tin chào sỉ ký quỹ (Escrow Deposit System)
* **Ví số dư 2 ví**: Ví số dư Khả dụng (để nạp/rút/giao dịch) và Ví Ký quỹ (bị khóa để đảm bảo giao dịch).
* **Quy trình ký quỹ người bán (Seller Listing)**: Khi đăng tin bán sỉ bơ/cà phê, người bán phải ký quỹ cọc bảo chứng tương đương `MOQ * Đơn giá` nhằm ngăn chặn tin đăng ảo.
* **Quy trình ký quỹ người mua (Buyer Checkout)**: Người mua chốt đơn sỉ sẽ bị khấu trừ tiền cọc ký quỹ (30-50% đơn giá) chuyển vào tài khoản tạm giữ Escrow của đơn hàng.
* **Tự động đồng bộ vai trò (Trigger Sync)**: Database trigger tự động tạo tài khoản và liên kết profile người bán sang bảng hồ sơ bán sỉ ngay khi người dùng chọn đăng ký là "Nhà vườn / Vựa sỉ" (`dau@livedas.com`).

### 4. Cổng thanh toán tự động VietQR & Webhook Sepay
* **VietQR động**: Sinh mã QR chuẩn VietQR chuyển khoản đến tài khoản MB Bank, STK `0904774258`, tên `NGUYEN DUC DUY` với nội dung chuyển khoản định danh duy nhất dạng `LVDD[ID]`.
* **Webhook xử lý tức thời**: Endpoint tiếp nhận callback từ Sepay khi phát sinh giao dịch chuyển khoản thực tế, tự động cộng tiền (Credits) vào ví người bán sau 1 giây.
* **Cơ chế Active Sync**: Nút "Đã Chuyển Tiền ✓" trên giao diện cho phép chủ động yêu cầu hệ thống đồng bộ giao dịch tức thời (có mock fallback chạy dev cục bộ).

### 5. SDK Hợp nhất Logistics (GHTK, GHN, ViettelPost)
* **Logistics Client SDK**: Hợp nhất kết nối API tính phí ship dự kiến và khởi tạo vận đơn thực tế cho các đơn vị vận chuyển lớn (Giao Hàng Tiết Kiệm, Giao Hàng Nhanh, Viettel Post).
* **Duyệt đơn tự động**: Khi người bán bấm duyệt đơn sỉ nhận được, hệ thống tự động gọi SDK logistics để đăng ký mã tracking vận đơn thực tế và hiển thị tiến trình trên đơn hàng.

### 6. Live Shipping Tracking & Bản đồ định vị giả lập tương tác
* **Bản đồ Live GPS SVG**: Ánh xạ tọa độ kinh/vĩ độ thực tế từ vựa sỉ Cần Thơ đến Cai Lậy (Tiền Giang), Kho tổng TP.HCM và Địa chỉ Buyer thành đường đi đồ họa hoạt ảnh nét đứt chuyển động (`animate-dash`). Xe tải `🚚` di chuyển phát sóng aura định vị trực quan.
* **Nhật ký hành trình chi tiết (Timeline Logs)**: Ghi lại từng dấu mốc di chuyển của shipper kèm ghi chú trạng thái và tọa độ GPS thực tế.
* **Tất toán tự động trên giao nhận (Auto Escrow Release)**: Nút mô phỏng `⚡ Giao Hàng Chặng Tiếp Theo` cho phép dịch chuyển vị trí shipper. Khi chuyển sang trạng thái đã giao (`delivered`), hệ thống tự động thực hiện:
  1. Trả lại tiền cọc đăng tin ký quỹ của Người bán về ví khả dụng.
  2. Giải ngân tiền cọc mua sỉ của Người mua từ tài khoản tạm giữ (Escrow) sang ví khả dụng của Người bán.
  3. Cập nhật trạng thái đơn hàng thành hoàn tất (`completed`).

---

## 📊 Kế hoạch trình diễn Demo (Demo Flow Script)
1. **Bước 1**: Đăng nhập tài khoản Seller (`dau@livedas.com`, pass `123456`), xem số dư ví và tạo một tin đăng chào sỉ ký quỹ nông sản (ví dụ: Robusta, MOQ 200kg). Hệ thống khóa cọc ký quỹ tương ứng.
2. **Bước 2**: Đăng xuất và đăng nhập tài khoản Buyer, vào bảng giá chọn vựa sỉ vừa đăng và bấm **📦 Chốt Sỉ** cọc 30%.
3. **Bước 3**: Chuyển đổi đăng nhập lại tài khoản Seller, vào Kênh Người Bán duyệt đơn hàng nhận được, chọn nhà vận chuyển `GHTK` để tạo vận đơn và lấy link live tracking.
4. **Bước 4**: Click mã vận đơn sang trang **Live Tracking**. Nhấn **`⚡ Giao Hàng Chặng Tiếp Theo`** từng lần một để xem xe tải di chuyển trên bản đồ và cập nhật logs. Ở bước cuối cùng, ví của người bán sẽ tự động nổ số dư tăng lên do nhận giải ngân và nhận lại cọc tin đăng!
