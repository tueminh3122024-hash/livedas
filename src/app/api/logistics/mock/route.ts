import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { nq, nq1, getPool } from '@/lib/db';

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
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Lấy thông tin đơn hàng, tin đăng bán, và tài khoản của người bán
    const orderQuery = await client.query(
      `SELECT wo.*, sl.deposit_amount as seller_deposit_amount, s.user_id as seller_user_id
       FROM wholesale_orders wo
       JOIN seller_listings sl ON wo.listing_id = sl.id
       JOIN sellers s ON wo.seller_id = s.id
       WHERE wo.id = $1 FOR UPDATE`,
      [orderId]
    );

    if (orderQuery.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderQuery.rows[0];

    if (order.status !== 'confirmed') {
      throw new Error(`Đơn hàng phải ở trạng thái "confirmed" (Đã Xác Nhận) mới có thể lấy hàng. Trạng thái hiện tại: ${order.status}`);
    }

    // 2. Tìm ví của Seller để giải ngân
    const sellerWalletQuery = await client.query(
      'SELECT id, balance, locked_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [order.seller_user_id]
    );

    if (sellerWalletQuery.rows.length === 0) {
      throw new Error('Không tìm thấy ví của người bán.');
    }

    const sellerWallet = sellerWalletQuery.rows[0];
    const buyerDeposit = BigInt(order.buyer_deposit_amount);
    const sellerDeposit = BigInt(order.seller_deposit_amount);

    // 3. Thực hiện giải ngân (Seller nhận buyer deposit + mở khóa cọc đăng bán ban đầu)
    // - Khấu trừ cọc của seller khỏi locked_balance: locked_balance = locked_balance - sellerDeposit
    // - Cộng cọc seller + tiền mua của buyer vào balance: balance = balance + sellerDeposit + buyerDeposit
    const newBalance = BigInt(sellerWallet.balance) + sellerDeposit + buyerDeposit;
    const newLocked = BigInt(sellerWallet.locked_balance) - sellerDeposit;

    if (newLocked < BigInt(0)) {
      // Đảm bảo không âm locked_balance
      throw new Error('Lỗi đồng bộ tiền cọc: Số dư ký quỹ của người bán bị âm.');
    }

    await client.query(
      'UPDATE wallets SET balance = $1, locked_balance = $2, updated_at = NOW() WHERE id = $3',
      [newBalance.toString(), newLocked.toString(), sellerWallet.id]
    );

    // Ghi log ví Seller: Mở cọc tin đăng
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, tx_type, description)
       VALUES ($1, $2, $3, $4)`,
      [
        sellerWallet.id,
        sellerDeposit.toString(),
        'unlock_listing',
        `Mở khóa ký quỹ tin đăng sỉ #${order.listing_id.substring(0,6)} do hoàn tất đơn hàng`
      ]
    );

    // Ghi log ví Seller: Nhận tiền mua sỉ giải ngân từ Buyer
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, tx_type, description)
       VALUES ($1, $2, $3, $4)`,
      [
        sellerWallet.id,
        buyerDeposit.toString(),
        'release_escrow',
        `Nhận tiền ký quỹ giải ngân từ Buyer cho đơn hàng #${orderId.substring(0,6)}`
      ]
    );

    // 4. Cập nhật trạng thái đơn hàng thành hoàn thành và vận đơn thành công
    await client.query(
      "UPDATE wholesale_orders SET status = 'completed', updated_at = NOW() WHERE id = $1",
      [orderId]
    );

    await client.query(
      `UPDATE logistic_dispatches 
       SET status = 'delivered', actual_pickup_at = NOW(), actual_delivery_at = NOW() + INTERVAL '1 hour', updated_at = NOW()
       WHERE order_id = $1`,
      [orderId]
    );

    await client.query('COMMIT');
    client.release();

    return NextResponse.json({
      success: true,
      orderStatus: 'completed',
      shippingStatus: 'delivered',
      sellerEarnings: (buyerDeposit).toString()
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    client.release();
    console.error('POST /api/logistics/mock error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
