import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vertical = searchParams.get('vertical') || 'agriculture';

    const supabase = await createSupabaseServer();

    // Lấy danh sách sản phẩm cùng giá hiện tại từ current_prices
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        current_price:current_prices(*)
      `)
      .eq('active', true)
      .eq('vertical', vertical)
      .order('category')
      .order('name');

    if (error) {
      console.error('Error fetching products with prices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('API /api/prices crash:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
