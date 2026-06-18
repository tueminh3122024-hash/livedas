import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { nq, nq1, getPool } from '@/lib/db';

export async function POST(request: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // 1. Kiểm tra Token Xác thực từ Header (nếu có cấu hình SEPAY_API_KEY)
    const sepayApiKey = process.env.SEPAY_API_KEY || '38GIBCSUVWPJJJRHBLNUFOY7LDM97QY2C9E4NOP0YSSLATILUEKFRGFXKZADHTHW';
    const authHeader = request.headers.get('Authorization');

    // Chấp nhận Bearer token từ Sepay webhook
    if (authHeader && authHeader !== `Bearer ${sepayApiKey}` && !authHeader.includes(sepayApiKey)) {
      console.warn('Unauthorized Sepay webhook request:', authHeader);
      return NextResponse.json({ error: 'Unauthorized key' }, { status: 401 });
    }

    const payload = await request.json();
    
    // Sepay webhook payload fields:
    // id (bigint): transaction ID
    // amount (bigint): transfer amount
    // content (string): memo text
    // bankBrandName (string)
    // transactionDate (string)
    // referenceCode (string)
    const { id: sepayId, amount, content, bankBrandName, transactionDate, referenceCode } = payload;

    const txAmount = parseInt(amount, 10);
    if (!sepayId || isNaN(txAmount) || txAmount <= 0 || !content) {
      return NextResponse.json({ error: 'Invalid payload parameters' }, { status: 400 });
    }

    // 2. Tìm kiếm mã khớp lệnh LVDD[ID] trong nội dung chuyển khoản
    const match = content.match(/LVDD(\d+)/i);
    if (!match) {
      // Nhận tiền chuyển khoản nhưng không có nội dung khớp lệnh - Lưu log để đối soát thủ công
      console.warn(`Payment received but no matching LVDD code found: "${content}"`);
      return NextResponse.json({ success: false, message: 'No matching code found' }, { status: 200 });
    }

    const requestId = parseInt(match[1], 10);

    // Bắt đầu transaction khớp lệnh nạp tiền
    await client.query('BEGIN');

    // 3. Kiểm tra xem giao dịch Sepay ID này đã được xử lý chưa (chống trùng lệnh)
    const dupCheck = await client.query(
      'SELECT id FROM sepay_transactions WHERE sepay_id = $1 FOR UPDATE',
      [sepayId]
    );

    if (dupCheck.rows.length > 0) {
      await client.query('COMMIT');
      client.release();
      return NextResponse.json({ success: true, message: 'Transaction already processed' });
    }

    // 4. Tìm yêu cầu nạp tiền đang chờ duyệt
    const requestQuery = await client.query(
      'SELECT * FROM payment_requests WHERE id = $1 AND status = $2 FOR UPDATE',
      [requestId, 'pending']
    );

    if (requestQuery.rows.length === 0) {
      // Lưu giao dịch ngân hàng vào log kể cả khi không khớp yêu cầu, để admin đối soát sau
      await client.query(
        `INSERT INTO sepay_transactions (sepay_id, bank_brand_name, amount, transaction_date, content, reference_code, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sepayId, bankBrandName, txAmount, transactionDate || new Date().toISOString(), content, referenceCode || '', JSON.stringify(payload)]
      );
      await client.query('COMMIT');
      client.release();
      return NextResponse.json({ success: false, message: 'Request not found or already completed' }, { status: 200 });
    }

    const paymentRequest = requestQuery.rows[0];

    // 5. Nạp tiền vào ví của người dùng
    // Tìm hoặc tạo ví
    let walletQuery = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [paymentRequest.user_id]
    );

    let walletId = '';
    if (walletQuery.rows.length === 0) {
      const newWallet = await client.query(
        'INSERT INTO wallets (user_id, balance, locked_balance) VALUES ($1, 0, 0) RETURNING id',
        [paymentRequest.user_id]
      );
      walletId = newWallet.rows[0].id;
    } else {
      walletId = walletQuery.rows[0].id;
    }

    // Cập nhật số dư ví cộng thêm tiền chuyển khoản thật
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [txAmount.toString(), walletId]
    );

    // Ghi log giao dịch ví
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, tx_type, description)
       VALUES ($1, $2, 'deposit', $3)`,
      [
        walletId,
        txAmount.toString(),
        `Nạp tiền tự động qua ngân hàng khớp mã ${paymentRequest.code} (+${txAmount.toLocaleString('vi-VN')}đ)`
      ]
    );

    // 6. Đổi trạng thái yêu cầu nạp tiền thành completed
    await client.query(
      "UPDATE payment_requests SET status = 'completed', updated_at = NOW() WHERE id = $1",
      [requestId]
    );

    // 7. Ghi log sepay_transactions
    await client.query(
      `INSERT INTO sepay_transactions (sepay_id, bank_brand_name, amount, transaction_date, content, reference_code, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sepayId,
        bankBrandName || 'MBBank',
        txAmount,
        transactionDate || new Date().toISOString(),
        content,
        referenceCode || '',
        JSON.stringify(payload)
      ]
    );

    await client.query('COMMIT');
    client.release();

    return NextResponse.json({
      success: true,
      message: `Khớp lệnh thành công đơn nạp ${paymentRequest.code}, đã nạp +${txAmount.toLocaleString('vi-VN')}đ vào ví người dùng.`
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    client.release();
    console.error('POST /api/payment/sepay/webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
