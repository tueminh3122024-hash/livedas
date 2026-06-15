# 🌾 SÀN GIÁ SỈ NÔNG SẢN REALTIME — CONCEPT DOCUMENT
**Version:** 1.0
**Author:** AI System Design
**Scope:** Multi-Agent Price Aggregation + Realtime Wholesale Marketplace

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mục tiêu
Xây dựng một **sàn giao dịch sỉ nông sản trực tuyến** hoạt động realtime, kết nối:
- **Người thu thập giá** (Agent tự động) ← chợ đầu mối, đầu nậu, sàn TMĐT
- **Người mua sỉ** (Doanh nghiệp, thương lái) ← xem giá tham khảo realtime
- **Người bán sỉ** (Đầu nậu, nhà vườn, vựa) ← được kết nối trực tiếp qua live call

### 1.2 Value Proposition
| Đối tượng | Lợi ích |
|-----------|---------|
| Người mua | Xem giá thị trường tổng hợp từ nhiều nguồn, không cần gọi từng đầu nậu |
| Người bán | Tiếp cận buyer chất lượng, không cần quảng cáo |
| Thị trường | Minh bạch giá, giảm chênh lệch thông tin giữa các khu vực |

### 1.3 Phạm vi địa lý
- **Khu vực thu thập:** Miền Tây Nam Bộ (7 tỉnh thành chủ lực)
- **Chợ đầu mối:** Bình Điền, Thủ Đức, Hóc Môn (TP.HCM)
- **Hub nông sản:** Tiền Giang, Bến Tre, Long An, Đồng Tháp, Cần Thơ, Hậu Giang, Kiên Giang

---

## 2. DANH SÁCH 20 SẢN PHẨM

| ID | Sản phẩm | Giống/Loại | Đơn vị | Vùng chính |
|----|----------|------------|--------|------------|
| SP001 | Cà phê Robusta | Đắk Lắk, Lâm Đồng | kg | Tây Nguyên |
| SP002 | Cà phê Arabica | Cầu Đất, Sơn La | kg | Tây Nguyên |
| SP003 | Ca cao | Bến Tre, Tiền Giang | kg | Miền Tây |
| SP004 | Sầu riêng Ri6 | Tiền Giang | kg | Tiền Giang |
| SP005 | Sầu riêng Musang King | Bình Phước | kg | Đông Nam Bộ |
| SP006 | Bơ Booth | Đắk Lắk | kg | Tây Nguyên |
| SP007 | Bơ 034 | Lâm Đồng | kg | Tây Nguyên |
| SP008 | Chuối già Nam Mỹ | Long An, Đồng Nai | nải | Miền Tây |
| SP009 | Dứa (Khóm) | Kiên Giang, Long An | quả | Miền Tây |
| SP010 | Khoai lang tím | Vĩnh Long | kg | Miền Tây |
| SP011 | Xoài cát Hòa Lộc | Tiền Giang, Đồng Tháp | kg | Miền Tây |
| SP012 | Mít Thái | Long An, Bình Dương | kg | Miền Nam |
| SP013 | Dừa khô | Bến Tre | trái | Bến Tre |
| SP014 | Thanh long ruột đỏ | Bình Thuận, Long An | kg | Miền Nam |
| SP015 | Nhãn Ido | Hậu Giang, Vĩnh Long | kg | Miền Tây |
| SP016 | Chôm chôm Java | Bến Tre, Long Khánh | kg | Miền Nam |
| SP017 | Vải thiều | Bắc Giang, Hải Dương | kg | Miền Bắc |
| SP018 | Măng cụt | Bình Dương, Bến Tre | kg | Miền Nam |
| SP019 | Chanh không hạt | Long An, Hậu Giang | kg | Miền Tây |
| SP020 | Ớt chỉ thiên | Bình Thuận, Đồng Nai | kg | Miền Nam |

---

## 3. KIẾN TRÚC HỆ THỐNG

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
│  [Chợ đầu mối]  [Sàn TMĐT]  [Đầu nậu Zalo]  [Facebook Groups] │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     AGENT LAYER (TIER 1)                         │
│  [MarketCrawler]  [RegionalDealer]  [SocialListener]            │
└────────────────────────┬────────────────────────────────────────┘
                         │ Raw Price Data
┌────────────────────────▼────────────────────────────────────────┐
│                    KAFKA MESSAGE QUEUE                            │
│  raw.prices.market | raw.prices.dealers | raw.prices.social     │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   PROCESSING LAYER (TIER 2)                       │
│          [DataCleaner_Agent]  [PriceAnalytics_Agent]            │
└────────────────────────┬────────────────────────────────────────┘
                         │ Clean + Analyzed Data
┌────────────────────────▼────────────────────────────────────────┐
│                    ORCHESTRATOR (TIER 3)                          │
│                   [Orchestrator_Agent]                            │
│              Redis Cache | PostgreSQL | TimescaleDB              │
└────────────────────────┬────────────────────────────────────────┘
                         │ WebSocket Stream
┌────────────────────────▼────────────────────────────────────────┐
│                    REALTIME FRONTEND                              │
│         Next.js + Socket.io → Price Grid UI (20 boxes)          │
└────────────────────────┬────────────────────────────────────────┘
                         │ User Click "Kết nối"
┌────────────────────────▼────────────────────────────────────────┐
│                    LIVE CALL ENGINE                               │
│              WebRTC (Daily.co) + Seller Notification             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 6 AI AGENTS

### 4.1 MarketCrawler_Agent (Claude Sonnet) — Cron 15 phút
Nguồn: Chợ Bình Điền, Thủ Đức, Postmart, Voso, Shopee/Tiki sỉ

### 4.2 RegionalDealer_Agent (Claude Sonnet) — Push + Pull 30 phút
Kênh: Zalo OA, Telegram Bot, WhatsApp Business, Google Form

### 4.3 SocialListener_Agent (Claude Haiku) — Poll 10 phút
Nguồn: Facebook Groups, Zalo Groups, Telegram Channels

### 4.4 DataCleaner_Agent (Claude Haiku) — Event-driven
Pipeline: Normalize → Outlier Detection → Dedup → Enrichment → Confidence Score

### 4.5 PriceAnalytics_Agent — Event-driven
Tính: Weighted Average, Trend, Supply Level, Regional Breakdown

### 4.6 Orchestrator_Agent (Claude Opus) — Always-on
Quản lý: Health Check, Scheduling, Failover, Alert

---

## 5. DATABASE SCHEMA

### PostgreSQL
- products (20 sản phẩm SP001-SP020)
- sellers (đầu nậu, nhà vườn)
- price_entries (raw prices từ agents)
- current_prices (1 record/sản phẩm, realtime)
- call_logs (lịch sử gọi)

### TimescaleDB
- price_history hypertable (time series)

### Redis Cache
- price:{product_id} (TTL 20 phút)
- sellers:{product_id}:active (TTL 15 phút)
- market:summary (TTL 5 phút)

---

## 6. TECH STACK

### Backend
| Component | Technology |
|-----------|-----------|
| Agent Framework | LangGraph / CrewAI |
| LLM Main | Claude Sonnet 4.6 |
| LLM Fast | Claude Haiku 4.5 |
| LLM Orchestrator | Claude Opus 4.6 |
| Message Queue | Apache Kafka |
| API Server | FastAPI (Python) |
| WebSocket | Node.js + Socket.io |
| Database | PostgreSQL 15 |
| Time-series | TimescaleDB |
| Cache | Redis 7 |
| Job Scheduler | Celery + Redis |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | TailwindCSS |
| State | Zustand |
| WebSocket | Socket.io-client |
| Live Call | Daily.co React SDK |
| Charts | Recharts |
| Animations | Framer Motion |

---

## 7. SECURITY & COMPLIANCE

### Authentication
- Buyer: SĐT + OTP hoặc guest email
- Seller: KYC (CCCD + SĐT)
- Admin: MFA bắt buộc

### Data Privacy
- Không lưu nội dung cuộc gọi
- SĐT seller ẩn đến khi call connect
- GDPR-compliant

### Anti-Spam
- Max 10 call/buyer/ngày
- 3 reports → review thủ công
- Price manipulation detection

---

## 8. DEPLOYMENT TIMELINE

### Phase 1 (Tháng 1-2): MVP
- [ ] Agent 1 (MarketCrawler) với 3 nguồn
- [ ] Agent 2 (RegionalDealer) với Zalo OA
- [ ] DataCleaner + Analytics cơ bản
- [ ] Frontend grid UI + WebSocket
- [ ] 5 sản phẩm đầu: SP004, SP008, SP011, SP013, SP019

### Phase 2 (Tháng 3-4): Full Product
- [ ] Tất cả 20 sản phẩm
- [ ] WebRTC live call
- [ ] SocialListener Agent
- [ ] Seller PWA
- [ ] Rating system

### Phase 3 (Tháng 5-6): Scale
- [ ] Kubernetes deployment
- [ ] Thêm nguồn dữ liệu
- [ ] Analytics dashboard
- [ ] Public API
- [ ] Push notification

---

## 9. KPIs

| Metric | Target MVP | Target Phase 3 |
|--------|-----------|----------------|
| Sản phẩm | 5 | 20+ |
| Nguồn giá/SP | 3 | 10+ |
| Refresh rate | 15 phút | 5 phút |
| Active sellers | 20 | 200+ |
| DAU buyers | 100 | 5,000+ |
| Call connect rate | 70% | 85%+ |
| Data uptime | 95% | 99.5% |
| WS latency | <2s | <500ms |

---

*Document version 1.0 — Cập nhật theo tiến độ development*
