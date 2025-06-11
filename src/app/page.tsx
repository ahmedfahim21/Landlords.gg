"use client";

import { useState } from "react";
import { useRoom, usePeerIds, useDataMessage } from '@huddle01/react/hooks';
import { useAccount } from 'wagmi';
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Input } from "@/components/retroui/Input";
import Link from "next/link";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { useName } from '@coinbase/onchainkit/identity';

interface PlayerInfo {
  peerId: string;
  address: string;
  baseName?: string;
}

export default function Home() {
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);

  const { address, isConnected } = useAccount();
  const { data: baseName } = useName({ address });

  const { peerIds } = usePeerIds();

  const { sendData } = useDataMessage({
    onMessage: (payload, from, label) => {
      if (label === 'player_info') {
        const playerInfo = JSON.parse(payload);
        setPlayers(prev => {
          const existing = prev.find(p => p.peerId === from);
          if (existing) {
            return prev.map(p => p.peerId === from ? { ...p, ...playerInfo } : p);
          }
          return [...prev, { peerId: from, ...playerInfo }];
        });
      }
    },
  });

  const {
    room,
    state,
    joinRoom,
    leaveRoom,
    closeRoom,
  } = useRoom({
    onJoin: (data) => {
      console.log('Successfully joined the room!', data.room);
      setIsJoining(false);
      setCurrentRoomId(data.room.roomId);
      
      // Send player info when joining
      if (address) {
        sendData({
          to: '*',
          payload: JSON.stringify({
            address,
            baseName: baseName || undefined
          }),
          label: 'player_info'
        });
      }
    },
    onWaiting: (data) => {
      console.log('Waiting:', data.reason, data.message);
      setError(`Waiting: ${data.message || data.reason}`);
    },
    onLeave: (data) => {
      console.log('Left the room:', data.reason, data.message);
      setCurrentRoomId(null);
      setError(data.message || `Left room: ${data.reason}`);
      setPlayers([]);
    },
    onFailed: (data) => {
      console.log('Failed to join room:', data.status, data.message);
      setIsJoining(false);
      setError(`Failed: ${data.message}`);
    },
    onPeerJoin: (data) => {
      let peerId: string | undefined;
      if (typeof data === 'string') {
        peerId = data;
      } else if (data && typeof data === 'object' && 'peer' in data && data.peer && typeof data.peer === 'object' && 'peerId' in data.peer) {
        peerId = data.peer.peerId as string;
      }
      if (!peerId) return;
      console.log(`${peerId} has joined the room`);
      // Send our info to the new peer
      if (address) {
        sendData({
          to: [peerId],
          payload: JSON.stringify({
            address,
            baseName: baseName || undefined
          }),
          label: 'player_info'
        });
      }
    },
    onPeerLeft: (data) => {
      let peerId: string | undefined;
      if (typeof data === 'string') {
        peerId = data;
      } else if (data && typeof data === 'object' && 'peer' in data && data.peer && typeof data.peer === 'object' && 'peerId' in data.peer) {
        peerId = data.peer.peerId as string;
      }
      if (!peerId) return;
      console.log(`${peerId} has left the room`);
      setPlayers(prev => prev.filter(p => p.peerId !== peerId));
    },
  });

  const createRoom = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }
    if (!roomName) {
      setError('Please enter a room name');
      return;
    }

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: roomName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }

      const data = await response.json();
      setRoomId(data.roomId);
      setRoomName('');
      setError('');
    } catch (err) {
      setError('Failed to create room: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const joinRoomHandler = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }
    if (!roomId) {
      setError('Please enter a room ID');
      return;
    }

    try {
      setIsJoining(true);
      // Get access token
      const tokenResponse = await fetch(`/api/token?roomId=${roomId}`);
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to get access token');
      }
      const { token } = await tokenResponse.json();

      // Join the room
      await joinRoom({
        roomId,
        token,
      });

      setRoomId('');
      setError('');
    } catch (err) {
      setError('Failed to join room: ' + (err instanceof Error ? err.message : String(err)));
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900 p-4">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title className="text-3xl font-bold text-center">Landlords.gg</Card.Title>
          <Card.Description className="text-center">Web3 Monopoly Game</Card.Description>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="flex justify-end mb-4">
            <Wallet />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Create a Room</h3>
            <div className="flex gap-2">
              <Input 
                placeholder="Room Name" 
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <Button onClick={createRoom} disabled={!isConnected}>
                Create
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Join a Room</h3>
            <div className="flex gap-2">
              <Input 
                placeholder="Room Code" 
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <Button 
                onClick={joinRoomHandler}
                disabled={isJoining || state === 'connected' || !isConnected}
              >
                {isJoining ? 'Joining...' : 'Join'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {currentRoomId && (
            <div className="mt-4">
              <Link href="/game">
                <Button className="w-full">
                  Enter Game Room
                </Button>
              </Link>
              <div className="mt-2 text-sm text-center">
                <p>Room ID: {currentRoomId}</p>
                <p>Status: {state}</p>
                <p>Active Players: {peerIds.length}</p>
                {players.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Players:</p>
                    <ul className="text-left">
                      {players.map((player) => (
                        <li key={player.peerId} className="text-xs">
                          {player.baseName || player.address.slice(0, 6) + '...' + player.address.slice(-4)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>
    </main>
  );
}
