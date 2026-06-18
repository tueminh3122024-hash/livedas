import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(request: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dispatchId } = body;

    if (!dispatchId) {
      return NextResponse.json({ error: 'Dispatch ID is required' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Lấy thông tin dispatch hiện tại
    const dispatchRes = await client.query(
      `SELECT ld.*, wo.id as order_id, wo.status as order_status, wo.buyer_deposit_amount, wo.total_amount,
              sl.deposit_amount as seller_deposit_amount, s.user_id as seller_user_id, s.id as seller_id
       FROM public.logistic_dispatches ld
       JOIN public.wholesale_orders wo ON ld.order_id = wo.id
       JOIN public.seller_listings sl ON wo.listing_id = sl.id
       JOIN public.sellers s ON wo.seller_id = s.id
       WHERE ld.id = $1 FOR UPDATE`,
      [dispatchId]
    );

    if (dispatchRes.rows.length === 0) {
      throw new Error('Không tìm thấy thông tin vận đơn.');
    }

    const d = dispatchRes.rows[0];

    // Xác thực quyền (chỉ Seller của đơn hàng hoặc Admin mới có quyền simulate di chuyển)
    const profileRes = await client.query('SELECT role FROM public.profiles WHERE id = $1', [user.id]);
    const userRole = profileRes.rows[0]?.role;
    
    if (d.seller_user_id !== user.id && userRole !== 'admin') {
      throw new Error('Bạn không có quyền thực hiện mô phỏng vận đơn này.');
    }

    let nextStatus = '';
    let nextLocation = '';
    let nextLat = 10.03711;
    let nextLng = 105.78825;
    let nextNotes = '';
    let triggerRelease = false;

    // Quyết định trạng thái tiếp theo dựa trên trạng thái hiện tại
    if (d.status === 'assigned') {
      nextStatus = 'picked_up';
      nextLocation = 'Vựa sỉ người bán (Cần Thơ)';
      nextLat = 10.03711;
      nextLng = 105.78825;
      nextNotes = 'Shipper đã lấy hàng thành công tại vựa sỉ của người bán và đang kiểm đếm sản phẩm sỉ.';
    } else if (d.status === 'picked_up') {
      nextStatus = 'in_transit';
      nextLocation = 'Trạm trung chuyển Cai Lậy (Tiền Giang)';
      nextLat = 10.360153;
      nextLng = 106.357112;
      nextNotes = 'Hàng sỉ đang được xe tải trung chuyển qua Quốc Lộ 1A. Đã cập cảng Kho trung chuyển Cai Lậy, Tiền Giang.';
    } else if (d.status === 'in_transit') {
      nextStatus = 'out_for_delivery';
      nextLocation = 'Kho tổng trung tâm (Quận 7, TP.HCM)';
      nextLat = 10.75822;
      nextLng = 106.65811;
      nextNotes = 'Hàng đã cập bến Kho tổng trung tâm TP.HCM. Shipper đang bốc xếp hàng lên xe máy để tiến hành giao chặng cuối.';
    } else if (d.status === 'out_for_delivery') {
      nextStatus = 'delivered';
      nextLocation = 'Địa chỉ người mua (TP.HCM)';
      nextLat = 10.762622;
      nextLng = 106.660172;
      nextNotes = 'Giao hàng thành công! Người mua đã nhận đủ hàng sỉ và xác nhận tất toán giải ngân ký quỹ.';
      triggerRelease = true;
    } else {
      // Đã giao thành công hoặc trạng thái khác
      return NextResponse.json({
        success: true,
        message: 'Vận đơn đã được giao thành công hoặc không thể mô phỏng thêm.',
        status: d.status
      });
    }

    // 2. Cập nhật vị trí và trạng thái trong bảng public.logistic_dispatches
    await client.query(
      `UPDATE public.logistic_dispatches 
       SET 
        status = $1, 
        current_location_name = $2, 
        current_latitude = $3, 
        current_longitude = $4,
        actual_pickup_at = CASE WHEN $1 = 'picked_up' THEN NOW() ELSE actual_pickup_at END,
        actual_delivery_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE actual_delivery_at END,
        updated_at = NOW()
       WHERE id = $5`,
      [nextStatus, nextLocation, nextLat, nextLng, dispatchId]
    );

    // 3. Thêm nhật ký hành trình timeline log
    await client.query(
      `INSERT INTO public.logistic_tracking_logs (dispatch_id, status, location_name, latitude, longitude, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [dispatchId, nextStatus, nextLocation, nextLat, nextLng, nextNotes]
    );

    // 4. Nếu trạng thái là 'picked_up', cập nhật đơn hàng sang trạng thái 'shipping' (Đang Giao)
    if (nextStatus === 'picked_up') {
      await client.query(
        "UPDATE public.wholesale_orders SET status = 'shipping', updated_at = NOW() WHERE id = $1",
        [d.order_id]
      );
    }

    // 5. Nếu chuyển sang 'delivered', kích hoạt giải ngân cọc ký quỹ (Escrow Release)
    if (triggerRelease && d.order_status !== 'completed') {
      // Lấy ví người bán
      const sellerWalletQuery = await client.query(
        'SELECT id, balance, locked_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [d.seller_user_id]
      );
      
      if (sellerWalletQuery.rows.length > 0) {
        const sellerWallet = sellerWalletQuery.rows[0];
        const buyerDeposit = BigInt(d.buyer_deposit_amount);
        const sellerDeposit = BigInt(d.seller_deposit_amount);

        const newBalance = BigInt(sellerWallet.balance) + sellerDeposit + buyerDeposit;
        const newLocked = BigInt(sellerWallet.locked_balance) - sellerDeposit;

        if (newLocked >= BigInt(0)) {
          // Thực hiện giải ngân cọc tin đăng + tiền mua của buyer về ví khả dụng
          await client.query(
            'UPDATE wallets SET balance = $1, locked_balance = $2, updated_at = NOW() WHERE id = $3',
            [newBalance.toString(), newLocked.toString(), sellerWallet.id]
          );

          // Ghi log ví Seller: Giải phóng cọc đăng tin sỉ
          await client.query(
            `INSERT INTO wallet_transactions (wallet_id, amount, tx_type, description)
             VALUES ($1, $2, 'unlock_listing', $3)`,
            [
              sellerWallet.id,
              sellerDeposit.toString(),
              'unlock_listing',
              `Mở khóa ký quỹ tin đăng sỉ #${d.listing_id.substring(0,6)} do hoàn tất đơn hàng`
            ]
          );

          // Ghi log ví Seller: Nhận tiền giải ngân ký quỹ từ Buyer
          await client.query(
            `INSERT INTO wallet_transactions (wallet_id, amount, tx_type, description)
             VALUES ($1, $2, 'release_escrow', $3)`,
            [
              sellerWallet.id,
              buyerDeposit.toString(),
              'release_escrow',
              `Nhận tiền ký quỹ giải ngân từ Buyer cho đơn hàng #${d.order_id.substring(0,6)}`
            ]
          );

          // Cập nhật trạng thái đơn hàng thành hoàn thành
          await client.query(
            "UPDATE public.wholesale_orders SET status = 'completed', updated_at = NOW() WHERE id = $1",
            [d.order_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    client.release();

    return NextResponse.json({
      success: true,
      status: nextStatus,
      locationName: nextLocation,
      latitude: nextLat,
      longitude: nextLng,
      notes: nextNotes,
      escrowReleased: triggerRelease
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    client.release();
    console.error('POST /api/logistics/simulate-step error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
