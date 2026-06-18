import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { nq, nq1 } from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Tìm bản ghi seller tương ứng với user đang đăng nhập
    const seller = await nq1('SELECT id FROM sellers WHERE user_id = $1 OR id = $1', [user.id]);
    if (!seller) {
      return NextResponse.json({ orders: [] });
    }

    // 2. Lấy danh sách các đơn hàng sỉ mà seller này nhận được
    const orders = await nq(
      `SELECT wo.*, p.name as product_name, p.emoji as product_emoji, p.unit as product_unit, pr.name as buyer_name,
              ld.status as shipping_status, ld.tracking_number, ld.carrier_name, ld.shipping_fee, ld.id as dispatch_id
       FROM wholesale_orders wo
       JOIN seller_listings sl ON wo.listing_id = sl.id
       JOIN products p ON sl.product_id = p.id
       JOIN profiles pr ON wo.buyer_id = pr.id
       LEFT JOIN logistic_dispatches ld ON wo.id = ld.order_id
       WHERE wo.seller_id = $1
       ORDER BY wo.created_at DESC`,
      [seller.id]
    );

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('GET /api/orders/seller error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
