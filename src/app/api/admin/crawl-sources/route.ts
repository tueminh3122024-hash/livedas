import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: sources, error } = await supabase
      .from('crawl_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ sources });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { name, url, vertical } = await request.json();

    if (!name || !url || !vertical) {
      return NextResponse.json({ error: 'Missing name, url, or vertical' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('crawl_sources')
      .insert({ name, url, vertical, status: 'active' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, source: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
