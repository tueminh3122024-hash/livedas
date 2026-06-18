import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sellerId, productId, contactMethod } = await request.json();

    if (!sellerId || !productId) {
      return NextResponse.json({ error: 'Missing sellerId or productId' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    // 1. Kiểm tra xem seller có tồn tại không
    const { data: seller, error: sellerErr } = await supabase
      .from('sellers')
      .select('name, phone')
      .eq('id', sellerId)
      .single();

    if (sellerErr || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // 2. Tạo phòng WebRTC Daily.co
    // Thực tế sẽ gọi tới Daily.co API: https://api.daily.co/v1/rooms
    let roomUrl = '';
    const dailyApiKey = process.env.DAILY_API_KEY;

    if (dailyApiKey) {
      try {
        const res = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dailyApiKey}`,
          },
          body: JSON.stringify({
            properties: {
              enable_chat: true,
              enable_people_ui: true,
              exp: Math.floor(Date.now() / 1000) + 3600, // sống trong 1 tiếng
            },
          }),
        });
        const dailyRoom = await res.json();
        roomUrl = dailyRoom.url;
      } catch (err) {
        console.error('Failed to create room via Daily.co API, falling back to mock:', err);
      }
    }

    // Trình tự fallback hoặc chế độ Demo local
    if (!roomUrl) {
      const mockRoomId = `livedas-room-${Math.random().toString(36).substring(2, 11)}`;
      roomUrl = `https://demo.daily.co/${mockRoomId}`;
    }

    // 3. Tạo bản ghi call_logs với trạng thái đang gọi
    const buyerSession = request.headers.get('x-buyer-session') || 'anonymous_buyer';
    const { data: log, error: logErr } = await supabase
      .from('call_logs')
      .insert({
        buyer_session: buyerSession,
        seller_id: sellerId,
        product_id: productId,
        contact_method: contactMethod || 'webrtc',
        outcome: 'no_answer' // Trạng thái mặc định ban đầu
      })
      .select()
      .single();

    if (logErr) {
      console.error('Error logging call initiation:', logErr);
    }

    return NextResponse.json({
      success: true,
      roomUrl,
      callLogId: log?.id || null,
      sellerName: seller.name
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
