import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { nq, nq1 } from '@/lib/db';
import { LogisticsClient } from '@/lib/logistics-client';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, carrierName } = body;

    if (!orderId || !carrierName) {
      return NextResponse.json({ error: 'Order ID and Carrier Name are required' }, { status: 400 });
    }

    // 1. Kiểm tra đơn hàng có khớp với người bán đang đăng nhập không
    const order = await nq1(
      `SELECT wo.*, s.user_id as seller_user_id, pr.name as buyer_name
       FROM wholesale_orders wo
       JOIN sellers s ON wo.seller_id = s.id
       JOIN profiles pr ON wo.buyer_id = pr.id
       WHERE wo.id = $1`,
      [orderId]
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.seller_user_id !== user.id) {
      return NextResponse.json({ error: 'You are not authorized to confirm this order' }, { status: 403 });
    }

    if (order.status !== 'escrowed') {
      return NextResponse.json({ error: `Không thể xác nhận đơn hàng ở trạng thái: ${order.status}` }, { status: 400 });
    }

    // 2. Gọi Logistics SDK để đăng ký đơn giao vận
    const qty = parseInt(order.quantity_kg, 10);
    const logisticsResult = await LogisticsClient.createOrder({
      orderId: order.id,
      buyerName: order.buyer_name || 'Người mua sỉ',
      buyerPhone: order.buyer_phone,
      deliveryAddress: order.delivery_address,
      weightKg: qty,
      carrierName: carrierName
    });

    if (!logisticsResult.success) {
      return NextResponse.json({ error: 'Failed to create shipping order with carrier' }, { status: 500 });
    }

    // 3. Cập nhật trạng thái đơn hàng và lưu vận đơn vào cơ sở dữ liệu
    await nq('UPDATE wholesale_orders SET status = $1, updated_at = NOW() WHERE id = $2', ['confirmed', orderId]);

    // Tạo/Cập nhật bản ghi vận đơn Logistics với tọa độ và shipper
    const dispatch = await nq1(
      `INSERT INTO logistic_dispatches (
        order_id, carrier_name, tracking_number, shipping_fee, status, 
        pickup_scheduled_at, current_latitude, current_longitude, current_location_name,
        rider_name, rider_phone, estimated_delivery_time,
        origin_latitude, origin_longitude, destination_latitude, destination_longitude
       )
       VALUES (
        $1, $2, $3, $4, 'assigned', 
        NOW() + INTERVAL '1 day', 10.03711, 105.78825, 'Vựa sỉ người bán',
        'Nguyễn Hoàng Long', '0909654321', NOW() + INTERVAL '2 days',
        10.03711, 105.78825, 10.762622, 106.660172
       )
       ON CONFLICT (order_id) DO UPDATE 
       SET 
        carrier_name = $2, tracking_number = $3, shipping_fee = $4, status = 'assigned', 
        current_latitude = 10.03711, current_longitude = 105.78825, current_location_name = 'Vựa sỉ người bán',
        rider_name = 'Nguyễn Hoàng Long', rider_phone = '0909654321', estimated_delivery_time = NOW() + INTERVAL '2 days',
        origin_latitude = 10.03711, origin_longitude = 105.78825, destination_latitude = 10.762622, destination_longitude = 106.660172,
        updated_at = NOW()
       RETURNING *`,
      [orderId, carrierName, logisticsResult.trackingNumber, logisticsResult.shippingFee]
    );

    // Thêm nhật ký hành trình đầu tiên
    await nq(
      `INSERT INTO public.logistic_tracking_logs (dispatch_id, status, location_name, latitude, longitude, notes)
       VALUES ($1, 'pickup_scheduled', 'Vựa sỉ người bán', 10.03711, 105.78825, 'Đơn hàng đã được xác nhận. Shipper đã tiếp nhận thông tin và lên lịch lấy hàng.')`,
      [dispatch.id]
    );

    return NextResponse.json({
      success: true,
      orderStatus: 'confirmed',
      dispatch
    });

  } catch (error: any) {
    console.error('POST /api/orders/confirm error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
