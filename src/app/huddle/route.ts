import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, Role } from '@huddle01/server-sdk/auth';

export async function POST(request: NextRequest) {
    try {
        const { roomId, role = Role.HOST, metadata } = await request.json();

        if (!roomId) {
            return NextResponse.json(
                { error: 'Room ID is required' },
                { status: 400 }
            );
        }

        const accessToken = new AccessToken({
            apiKey: process.env.HUDDLE_API_KEY || "",
            roomId: roomId,
            role: role,
            permissions: {
                admin: role === Role.HOST,
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
            },
            options: {
                metadata: metadata || {},
            },
        });

        const token = accessToken.toJwt();

        return NextResponse.json({ token });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to generate access token' + error }, 
            { status: 500 }
        );
    }
}