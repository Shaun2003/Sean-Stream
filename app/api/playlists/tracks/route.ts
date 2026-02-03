import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('id');

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    const { data: tracks, error } = await supabase
      .from('playlist_songs')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: tracks || [] });
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playlist_id, video_id, title, artist, thumbnail, duration, position } =
      await request.json();

    if (!playlist_id || !video_id || !title) {
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

    // Get current max position if not specified
    let finalPosition = position;
    if (finalPosition === undefined) {
      const { data: tracks } = await supabase
        .from('playlist_songs')
        .select('position')
        .eq('playlist_id', playlist_id)
        .order('position', { ascending: false })
        .limit(1);

      finalPosition = (tracks?.[0]?.position ?? 0) + 1;
    }

    const { data: track, error } = await supabase
      .from('playlist_songs')
      .insert({
        playlist_id,
        video_id,
        title,
        artist: artist || null,
        thumbnail: thumbnail || null,
        duration: duration || null,
        position: finalPosition,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a unique constraint error (track already in playlist)
      console.log('[v0] Insert error:', error);
      if (error.code === '23505') {
        console.log('[v0] Unique constraint violation - track already in playlist');
        return NextResponse.json(
          { error: 'Track already in playlist' },
          { status: 409 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to add track to playlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: track });
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('playlist_id');
    const videoId = searchParams.get('video_id');

    if (!playlistId || !videoId) {
      return NextResponse.json(
        { error: 'Playlist ID and video ID are required' },
        { status: 400 }
      );
    }

    // Verify user owns playlist
    const { data: playlist } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', playlistId)
      .eq('user_id', user.id)
      .single();

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('playlist_songs')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('video_id', videoId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing track from playlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
