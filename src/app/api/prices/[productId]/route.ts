import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { nq } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const supabase = await createSupabaseServer();

    // 1. Lấy thông tin sản phẩm và giá hiện tại
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        current_price:current_prices(*)
      `)
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 2. Lấy danh sách người bán kèm tin đăng chào bán sỉ ký quỹ active (nếu có)
    const sellers = await nq(
      `SELECT s.*, sl.id as listing_id, sl.price_per_kg, sl.min_quantity_kg, sl.total_available_kg
       FROM sellers s
       LEFT JOIN public.seller_listings sl ON s.id = sl.seller_id AND sl.product_id = $1 AND sl.status = 'active'
       WHERE s.specialty @> ARRAY[$1]::text[] OR sl.id IS NOT NULL
       ORDER BY s.rating DESC`,
      [productId]
    );

    // 3. Lấy 5 lịch sử báo giá gần đây của sản phẩm này
    const { data: recentEntries, error: entriesError } = await supabase
      .from('price_entries')
      .select(`
        *,
        seller:sellers(name, province)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (entriesError) {
      console.error('Error fetching recent price entries:', entriesError);
    }

    return NextResponse.json({
      product,
      sellers: sellers || [],
      recentEntries: recentEntries || []
    });
  } catch (error: any) {
    console.error('API /api/prices/[productId] crash:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
