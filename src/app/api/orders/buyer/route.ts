import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { nq } from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lấy tất cả các đơn mua sỉ của người mua hiện tại
    const orders = await nq(
      `SELECT wo.*, p.name as product_name, p.emoji as product_emoji, p.unit as product_unit, s.name as seller_name,
              ld.status as shipping_status, ld.tracking_number, ld.carrier_name, ld.shipping_fee
       FROM wholesale_orders wo
       JOIN seller_listings sl ON wo.listing_id = sl.id
       JOIN products p ON sl.product_id = p.id
       JOIN sellers s ON wo.seller_id = s.id
       LEFT JOIN logistic_dispatches ld ON wo.id = ld.order_id
       WHERE wo.buyer_id = $1
       ORDER BY wo.created_at DESC`,
      [user.id]
    );

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('GET /api/orders/buyer error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
