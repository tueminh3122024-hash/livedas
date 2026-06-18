import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product');
    const region = searchParams.get('region');

    const supabase = await createSupabaseServer();

    let query = supabase.from('sellers').select('*');

    // Filter theo sản phẩm chuyên doanh (nếu cung cấp)
    if (productId) {
      query = query.contains('specialty', [productId]);
    }

    // Filter theo vùng miền (nếu cung cấp)
    if (region) {
      query = query.eq('region', region);
    }

    const { data: sellers, error } = await query.order('rating', { ascending: false });

    if (error) {
      console.error('Error fetching sellers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sellers: sellers || [] });
  } catch (error: any) {
    console.error('API /api/sellers crash:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
