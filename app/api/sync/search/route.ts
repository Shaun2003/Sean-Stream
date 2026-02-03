import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { query } = await request.json();

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query is required' },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase.from('search_history').insert({
        user_id: user.id,
      query: query.trim(),
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Search query saved',
    });
  } catch (error) {
    console.error('Error in search history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('query')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const queries = data?.map((item: any) => item.query) || [];
    return NextResponse.json({ data: queries });
  } catch (error) {
    console.error('Error fetching search history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
