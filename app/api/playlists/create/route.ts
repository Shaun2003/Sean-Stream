import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, is_public } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Playlist name is required' }, { status: 400 });
    }

    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        is_public: is_public || false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: playlist });
  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
