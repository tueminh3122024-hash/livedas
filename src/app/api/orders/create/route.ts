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
    const { listingId, quantity, depositPercentage, deliveryAddress, buyerPhone, deliveryDate } = body;

    const qty = parseInt(quantity, 10);
    const pct = parseInt(depositPercentage, 10);

    if (!listingId || isNaN(qty) || qty <= 0 || isNaN(pct) || pct < 30 || pct > 50 || !deliveryAddress || !buyerPhone) {
      return NextResponse.json({ error: 'Invalid order input parameters' }, { status: 400 });
    }

    // Bắt đầu transaction chốt đơn sỉ
    await client.query('BEGIN');

    // 1. Kiểm tra tin bán sỉ tồn tại và khả dụng
    const listingQuery = await client.query(
      `SELECT sl.*, s.user_id as seller_user_id 
       FROM seller_listings sl
       JOIN sellers s ON sl.seller_id = s.id
       WHERE sl.id = $1 FOR UPDATE`,
      [listingId]
    );

    if (listingQuery.rows.length === 0) {
      throw new Error('Listing not found');
    }

    const listing = listingQuery.rows[0];

    if (listing.status !== 'active') {
      throw new Error('Tin chào sỉ này đã bán hết hoặc không còn hoạt động.');
    }

    if (listing.seller_user_id === user.id) {
      throw new Error('Bạn không thể mua sỉ sản phẩm do chính mình đăng.');
    }

    if (qty < listing.min_quantity_kg) {
      throw new Error(`Số lượng đặt mua (${qty}kg) phải lớn hơn hoặc bằng MOQ của tin đăng (${listing.min_quantity_kg}kg).`);
    }

    if (qty > listing.total_available_kg) {
      throw new Error(`Sản lượng khả dụng tại vườn hiện tại chỉ còn ${listing.total_available_kg}kg.`);
    }

    // 2. Tính toán tổng tiền và tiền cọc đặt giữ đơn
    const price = listing.price_per_kg;
    const totalAmount = BigInt(price) * BigInt(qty);
    const buyerDepositAmount = (totalAmount * BigInt(pct)) / BigInt(100);

    // 3. Khấu trừ số dư ví người mua
    const walletQuery = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [user.id]
    );

    if (walletQuery.rows.length === 0) {
      throw new Error('Không tìm thấy ví người mua. Vui lòng đăng ký lại.');
    }

    const buyerWallet = walletQuery.rows[0];
    const buyerAvailable = BigInt(buyerWallet.balance);

    if (buyerAvailable < buyerDepositAmount) {
      throw new Error(`Số dư khả dụng trong ví không đủ. Đơn đặt cần đặt cọc ${buyerDepositAmount.toLocaleString('vi-VN')} đ (khoản cọc ${pct}%).`);
    }

    // Cập nhật ví buyer
    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
      [buyerDepositAmount.toString(), user.id]
    );

    // Ghi nhận transaction khóa ví
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, tx_type, description)
       VALUES ($1, $2, 'lock_escrow', $3)`,
      [
        buyerWallet.id,
        (-buyerDepositAmount).toString(),
        `Đặt cọc ${pct}% ký quỹ chốt đơn mua sỉ #${listingId.substring(0,6)} (${qty}kg * ${price.toLocaleString('vi-VN')}đ)`
      ]
    );

    // 4. Khấu trừ sản lượng tin đăng của Seller
    const newAvailable = listing.total_available_kg - qty;
    const newStatus = newAvailable === 0 ? 'sold_out' : 'active';
    await client.query(
      'UPDATE seller_listings SET total_available_kg = $1, status = $2 WHERE id = $3',
      [newAvailable, newStatus, listingId]
    );

    // 5. Tạo đơn đặt hàng sỉ
    const finalDeliveryDate = deliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const orderQuery = await client.query(
      `INSERT INTO wholesale_orders (buyer_id, seller_id, listing_id, quantity_kg, price_per_kg, total_amount, deposit_percentage, buyer_deposit_amount, status, delivery_address, buyer_phone, delivery_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'escrowed', $9, $10, $11)
       RETURNING *`,
      [
        user.id,
        listing.seller_id,
        listing.id,
        qty,
        price,
        totalAmount.toString(),
        pct,
        buyerDepositAmount.toString(),
        deliveryAddress,
        buyerPhone,
        finalDeliveryDate
      ]
    );

    await client.query('COMMIT');
    client.release();

    return NextResponse.json({
      success: true,
      order: orderQuery.rows[0]
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    client.release();
    console.error('POST /api/orders/create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
