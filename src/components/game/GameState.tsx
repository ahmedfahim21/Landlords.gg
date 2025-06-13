"use client";

import { useState, useEffect } from 'react';
import { useDataMessage, usePeerIds, useLocalPeer } from '@huddle01/react/hooks';
import { useAccount } from 'wagmi';
import { useName } from '@coinbase/onchainkit/identity';
import { Card } from '../retroui/Card';
import { Button } from '../retroui/Button';
import { Text } from '../retroui/Text';
import { base } from 'viem/chains';

interface Player {
  peerId: string;
  address: string;
  position: number;
  baseName?: string;
  money: number;
  properties: string[];
  isInJail: boolean;
  jailTurns: number;
}

interface GameState {
  players: Player[];
  currentPlayer: string | null;
  diceRoll: number | null;
  isRolling: boolean;
  gameStarted: boolean;
  gamePhase: 'waiting' | 'started' | 'ended';
  winner: string | null;
}

export default function GameState() {
  const { address } = useAccount();
  const { data: baseName } = useName({ address: address as `0x${string}`, chain: base });
  const { peerIds } = usePeerIds();
  const { peerId: myPeerId } = useLocalPeer();
  
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayer: null,
    diceRoll: null,
    isRolling: false,
    gameStarted: false,
    gamePhase: 'waiting',
    winner: null
  });

  const { sendData } = useDataMessage({
    onMessage: (payload, from, label) => {
      try {
        const data = JSON.parse(payload);
        
        switch (label) {
          case 'game_state':
            setGameState(prev => ({
              ...prev,
              ...data
            }));
            break;

          case 'game_state_sync':
            // Merge incoming state with current state, prioritizing newer data
            setGameState(prev => ({
              ...prev,
              ...data,
              players: data.players || prev.players
            }));
            break;
            
          case 'player_info':
            setGameState(prev => {
              const existingPlayer = prev.players.find(p => p.peerId === from);
              if (existingPlayer) {
                return {
                  ...prev,
                  players: prev.players.map(p => 
                    p.peerId === from ? { ...p, ...data, position: p.position, money: p.money, properties: p.properties } : p
                  )
                };
              }
              // Initialize new player with default game values
              const newPlayer: Player = {
                peerId: from,
                address: data.address,
                baseName: data.baseName,
                position: 0,
                money: 1500, // Starting money
                properties: [],
                isInJail: false,
                jailTurns: 0
              };
              
              // Send current game state to the new player
              setTimeout(() => {
                sendData({
                  to: [from],
                  payload: JSON.stringify({
                    players: [...prev.players, newPlayer],
                    currentPlayer: prev.currentPlayer,
                    gameStarted: prev.gameStarted,
                    gamePhase: prev.gamePhase,
                    diceRoll: prev.diceRoll
                  }),
                  label: 'game_state_sync'
                });
              }, 100);

              return {
                ...prev,
                players: [...prev.players, newPlayer]
              };
            });
            break;

          case 'game_sync':
            if (data.action === 'request_state') {
              // Send current game state to requesting peer
              sendData({
                to: [from],
                payload: JSON.stringify({
                  players: gameState.players,
                  currentPlayer: gameState.currentPlayer,
                  gameStarted: gameState.gameStarted,
                  gamePhase: gameState.gamePhase,
                  diceRoll: gameState.diceRoll
                }),
                label: 'game_state_sync'
              });
            }
            break;
            
          case 'dice_roll':
            setGameState(prev => ({
              ...prev,
              diceRoll: data.roll,
              isRolling: false
            }));
            break;
            
          case 'player_move':
            setGameState(prev => ({
              ...prev,
              players: prev.players.map(p => 
                p.peerId === data.peerId ? { ...p, position: data.position } : p
              )
            }));
            break;
            
          case 'game_control':
            if (data.action === 'start') {
              setGameState(prev => ({
                ...prev,
                gameStarted: true,
                gamePhase: 'started',
                currentPlayer: data.currentPlayer || prev.players[0]?.peerId || null,
                players: data.players || prev.players
              }));
            } else if (data.action === 'end') {
              setGameState(prev => ({
                ...prev,
                gamePhase: 'ended',
                winner: data.winner
              }));
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing game message:', error);
      }
    },
  });

  // Clean up players that have left the room
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.filter(player => peerIds.includes(player.peerId))
    }));
  }, [peerIds]);

  // Initialize player when component loads and sync with existing players
  useEffect(() => {
    if (address && myPeerId) {
      const playerData = {
        address,
        baseName: baseName || undefined,
        joinedAt: new Date().toISOString()
      };
      
      // Send our info to all peers
      sendData({
        to: '*',
        payload: JSON.stringify(playerData),
        label: 'player_info'
      });

      // Request existing game state from others
      sendData({
        to: '*',
        payload: JSON.stringify({ action: 'request_state' }),
        label: 'game_sync'
      });
    }
  }, [address, baseName, myPeerId, sendData]);

  // Handle game synchronization requests
  useEffect(() => {
    if (gameState.players.length > 0) {
      // Listen for state requests and respond with current game state
      const handleSyncRequest = () => {
        sendData({
          to: '*',
          payload: JSON.stringify({
            players: gameState.players,
            currentPlayer: gameState.currentPlayer,
            gameStarted: gameState.gameStarted,
            gamePhase: gameState.gamePhase,
            diceRoll: gameState.diceRoll
          }),
          label: 'game_state_sync'
        });
      };

      // Send current state periodically to keep everyone in sync
      const syncInterval = setInterval(() => {
        if (gameState.gamePhase === 'started') {
          handleSyncRequest();
        }
      }, 5000);

      return () => clearInterval(syncInterval);
    }
  }, [gameState, sendData]);

  const startGame = () => {
    if (gameState.players.length < 2) {
      alert('Need at least 2 players to start the game');
      return;
    }

    const gameData = {
      action: 'start',
      players: gameState.players,
      currentPlayer: gameState.players[0].peerId,
      gameStarted: true,
      gamePhase: 'started'
    };

    // Send to all players
    sendData({
      to: '*',
      payload: JSON.stringify(gameData),
      label: 'game_control'
    });

    // Also send complete state sync
    setTimeout(() => {
      sendData({
        to: '*',
        payload: JSON.stringify({
          players: gameState.players,
          currentPlayer: gameState.players[0].peerId,
          gameStarted: true,
          gamePhase: 'started',
          diceRoll: null
        }),
        label: 'game_state_sync'
      });
    }, 100);

    // Update local state
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      gamePhase: 'started',
      currentPlayer: gameState.players[0].peerId
    }));
  };

  const rollDice = () => {
    if (gameState.isRolling || gameState.currentPlayer !== myPeerId || gameState.gamePhase !== 'started') {
      return;
    }

    setGameState(prev => ({ ...prev, isRolling: true }));
    
    // Simulate dice roll animation
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      const currentPlayer = gameState.players.find(p => p.peerId === myPeerId);
      
      if (currentPlayer) {
        const newPosition = (currentPlayer.position + roll) % 40;
        
        // Update player position
        sendData({
          to: '*',
          payload: JSON.stringify({
            peerId: myPeerId,
            position: newPosition
          }),
          label: 'player_move'
        });

        // Send dice roll result
        sendData({
          to: '*',
          payload: JSON.stringify({ roll }),
          label: 'dice_roll'
        });

        // Find next player and update current player
        const currentIndex = gameState.players.findIndex(p => p.peerId === myPeerId);
        const nextPlayer = gameState.players[(currentIndex + 1) % gameState.players.length];

        const updatedGameState = {
          currentPlayer: nextPlayer.peerId,
          isRolling: false,
          diceRoll: roll
        };

        sendData({
          to: '*',
          payload: JSON.stringify(updatedGameState),
          label: 'game_state'
        });
      }
    }, 1000);
  };

  const endTurn = () => {
    if (gameState.currentPlayer !== myPeerId) return;

    const currentIndex = gameState.players.findIndex(p => p.peerId === myPeerId);
    const nextPlayer = gameState.players[(currentIndex + 1) % gameState.players.length];

    sendData({
      to: '*',
      payload: JSON.stringify({
        currentPlayer: nextPlayer.peerId,
        diceRoll: null
      }),
      label: 'game_state'
    });
  };

  const isCurrentPlayer = gameState.currentPlayer === myPeerId;
  const isFirstPlayer = gameState.players.length > 0 && gameState.players[0].peerId === myPeerId;
  const currentPlayerData = gameState.players.find(p => p.peerId === gameState.currentPlayer);
  const myPlayerData = gameState.players.find(p => p.peerId === myPeerId);

  const displayName = (player: Player) => {
    return player.baseName || `${player.address?.slice(0, 6)}...${player.address?.slice(-4)}`;
  };

  return (
    <Card className="w-80 bg-black/20 backdrop-blur-md border-blue-500/30">
      <Card.Header>
        <Card.Title className="text-white text-xl">🎮 Game Control</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-4">
          {gameState.gamePhase === 'waiting' ? (
            <div className="space-y-4">
              <div className="text-center">
                <Text className="text-sm font-semibold text-blue-200 mb-2">
                  Waiting for game to start...
                </Text>
                <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                  <Text className="text-lg font-bold text-blue-300">
                    {gameState.players.length} / 4
                  </Text>
                  <Text className="text-sm text-blue-200">Players Ready</Text>
                </div>
              </div>

              {gameState.players.length > 0 && (
                <div className="space-y-2">
                  <Text className="text-sm font-semibold text-white">Players:</Text>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {gameState.players.map((player, idx) => (
                      <div key={player.peerId} className="flex items-center justify-between p-2 bg-slate-800/50 rounded text-xs">
                        <span className="text-white">
                          {idx + 1}. {displayName(player)}
                        </span>
                        <span className="text-green-400">${player.money}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isFirstPlayer && gameState.players.length >= 2 && (
                <Button 
                  onClick={startGame}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  🚀 Start Game
                </Button>
              )}
              
              {!isFirstPlayer && gameState.players.length >= 2 && (
                <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/30 text-center">
                  <Text className="text-yellow-200 text-sm">
                    Waiting for host to start the game...
                  </Text>
                </div>
              )}
            </div>
          ) : gameState.gamePhase === 'started' ? (
            <div className="space-y-4">
              {/* Current Player Display */}
              <div className="p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30">
                <Text className="text-sm font-semibold text-purple-200 mb-1">Current Turn:</Text>
                <Text className="text-lg font-bold text-white">
                  {currentPlayerData ? displayName(currentPlayerData) : 'Unknown'}
                </Text>
                {isCurrentPlayer && (
                  <Text className="text-sm text-green-400 mt-1">🎯 Your turn!</Text>
                )}
              </div>

              {/* My Player Stats */}
              {myPlayerData && (
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/50">
                  <Text className="text-sm font-semibold text-slate-300 mb-2">Your Stats:</Text>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Text className="text-slate-400">Money:</Text>
                      <Text className="text-green-400 font-bold">${myPlayerData.money}</Text>
                    </div>
                    <div>
                      <Text className="text-slate-400">Position:</Text>
                      <Text className="text-blue-400 font-bold">{myPlayerData.position}</Text>
                    </div>
                    <div>
                      <Text className="text-slate-400">Properties:</Text>
                      <Text className="text-yellow-400 font-bold">{myPlayerData.properties.length}</Text>
                    </div>
                    <div>
                      <Text className="text-slate-400">Status:</Text>
                      <Text className={`font-bold ${myPlayerData.isInJail ? 'text-red-400' : 'text-green-400'}`}>
                        {myPlayerData.isInJail ? 'In Jail' : 'Free'}
                      </Text>
                    </div>
                  </div>
                </div>
              )}

              {/* Dice Roll Result */}
              {gameState.diceRoll && (
                <div className="p-3 bg-orange-900/30 rounded-lg border border-orange-500/30 text-center">
                  <Text className="text-sm text-orange-200 mb-1">Last Roll:</Text>
                  <div className="text-3xl font-bold text-orange-300">🎲 {gameState.diceRoll}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  onClick={rollDice}
                  disabled={!isCurrentPlayer || gameState.isRolling}
                  className={`w-full ${
                    isCurrentPlayer 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {gameState.isRolling ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin mr-2">🎲</span>
                      Rolling...
                    </span>
                  ) : (
                    '🎲 Roll Dice'
                  )}
                </Button>

                {isCurrentPlayer && gameState.diceRoll && (
                  <Button 
                    onClick={endTurn}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    ✅ End Turn
                  </Button>
                )}
              </div>

              {/* Other Players */}
              <div className="space-y-2">
                <Text className="text-sm font-semibold text-white">Other Players:</Text>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {gameState.players.filter(p => p.peerId !== myPeerId).map((player) => (
                    <div key={player.peerId} className="flex items-center justify-between p-2 bg-slate-800/30 rounded text-xs">
                      <span className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          gameState.currentPlayer === player.peerId ? 'bg-green-400' : 'bg-gray-500'
                        }`}></span>
                        <span className="text-white">{displayName(player)}</span>
                      </span>
                      <span className="text-green-400">${player.money}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Game Ended */
            <div className="text-center space-y-4">
              <div className="text-4xl">🏆</div>
              <Text className="text-xl font-bold text-yellow-400">Game Over!</Text>
              {gameState.winner && (
                <Text className="text-lg text-white">
                  Winner: {displayName(gameState.players.find(p => p.peerId === gameState.winner) || gameState.players[0])}
                </Text>
              )}
              <Button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                🏠 Back to Lobby
              </Button>
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
} 