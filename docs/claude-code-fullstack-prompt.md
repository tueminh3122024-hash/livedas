# 🤖 CLAUDE CODE — FULLSTACK BUILD PROMPT
# Sàn Giá Sỉ Nông Sản Realtime (Multi-Agent + WebSocket + WebRTC)

---

## ═══════════════════════════════════════════════
## MASTER PROMPT — PASTE VÀO CLAUDE CODE
## ═══════════════════════════════════════════════

```
You are an expert fullstack engineer. Build a complete realtime wholesale agricultural price marketplace system called "SànSỉNôngSản" using the following specifications. This is a production-ready codebase with multi-agent AI pipeline, real-time WebSocket price streaming, and WebRTC live calling.

Generate the complete project structure and all files needed.
```

---

## ═══════════════════════════════════════════════
## STEP 1 — PROJECT SCAFFOLDING PROMPT
## ═══════════════════════════════════════════════

```
Create a monorepo project with the following structure:

san-si-nong-san/
├── apps/
│   ├── backend/           # FastAPI Python backend
│   ├── agents/            # AI agent pipeline (Python)
│   ├── websocket/         # Node.js Socket.io server
│   └── frontend/          # Next.js 14 frontend
├── packages/
│   ├── shared-types/      # Shared TypeScript types
│   └── db-schema/         # Database migrations
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── k8s/               # Kubernetes manifests
├── .env.example
└── README.md

Initialize each app with:
- backend: FastAPI + SQLAlchemy + Alembic + Redis + Kafka
- agents: LangGraph + Anthropic SDK + Playwright + Celery
- websocket: Node.js + Socket.io + KafkaJS
- frontend: Next.js 14 (App Router) + TailwindCSS + Zustand + Socket.io-client

Create all package.json, requirements.txt, pyproject.toml files.
Create docker-compose.yml with services: postgres, timescaledb, redis, kafka, zookeeper.
```

---

## ═══════════════════════════════════════════════
## STEP 2 — DATABASE SCHEMA PROMPT
## ═══════════════════════════════════════════════

```
Create complete database setup for the agricultural price marketplace:

1. products table: id(VARCHAR PK), name, name_en, category, unit, emoji, primary_region, image_url, active
2. sellers table: id(UUID PK), name, zalo_id, phone, region, province, verified, rating, total_transactions, specialty, status
3. price_entries table: id(UUID PK), product_id(FK), seller_id(FK), source_type, source_name, price_min/max/avg, volume_kg, region, confidence, raw_text
4. current_prices table: product_id(PK FK), price_avg/min/max/recommended, trend_direction, change_1h/24h, active_sellers, supply_level
5. call_logs table: id(UUID PK), buyer_session, seller_id(FK), product_id, room_id, started_at/ended_at, duration_seconds, outcome, buyer_rating

TimescaleDB price_history hypertable.
Seed 20 products: SP001-SP020 (Robusta, Arabica, Ca cao, Sầu riêng Ri6, Musang King, Bơ Booth/034, Chuối, Dứa, Khoai lang tím, Xoài Hòa Lộc, Mít Thái, Dừa khô, Thanh long đỏ, Nhãn Ido, Chôm chôm, Vải thiều, Măng cụt, Chanh không hạt, Ớt chỉ thiên)
```

---

## ═══════════════════════════════════════════════
## STEP 3 — BACKEND API (FastAPI)
## ═══════════════════════════════════════════════

- GET /api/prices — all current prices + products
- GET /api/prices/{product_id} — single price + sellers
- GET /api/prices/{product_id}/history?hours=24 — TimescaleDB history
- GET /api/prices/{product_id}/sellers — active sellers sorted by rating
- GET /api/sellers — list verified sellers
- POST /api/sellers/{seller_id}/rating — submit rating
- POST /api/calls/initiate — create Daily.co WebRTC room
- POST /api/ingest/price — ingest from agents

Services: daily_service, notification_service (Zalo, Twilio), price_service

---

## ═══════════════════════════════════════════════
## STEP 4 — AI AGENTS PIPELINE
## ═══════════════════════════════════════════════

6 Agents:
1. MarketCrawlerAgent (Claude Sonnet) — scrape Bình Điền, Postmart, Voso
2. RegionalDealerAgent (Claude Sonnet) — Zalo/Telegram webhook, NLP parse VN price text
3. SocialListenerAgent (Claude Haiku) — scan FB/Telegram groups
4. DataCleanerAgent (Claude Haiku) — normalize, outlier detection, dedup
5. PriceAnalyticsAgent — weighted avg, trend, supply level
6. OrchestratorAgent (Claude Opus) — health monitor, scheduling, failover

---

## ═══════════════════════════════════════════════
## STEP 5 — WEBSOCKET SERVER
## ═══════════════════════════════════════════════

Node.js + Socket.io + KafkaJS consumer
Events: price:update, price:flash, seller:status, market:summary

---

## ═══════════════════════════════════════════════
## STEP 6 — FRONTEND (Next.js 14)
## ═══════════════════════════════════════════════

- Price Grid: 5-col desktop, 3-col tablet, 2-col mobile
- PriceBox: emoji + name + price + trend arrow + seller count + "Kết nối" button
- Flash animation (red=up, green=down)
- Seller modal → WebRTC call via Daily.co
- Mini chart (Recharts), animations (Framer Motion)

---

## ═══════════════════════════════════════════════
## STEP 7 — DOCKER COMPOSE
## ═══════════════════════════════════════════════

Services: postgres, timescaledb, redis, kafka, zookeeper, kafka-ui, backend, agents, websocket, frontend

---

## ═══════════════════════════════════════════════
## STEP 8 — MOCK DATA & TESTING
## ═══════════════════════════════════════════════

MockPriceGenerator with realistic VND price ranges per product.
Demo mode runs WITHOUT real API keys.

---

## ═══════════════════════════════════════════════
## IMPORTANT NOTES
## ═══════════════════════════════════════════════

1. ERROR HANDLING: try/catch everywhere
2. VIETNAMESE TEXT: UTF-8, all user-facing strings in Vietnamese
3. PRICE FORMATTING: toLocaleString('vi-VN') → "51.000đ"
4. REALTIME UX: flash green/red, spinner, staleness indicator
5. SELLER PRIVACY: hide phone until call connected
6. MOBILE RESPONSIVE: 2-col mobile, 3-4 tablet, 5 desktop
7. MOCK MODE: works without external API keys
8. TYPESCRIPT STRICT: no any types
9. CODE COMMENTS: Vietnamese for business logic
10. LOGGING: structured JSON logging
