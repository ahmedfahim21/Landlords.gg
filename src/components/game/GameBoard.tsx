"use client";

import { useState, useEffect } from 'react';
import PropertySquare from './PropertySquare';
import SpecialSquare from './SpecialSquare';
import { gameData } from '@/data/game-data';
import { Tooltip } from '../retroui/Tooltip';
import { Card } from '../retroui/Card';
import { Text } from '../retroui/Text';
import { useDataMessage, usePeerIds } from '@huddle01/react/hooks';

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
}

export default function GameBoard() {
  const { tiles, properties } = gameData;
  const { peerIds } = usePeerIds();
  
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayer: null,
    diceRoll: null,
    isRolling: false,
    gameStarted: false,
    gamePhase: 'waiting'
  });

  useDataMessage({
    onMessage: (payload, from, label) => {
      try {
        const data = JSON.parse(payload);
        
        switch (label) {
          case 'game_state':
          case 'game_state_sync':
            setGameState(prev => ({
              ...prev,
              ...data
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
            
          case 'player_info':
            setGameState(prev => {
              const existingPlayer = prev.players.find(p => p.peerId === from);
              if (existingPlayer) {
                return prev;
              }
              // Initialize new player with default game values
              const newPlayer: Player = {
                peerId: from,
                address: data.address,
                baseName: data.baseName,
                position: 0,
                money: 1500,
                properties: [],
                isInJail: false,
                jailTurns: 0
              };
              return {
                ...prev,
                players: [...prev.players, newPlayer]
              };
            });
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
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing game board message:', error);
      }
    },
  });

  // Clean up players that have left
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.filter(player => peerIds.includes(player.peerId))
    }));
  }, [peerIds]);

  const getPropertyData = (tileId: string) => {
    return properties.find(prop => prop.id === tileId);
  };

  const renderSquare = (tile: { id: string }, index: number) => {
    const propertyData = getPropertyData(tile.id);
    const playersOnSquare = gameState.players.filter(p => p.position === index);
    
    if (!propertyData) return null;

    const squareProps = {
      property: propertyData,
      position: index,
      players: playersOnSquare,
      isCurrentPlayerSquare: playersOnSquare.some(p => p.peerId === gameState.currentPlayer),
      gamePhase: gameState.gamePhase
    };

    if (propertyData.group === 'Special') {
      return (
        <SpecialSquare
          key={`${tile.id}-${index}`}
          {...squareProps}
        />
      );
    }

    return (
      <PropertySquare
        key={`${tile.id}-${index}`}
        {...squareProps}
      />
    );
  };

  // Arrange tiles for proper board layout (40 tiles total)
  const bottomRow = tiles.slice(0, 11); // GO to Jail (positions 0-10)
  const leftColumn = tiles.slice(11, 20); // positions 11-19
  const topRow = tiles.slice(20, 31); // positions 20-30
  const rightColumn = tiles.slice(31, 40);

  return (
    <Tooltip.Provider>
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full h-full relative">
          {/* Decorative border */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-2 shadow-2xl">
            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-2">
              <div className="w-full h-full grid grid-cols-11 grid-rows-11 gap-0">
                {/* Top Row */}
                <div className="col-span-11 row-span-1 grid grid-cols-11 gap-0">
                  {/* Free Parking Corner */}
                  <div className="aspect-square">
                    {renderSquare(topRow[0], 20)}
                  </div>
                  {/* Top properties */}
                  {topRow.slice(1, -1).map((tile, idx) => (
                    <div key={`top-${idx}`} className="aspect-square transform rotate-180">
                      {renderSquare(tile, 21 + idx)}
                    </div>
                  ))}
                  {/* Go to Jail Corner */}
                  <div className="aspect-square">
                    {renderSquare(topRow[10], 30)}
                  </div>
                </div>

                {/* Middle 9 Rows */}
                {Array.from({ length: 9 }, (_, rowIdx) => (
                  <div key={`middle-row-${rowIdx}`} className="col-span-11 row-span-1 grid grid-cols-11 gap-0">
                    {/* Left Column Square */}
                    <div className="aspect-square transform rotate-90">
                      {leftColumn[8 - rowIdx] && renderSquare(leftColumn[8 - rowIdx], 19 - rowIdx)}
                    </div>
                    
                    {/* Center Board Area */}
                    <div className="col-span-9 row-span-1 bg-gradient-to-br from-slate-800/50 to-slate-900/50 flex items-center justify-center">
                      {rowIdx === 4 && (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-600/20 blur-xl rounded-full"></div>
                          <Card className="relative bg-slate-900/90 p-6 border-2 border-blue-500/30 backdrop-blur-sm max-w-sm">
                            {gameState.gamePhase === 'waiting' ? (
                              <div className="text-center">
                                <Text className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200 mb-2">
                                  LANDLORDS.GG
                                </Text>
                                <Text className="text-sm text-blue-200/80 mb-3">Web3 Monopoly</Text>
                                <div className="space-y-2">
                                  <Text className="text-sm text-slate-300">
                                    Players: {gameState.players.length}/4
                                  </Text>
                                  <Text className="text-xs text-slate-400">
                                    Waiting for game to start...
                                  </Text>
                                </div>
                              </div>
                            ) : gameState.gamePhase === 'started' ? (
                              <div className="text-center space-y-3">
                                <Text className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-200">
                                  GAME ACTIVE
                                </Text>
                                {gameState.currentPlayer && (
                                  <div className="space-y-1">
                                    <Text className="text-sm text-green-200">Current Turn:</Text>
                                    <Text className="text-sm font-bold text-white">
                                      {gameState.players.find(p => p.peerId === gameState.currentPlayer)?.baseName ||
                                       `${gameState.players.find(p => p.peerId === gameState.currentPlayer)?.address.slice(0, 6)}...`}
                                    </Text>
                                  </div>
                                )}
                                {gameState.diceRoll && (
                                  <div className="flex items-center justify-center space-x-2">
                                    <Text className="text-sm text-orange-200">Last Roll:</Text>
                                    <div className="text-2xl">🎲</div>
                                    <Text className="text-xl font-bold text-orange-300">{gameState.diceRoll}</Text>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="text-center">
                                    <Text className="text-slate-400">Round</Text>
                                    <Text className="text-blue-300 font-bold">1</Text>
                                  </div>
                                  <div className="text-center">
                                    <Text className="text-slate-400">Turn</Text>
                                    <Text className="text-purple-300 font-bold">
                                      {gameState.players.findIndex(p => p.peerId === gameState.currentPlayer) + 1}
                                    </Text>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center">
                                <div className="text-4xl mb-2">🏆</div>
                                <Text className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">
                                  GAME OVER
                                </Text>
                                <Text className="text-sm text-yellow-200/80 mt-2">
                                  Thanks for playing!
                                </Text>
                              </div>
                            )}
                          </Card>
                        </div>
                      )}
                    </div>
                    
                    {/* Right Column Square */}
                    <div className="aspect-square transform -rotate-90">
                      {rightColumn[rowIdx] && renderSquare(rightColumn[rowIdx], 31 + rowIdx)}
                    </div>
                  </div>
                ))}

                {/* Bottom Row */}
                <div className="col-span-11 row-span-1 grid grid-cols-11 gap-0">
                  {/* Jail Corner */}
                  <div className="aspect-square">
                    {renderSquare(bottomRow[10], 10)}
                  </div>
                  {/* Bottom properties */}
                  {bottomRow.slice(1, -1).reverse().map((tile, idx) => (
                    <div key={`bottom-${idx}`} className="aspect-square">
                      {renderSquare(tile, 9 - idx)}
                    </div>
                  ))}
                  {/* GO Corner */}
                  <div className="aspect-square">
                    {renderSquare(bottomRow[0], 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

