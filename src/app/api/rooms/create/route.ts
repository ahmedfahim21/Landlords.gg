import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.huddle01.com/api/v2/sdk/rooms/create-room", {
      method: "POST",
      body: JSON.stringify({
        title,
      }),
      headers: {
        "Content-type": "application/json",
        "x-api-key": process.env.HUDDLE_API_KEY!,
      },
      cache: "no-cache",
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create room');
    }

    return NextResponse.json({ roomId: data.data.roomId });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create room' + error },
      { status: 500 }
    );
  }
} 