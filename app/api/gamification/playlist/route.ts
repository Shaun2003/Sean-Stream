import { NextResponse } from 'next/server';
import { handleRecordPlaylistCreate } from '@/lib/api/gamification';

export async function POST(request: Request) {
  const { userId } = await request.json();

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Missing userId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await handleRecordPlaylistCreate(userId);
    return NextResponse.json(result);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to record playlist creation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
