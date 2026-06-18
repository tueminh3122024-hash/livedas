import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { nq1, nq } from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lấy ví từ DB
    let wallet = await nq1('SELECT balance, locked_balance FROM wallets WHERE user_id = $1', [user.id]);

    if (!wallet) {
      // Nếu ví chưa được trigger tự động, tạo ví mặc định
      wallet = await nq1(
        'INSERT INTO wallets (user_id, balance, locked_balance) VALUES ($1, 0, 0) RETURNING balance, locked_balance',
        [user.id]
      );
    }

    return NextResponse.json({
      success: true,
      wallet: {
        balance: parseInt(wallet.balance, 10),
        locked_balance: parseInt(wallet.locked_balance, 10)
      }
    });
  } catch (error: any) {
    console.error('GET /api/seller/wallet error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, userId: bodyUserId } = body;
    const topupAmount = parseInt(amount, 10);

    if (isNaN(topupAmount) || topupAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive integer' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    // Cho phép dùng bodyUserId nếu đang test offline không có session
    const finalUserId = user?.id || bodyUserId;

    if (!finalUserId) {
      return NextResponse.json({ error: 'Unauthorized: User ID required' }, { status: 401 });
    }

    // 1. Đảm bảo ví tồn tại trước khi nạp
    let wallet = await nq1('SELECT id, balance FROM wallets WHERE user_id = $1', [finalUserId]);
    if (!wallet) {
      wallet = await nq1(
        'INSERT INTO wallets (user_id, balance, locked_balance) VALUES ($1, 0, 0) RETURNING id, balance',
        [finalUserId]
      );
    }

    // 2. Cập nhật số dư cộng dồn (atomic update)
    const updatedWallet = await nq1(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id, balance, locked_balance',
      [topupAmount, finalUserId]
    );

    // 3. Ghi log transaction lịch sử
    await nq(
      'INSERT INTO wallet_transactions (wallet_id, amount, tx_type, description) VALUES ($1, $2, $3, $4)',
      [updatedWallet.id, topupAmount, 'deposit', `Nạp tiền mô phỏng hệ thống Livedas: +${topupAmount.toLocaleString('vi-VN')} đ`]
    );

    return NextResponse.json({
      success: true,
      wallet: {
        balance: parseInt(updatedWallet.balance, 10),
        locked_balance: parseInt(updatedWallet.locked_balance, 10)
      }
    });
  } catch (error: any) {
    console.error('POST /api/seller/wallet error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
