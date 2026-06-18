import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  try {
    const { sellerId } = await params;
    const body = await request.json();
    const { rating, product_id, contact_method, notes } = body;

    // Validate rating
    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    // 1. Lấy thông tin hiện tại của seller để cập nhật rating luỹ kế
    const { data: seller, error: getError } = await supabase
      .from('sellers')
      .select('rating, total_transactions')
      .eq('id', sellerId)
      .single();

    if (getError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const currentRating = parseFloat(String(seller.rating || 0));
    const currentTx = parseInt(String(seller.total_transactions || 0), 10);

    const newTx = currentTx + 1;
    // Tính trung bình cộng tích luỹ mới
    const newRating = parseFloat((((currentRating * currentTx) + ratingNum) / newTx).toFixed(2));

    // 2. Cập nhật seller
    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        rating: newRating,
        total_transactions: newTx
      })
      .eq('id', sellerId);

    if (updateError) {
      console.error('Error updating seller rating:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Tạo bản ghi call_logs
    const buyerSession = request.headers.get('x-buyer-session') || 'anonymous_buyer';
    const { error: logError } = await supabase
      .from('call_logs')
      .insert({
        buyer_session: buyerSession,
        seller_id: sellerId,
        product_id: product_id || null,
        contact_method: contact_method || 'zalo',
        ended_at: new Date().toISOString(),
        duration_seconds: Math.floor(10 + Math.random() * 120), // mock thời lượng cuộc gọi
        outcome: 'deal',
        buyer_rating: ratingNum,
        notes: notes || 'Đánh giá từ người mua sau khi kết nối'
      });

    if (logError) {
      console.error('Error logging call:', logError);
    }

    return NextResponse.json({
      success: true,
      newRating,
      total_transactions: newTx
    });
  } catch (error: any) {
    console.error('API /api/sellers/[sellerId]/rating crash:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
