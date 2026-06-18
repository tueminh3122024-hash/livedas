import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { nq, nq1, getPool } from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Tìm bản ghi seller ứng với user này
    const seller = await nq1('SELECT id FROM sellers WHERE user_id = $1 OR id = $1', [user.id]);
    if (!seller) {
      return NextResponse.json({ listings: [] });
    }

    // 2. Lấy danh sách tin bán sỉ của seller này kèm thông tin sản phẩm
    const listings = await nq(
      `SELECT sl.*, p.name as product_name, p.emoji as product_emoji, p.unit as product_unit
       FROM seller_listings sl
       JOIN products p ON sl.product_id = p.id
       WHERE sl.seller_id = $1
       ORDER BY sl.created_at DESC`,
      [seller.id]
    );

    return NextResponse.json({ success: true, listings });
  } catch (error: any) {
    console.error('GET /api/seller/listings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lấy profile để kiểm tra quyền
    const profile = await nq1('SELECT role FROM profiles WHERE id = $1', [user.id]);
    if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Only sellers or admins can create listings' }, { status: 403 });
    }

    // Lấy seller record tương ứng
    let seller = await nq1('SELECT id FROM sellers WHERE user_id = $1 OR id = $1', [user.id]);
    if (!seller) {
      // Nếu chưa có seller record, đồng bộ thủ công
      await nq(
        `INSERT INTO sellers (id, name, phone, verified, rating, status, user_id, specialty)
         VALUES ($1, $2, $3, true, 5.0, 'online', $1, ARRAY[]::TEXT[])
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.email?.split('@')[0] || 'Nhà vườn', '']
      );
      seller = { id: user.id };
    }

    const body = await request.json();
    const { productId, pricePerKg, minQuantityKg, totalAvailableKg } = body;

    const price = parseInt(pricePerKg, 10);
    const moq = parseInt(minQuantityKg, 10);
    const totalQty = parseInt(totalAvailableKg, 10);

    if (!productId || isNaN(price) || isNaN(moq) || isNaN(totalQty) || price <= 0 || moq <= 0 || totalQty < moq) {
      return NextResponse.json({ error: 'Invalid listing input parameters' }, { status: 400 });
    }

    // Tính toán lượng ký quỹ cần thiết
    const depositNeeded = BigInt(price) * BigInt(moq);

    // Bắt đầu transaction tài chính
    await client.query('BEGIN');

    // 1. Kiểm tra ví khả dụng và lock tài sản
    const wallet = await client.query(
      'SELECT id, balance, locked_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [user.id]
    );

    if (wallet.rows.length === 0) {
      throw new Error('Wallet not found. Please reload profile.');
    }

    const currentWallet = wallet.rows[0];
    const availableBalance = BigInt(currentWallet.balance);

    if (availableBalance < depositNeeded) {
      throw new Error(`Số dư khả dụng không đủ ký quỹ. Cần thêm ${(depositNeeded - availableBalance).toLocaleString('vi-VN')} đ.`);
    }

    // 2. Khấu trừ số dư và cộng vào ví ký quỹ
    const updatedWallet = await client.query(
      `UPDATE wallets 
       SET balance = balance - $1, locked_balance = locked_balance + $1, updated_at = NOW() 
       WHERE user_id = $2 
       RETURNING id, balance, locked_balance`,
      [depositNeeded.toString(), user.id]
    );

    // 3. Ghi log transaction ví
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, tx_type, description) 
       VALUES ($1, $2, $3, $4)`,
      [
        currentWallet.id,
        (-depositNeeded).toString(),
        'lock_listing',
        `Ký quỹ đăng tin bán sỉ sản phẩm ${productId} (MOQ: ${moq}kg * ${price.toLocaleString('vi-VN')}đ)`
      ]
    );

    // 4. Cập nhật specialty của seller để đảm bảo họ hiển thị ở sản phẩm này
    await client.query(
      `UPDATE sellers 
       SET specialty = array_append(specialty, $1) 
       WHERE id = $2 AND NOT (specialty @> ARRAY[$1]::text[])`,
      [productId, seller.id]
    );

    // 5. Tạo tin đăng bán sỉ
    const listing = await client.query(
      `INSERT INTO seller_listings (seller_id, product_id, price_per_kg, min_quantity_kg, total_available_kg, deposit_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [seller.id, productId, price, moq, totalQty, depositNeeded.toString()]
    );

    await client.query('COMMIT');
    client.release();

    return NextResponse.json({
      success: true,
      listing: listing.rows[0],
      wallet: {
        balance: parseInt(updatedWallet.rows[0].balance, 10),
        locked_balance: parseInt(updatedWallet.rows[0].locked_balance, 10)
      }
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    client.release();
    console.error('POST /api/seller/listings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
