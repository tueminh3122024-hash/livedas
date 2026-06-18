import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { nq, nq1 } from '@/lib/db';

export async function GET(
  request: Request,
  context: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const { trackingNumber } = await context.params;

    if (!trackingNumber) {
      return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
    }

    // 1. Lấy thông tin chi tiết của vận đơn logistics cùng với sản phẩm và thông tin buyer/seller
    const dispatch = await nq1(
      `SELECT 
        ld.*, 
        wo.delivery_address, 
        wo.buyer_phone, 
        wo.total_amount, 
        wo.quantity_kg, 
        wo.status as order_status,
        p.name as product_name, 
        p.emoji as product_emoji, 
        p.unit as product_unit,
        s.name as seller_name, 
        pr.name as buyer_name,
        pr.email as buyer_email
      FROM public.logistic_dispatches ld
      JOIN public.wholesale_orders wo ON ld.order_id = wo.id
      JOIN public.seller_listings sl ON wo.listing_id = sl.id
      JOIN public.products p ON sl.product_id = p.id
      JOIN public.sellers s ON wo.seller_id = s.id
      JOIN public.profiles pr ON wo.buyer_id = pr.id
      WHERE ld.tracking_number = $1`,
      [trackingNumber]
    );

    if (!dispatch) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin vận đơn.' }, { status: 404 });
    }

    // 2. Lấy danh sách lịch sử di chuyển (timeline logs) sắp xếp thời gian mới nhất
    const logs = await nq(
      `SELECT * FROM public.logistic_tracking_logs
       WHERE dispatch_id = $1
       ORDER BY created_at DESC`,
      [dispatch.id]
    );

    // 3. Kiểm tra xem người dùng đang xem là ai để bổ sung phân quyền trên UI nếu cần
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    
    let userRole = 'public';
    let isOwner = false;
    
    if (user) {
      // Tìm xem có phải Buyer của đơn hàng không
      if (dispatch.buyer_email === user.email) {
        userRole = 'buyer';
        isOwner = true;
      } else {
        // Kiểm tra xem có phải Seller của đơn hàng không
        const sellerCheck = await nq1(
          'SELECT id FROM public.sellers WHERE user_id = $1 AND id = $2', 
          [user.id, dispatch.seller_id]
        );
        if (sellerCheck) {
          userRole = 'seller';
          isOwner = true;
        } else {
          // Kiểm tra xem có phải Admin không
          const profileCheck = await nq1(
            'SELECT role FROM public.profiles WHERE id = $1',
            [user.id]
          );
          if (profileCheck && profileCheck.role === 'admin') {
            userRole = 'admin';
            isOwner = true;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      dispatch: {
        ...dispatch,
        shipping_fee: parseInt(dispatch.shipping_fee, 10),
        total_amount: parseInt(dispatch.total_amount, 10),
        quantity_kg: parseInt(dispatch.quantity_kg, 10),
        current_latitude: parseFloat(dispatch.current_latitude) || 10.03711,
        current_longitude: parseFloat(dispatch.current_longitude) || 105.78825,
        origin_latitude: parseFloat(dispatch.origin_latitude) || 10.03711,
        origin_longitude: parseFloat(dispatch.origin_longitude) || 105.78825,
        destination_latitude: parseFloat(dispatch.destination_latitude) || 10.762622,
        destination_longitude: parseFloat(dispatch.destination_longitude) || 106.660172,
      },
      logs,
      viewer: {
        role: userRole,
        isOwner
      }
    });

  } catch (error: any) {
    console.error('GET /api/logistics/tracking error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
