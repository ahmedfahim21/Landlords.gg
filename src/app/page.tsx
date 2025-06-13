"use client";

import { useState, useEffect } from "react";
import { useRoom, useDataMessage, useLobby, useRoomControls, useLocalPeer } from '@huddle01/react/hooks';
import { useAccount } from 'wagmi';
import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Input } from "@/components/retroui/Input";
import Link from "next/link";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { useName } from '@coinbase/onchainkit/identity';
import { base } from "viem/chains";

interface PlayerInfo {
  peerId: string;
  address: string;
  baseName?: string;
  role?: string;
  metadata?: {
    address?: string;
    baseName?: string;
    hasStaked?: boolean;
    currencyBalance?: string;
    joinedAt?: string;
  };
}

interface LobbyPlayerInfo extends PlayerInfo {
  waitingTime: Date;
}

export default function Home() {
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayerInfo[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [waitingStatus, setWaitingStatus] = useState<string>('');

  const { address, isConnected } = useAccount();
  const { data: baseName } = useName({ address: address as `0x${string}`, chain: base });
  

  // Local peer hook for managing our own peer data
  const { peerId: myPeerId, updateMetadata } = useLocalPeer({
    onMetadataUpdated: (metadata) => {
      console.log('My metadata updated:', metadata);
    }
  });

  // Lobby management hook
  const { admitPeer, denyPeer, getLobbyPeerMetadata } = useLobby({
    onLobbyPeersUpdated: (lobbyPeerIds) => {
      console.log('Lobby peers updated:', lobbyPeerIds);
      // Fetch metadata for each lobby peer
      const updatedLobbyPlayers: LobbyPlayerInfo[] = [];
      lobbyPeerIds.forEach(async (peerId) => {
        const metadata = await getLobbyPeerMetadata(peerId);
        if (metadata && typeof metadata === 'object' && 'address' in metadata) {
          const playerMetadata = metadata as { 
            address: string; 
            baseName?: string;
            hasStaked?: boolean;
            currencyBalance?: string;
            joinedAt?: string;
          };
          updatedLobbyPlayers.push({
            peerId,
            address: playerMetadata.address,
            baseName: playerMetadata.baseName,
            waitingTime: new Date(),
            metadata: {
              address: playerMetadata.address,
              baseName: playerMetadata.baseName,
              hasStaked: playerMetadata.hasStaked,
              currencyBalance: playerMetadata.currencyBalance,
              joinedAt: playerMetadata.joinedAt
            }
          });
        }
      });
      setLobbyPlayers(updatedLobbyPlayers);
    }
  });

  // Room controls for admin functionality
  const { updateControls } = useRoomControls({
    onRoomControlsUpdated: (data) => {
      console.log('Room controls updated:', data);
    },
    onRoomLeave: (data) => {
      console.log('Room leave from controls:', data);
    }
  });

  const { sendData } = useDataMessage({
    onMessage: (payload, from, label) => {
      try {
        const data = JSON.parse(payload);
        
        switch (label) {
          case 'player_info':
            setPlayers(prev => {
              const existing = prev.find(p => p.peerId === from);
              if (existing) {
                return prev.map(p => p.peerId === from ? { ...p, ...data } : p);
              }
              return [...prev, { peerId: from, ...data }];
            });
            break;
            
          case 'game_start':
            if (data.action === 'start') {
              setGameStarted(true);
              setSuccess('Game is starting! 🎮');
            }
            break;
            
          case 'admin_action':
            if (data.action === 'promote' && data.peerId === myPeerId) {
              setIsAdmin(true);
              setSuccess('You are now the room admin! 👑');
            }
            break;
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    },
  });

  const {
    state,
    joinRoom,
    leaveRoom,
    kickPeer,
  } = useRoom({
    onJoin: (data) => {
      console.log('Successfully joined the room!', data.room);
      setIsJoining(false);
      setCurrentRoomId(data.room.roomId);
      setWaitingStatus('');
      
      // Update our metadata with wallet info
      if (address) {
        const metadata = {
          address,
          baseName: baseName || undefined,
          joinedAt: new Date().toISOString()
        };
        
        updateMetadata(metadata);
        
        // Send player info to others
        sendData({
          to: '*',
          payload: JSON.stringify(metadata),
          label: 'player_info'
        });
      }
      
      // Lock room after joining as admin (if this is a new room)
      updateControls({
        type: 'roomLocked',
        value: true,
      });
      
      setIsAdmin(true);
      setSuccess('Room created successfully! You are the admin. 👑');
    },
    onWaiting: (data) => {
      console.log('Waiting:', data.reason, data.message);
      let status = '';
      switch (data.reason) {
        case 'WAITING_FOR_PERMISSIONS':
          status = 'Waiting for admin approval...';
          break;
        case 'WAITING_FOR_ROOM_TO_START':
          status = 'Waiting for room to start...';
          break;
        case 'WAITING_FOR_ADMIN_TO_JOIN':
          status = 'Waiting for admin to join...';
          break;
        default:
          status = data.message || data.reason;
      }
      setWaitingStatus(status);
      setError('');
    },
    onLeave: (data) => {
      console.log('Left the room:', data.reason, data.message);
      setCurrentRoomId(null);
      setIsAdmin(false);
      setGameStarted(false);
      setWaitingStatus('');
      setPlayers([]);
      setLobbyPlayers([]);
      
      let message = '';
      switch (data.reason) {
        case 'LEFT':
          message = 'Successfully left the room';
          break;
        case 'KICKED':
          message = 'You were removed from the room';
          break;
        case 'CLOSED':
          message = 'Room was closed by admin';
          break;
        default:
          message = data.message || `Left room: ${data.reason}`;
      }
      setError(message);
    },
    onFailed: (data) => {
      console.log('Failed to join room:', data.status, data.message);
      setIsJoining(false);
      setWaitingStatus('');
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
            baseName: baseName || undefined,
            joinedAt: new Date().toISOString(),
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

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

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
      
      // Auto-join the created room
      const tokenResponse = await fetch(`/api/token?roomId=${data.roomId}`);
      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }
      const { token } = await tokenResponse.json();

      await joinRoom({
        roomId: data.roomId,
        token,
      });

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
      setError('');
      
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
    } catch (err) {
      setError('Failed to join room: ' + (err instanceof Error ? err.message : String(err)));
      setIsJoining(false);
    }
  };

  const handleAdmitPlayer = (peerId: string) => {
    admitPeer(peerId);
    setLobbyPlayers(prev => prev.filter(p => p.peerId !== peerId));
    setSuccess('Player admitted to room! ✅');
  };

  const handleDenyPlayer = (peerId: string) => {
    denyPeer(peerId);
    setLobbyPlayers(prev => prev.filter(p => p.peerId !== peerId));
    setSuccess('Player denied access ❌');
  };

  const handleKickPlayer = (peerId: string) => {
    kickPeer(peerId);
    setPlayers(prev => prev.filter(p => p.peerId !== peerId));
    setSuccess('Player removed from room ❌');
  };

  const startGame = () => {
    if (players.length < 2) {
      setError('Need at least 2 players to start the game');
      return;
    }
    
    // Check if all players have staked
    const stakedPlayers = players.filter(player => 
      player.metadata && 
      typeof player.metadata === 'object' && 
      'hasStaked' in player.metadata && 
      player.metadata.hasStaked
    );
    
    if (stakedPlayers.length !== players.length) {
      setError('All players must stake before starting the game');
      return;
    }
    
    sendData({
      to: '*',
      payload: JSON.stringify({ action: 'start' }),
      label: 'game_start'
    });
    
    setGameStarted(true);
    setSuccess('Game started! 🎮');
  };

  const leaveRoomHandler = () => {
    leaveRoom();
  };

  const displayName = (player: PlayerInfo) => {
    return player.baseName || `${player.address.slice(0, 6)}...${player.address.slice(-4)}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Landlords.gg</h1>
          <p className="text-xl text-purple-200">Web3 Monopoly Experience</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            {!currentRoomId ? (
              /* Room Creation/Join Interface */
              <Card className="bg-black/20 backdrop-blur-md border-purple-500/30">
                <Card.Header>
                  <div className="flex justify-between items-center">
                    <Card.Title className="text-2xl text-white">Join the Game</Card.Title>
                    <Wallet />
                  </div>
                  <Card.Description className="text-purple-200">
                    Create a new room or join an existing one
                  </Card.Description>
                </Card.Header>
                <Card.Content className="space-y-6">

                  {/* Create Room Section */}
                  <div className="p-6 bg-purple-900/30 rounded-lg border border-purple-500/30">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <span className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                      Create New Room
                    </h3>
                    <div className="flex gap-3">
                      <Input 
                        placeholder="Enter room name..." 
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="flex-1 bg-black/30 border-purple-500/50 text-white placeholder-purple-300"
                      />
                      <Button 
                        onClick={createRoom} 
                        disabled={!isConnected || !roomName}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 disabled:opacity-50"
                      >
                        Create & Host
                      </Button>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-purple-500/30" />
                    </div>
                    <div className="relative flex justify-center text-sm uppercase">
                      <span className="bg-black/20 px-4 text-purple-300 font-medium">OR</span>
                    </div>
                  </div>

                  {/* Join Room Section */}
                  <div className="p-6 bg-blue-900/30 rounded-lg border border-blue-500/30">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                      Join Existing Room
                    </h3>
                    <div className="flex gap-3">
                      <Input 
                        placeholder="Enter room code..." 
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="flex-1 bg-black/30 border-blue-500/50 text-white placeholder-blue-300"
                      />
                      <Button 
                        onClick={joinRoomHandler}
                        disabled={isJoining || state === 'connected' || !isConnected || !roomId}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 disabled:opacity-50"
                      >
                        {isJoining ? 'Joining...' : 'Join Game'}
                      </Button>
                    </div>
                  </div>

                  {/* Wallet Connection Prompt */}
                  {!isConnected && (
                    <div className="p-6 bg-orange-900/30 border border-orange-500/30 rounded-lg">
                      <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                        <span className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">!</span>
                        Connect Wallet
                      </h3>
                      <p className="text-orange-200 text-center mb-4">
                        🔐 Connect your wallet to stake and participate in games
                      </p>
                      <div className="flex justify-center">
                        <Wallet />
                      </div>
                    </div>
                  )}

                  {/* Waiting Status */}
                  {waitingStatus && (
                    <div className="p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-center justify-center space-x-2 text-yellow-200">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                        <span>{waitingStatus}</span>
                      </div>
                    </div>
                  )}
                </Card.Content>
              </Card>
            ) : (
              /* Room Management Interface */
              <div className="space-y-6">
                {/* Room Info */}
                <Card className="bg-black/20 backdrop-blur-md border-green-500/30">
                  <Card.Header>
                    <div className="flex justify-between items-center">
                      <div>
                        <Card.Title className="text-2xl text-white flex items-center">
                          🏠 Room Active
                          {isAdmin && <span className="ml-2 px-2 py-1 bg-gold-500 text-black text-xs rounded-full font-bold">ADMIN</span>}
                        </Card.Title>
                        <Card.Description className="text-green-200">
                          Room ID: <span className="font-mono bg-black/30 px-2 py-1 rounded">{currentRoomId}</span>
                        </Card.Description>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={leaveRoomHandler}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Leave Room
                        </Button>
                        {isAdmin && !gameStarted && (
                          <div className="text-right">
                            <Button 
                              onClick={startGame}
                              disabled={players.length < 2}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Start Game ({players.length}/4)
                            </Button>
                            {players.length >= 2 && (
                              <div className="text-xs text-green-300 mt-1">
                                {(() => {
                                  const stakedCount = players.filter(player => 
                                    player.metadata && 
                                    typeof player.metadata === 'object' && 
                                    'hasStaked' in player.metadata && 
                                    player.metadata.hasStaked
                                  ).length;
                                  return stakedCount === players.length 
                                    ? '✅ All players staked'
                                    : `⚠️ ${stakedCount}/${players.length} players staked`;
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Content>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-blue-900/30 rounded-lg">
                        <div className="text-2xl font-bold text-blue-300">{players.length}</div>
                        <div className="text-sm text-blue-200">Active Players</div>
                      </div>
                      <div className="p-3 bg-green-900/30 rounded-lg">
                        <div className="text-2xl font-bold text-green-300">
                          {players.filter(player => 
                            player.metadata && 
                            typeof player.metadata === 'object' && 
                            'hasStaked' in player.metadata && 
                            player.metadata.hasStaked
                          ).length}
                        </div>
                        <div className="text-sm text-green-200">Staked Players</div>
                      </div>
                      <div className="p-3 bg-yellow-900/30 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-300">{lobbyPlayers.length}</div>
                        <div className="text-sm text-yellow-200">Waiting in Lobby</div>
                      </div>
                      <div className="p-3 bg-purple-900/30 rounded-lg">
                        <div className="text-2xl font-bold text-purple-300">{state}</div>
                        <div className="text-sm text-purple-200">Room Status</div>
                      </div>
                    </div>
                  </Card.Content>
                </Card>

                {/* Lobby Management (Admin Only) */}
                {isAdmin && lobbyPlayers.length > 0 && (
                  <Card className="bg-black/20 backdrop-blur-md border-orange-500/30">
                    <Card.Header>
                      <Card.Title className="text-xl text-white">
                        🚪 Lobby Management ({lobbyPlayers.length} waiting)
                      </Card.Title>
                      <Card.Description className="text-orange-200">
                        Review and approve players waiting to join
                      </Card.Description>
                    </Card.Header>
                    <Card.Content>
                      <div className="space-y-3">
                        {lobbyPlayers.map((player) => (
                          <div key={player.peerId} className="flex items-center justify-between p-4 bg-orange-900/20 rounded-lg border border-orange-500/20">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                                {displayName(player).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-white">{displayName(player)}</div>
                                <div className="text-sm text-orange-300">
                                  Waiting for {Math.floor((Date.now() - player.waitingTime.getTime()) / 1000)}s
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleAdmitPlayer(player.peerId)}
                                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2"
                              >
                                ✓ Admit
                              </Button>
                              <Button
                                onClick={() => handleDenyPlayer(player.peerId)}
                                className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
                              >
                                ✗ Deny
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card.Content>
                  </Card>
                )}

                {/* Game Ready */}
                {gameStarted && (
                  <Card className="bg-black/20 backdrop-blur-md border-green-500/30">
                    <Card.Content className="text-center py-8">
                      <div className="text-4xl mb-4">🎮</div>
                      <h2 className="text-2xl font-bold text-white mb-2">Game Started!</h2>
                      <p className="text-green-200 mb-6">All players are ready. Time to play Landlords!</p>
                      <Link href="/game">
                        <Button className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-3">
                          Enter Game Board
                        </Button>
                      </Link>
                    </Card.Content>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Connected Players */}
            {currentRoomId && (
              <Card className="bg-black/20 backdrop-blur-md border-blue-500/30">
                <Card.Header>
                  <Card.Title className="text-lg text-white">👥 Players ({players.length})</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-3">
                    {players.map((player) => (
                      <div key={player.peerId} className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold relative">
                            {displayName(player).charAt(0).toUpperCase()}
                            {player.metadata && typeof player.metadata === 'object' && 'hasStaked' in player.metadata && player.metadata.hasStaked && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-blue-900"></div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white text-sm flex items-center gap-2">
                              {displayName(player)}
                              {player.metadata && typeof player.metadata === 'object' && 'hasStaked' in player.metadata && player.metadata.hasStaked && (
                                <span className="text-green-400 text-xs">✓ Staked</span>
                              )}
                            </div>
                            <div className="text-xs text-blue-300">
                              {player.peerId === myPeerId ? 'You' : 'Player'}
                            </div>
                          </div>
                        </div>
                        {isAdmin && player.peerId !== myPeerId && (
                          <Button
                            onClick={() => handleKickPlayer(player.peerId)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1"
                          >
                            Kick
                          </Button>
                        )}
                      </div>
                    ))}
                    {players.length === 0 && (
                      <div className="text-center text-blue-300 py-4">
                        No players connected yet
                      </div>
                    )}
                  </div>
                </Card.Content>
              </Card>
            )}

            {/* Game Rules */}
            <Card className="bg-black/20 backdrop-blur-md border-purple-500/30">
              <Card.Header>
                <Card.Title className="text-lg text-white">📋 How to Play</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3 text-sm text-purple-200">
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-400">1.</span>
                    <span>Connect your Web3 wallet</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-400">2.</span>
                    <span>Stake 0.001 ETH to get 1,500 BaseBucks</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-400">3.</span>
                    <span>Create a room or join with code</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-400">4.</span>
                    <span>Wait for 2-4 players to join</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-400">5.</span>
                    <span>Admin starts the game</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-400">6.</span>
                    <span>Buy properties, collect rent, win!</span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
