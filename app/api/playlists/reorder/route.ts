import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playlist_id, tracks } = await request.json();

    if (!playlist_id || !Array.isArray(tracks)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user owns playlist
    const { data: playlist } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', playlist_id)
      .eq('user_id', user.id)
      .single();

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Update positions
    for (const track of tracks) {
      const { error } = await supabase
        .from('playlist_songs')
        .update({ position: track.position })
        .eq('playlist_id', playlist_id)
        .eq('video_id', track.video_id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering playlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
