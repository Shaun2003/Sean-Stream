import { NextResponse } from 'next/server';
import { handleRecordPlay } from '@/lib/api/gamification';

export async function POST(request: Request) {
  const { userId, duration } = await request.json();

  if (!userId || !duration) {
    return new Response(
      JSON.stringify({ error: 'Missing userId or duration' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await handleRecordPlay(userId, duration);
    return NextResponse.json(result);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to record play' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
