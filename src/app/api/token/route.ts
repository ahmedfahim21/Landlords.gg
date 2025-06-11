import { AccessToken, Role } from "@huddle01/server-sdk/auth";
import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json(
      { error: "Missing roomId" },
      { status: 400 }
    );
  }

  try {
    const accessToken = new AccessToken({
      apiKey: process.env.HUDDLE_API_KEY!,
      roomId: roomId,
      role: Role.HOST,
      permissions: {
        admin: true,
        canConsume: true,
        canProduce: true,
        canProduceSources: {
          cam: true,
          mic: true,
          screen: true,
        },
        canRecvData: true,
        canSendData: true,
        canUpdateMetadata: true,
      }
    });

    const token = await accessToken.toJwt();
    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate token" + error },
      { status: 500 }
    );
  }
} 