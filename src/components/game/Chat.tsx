"use client";

import { useState, useEffect } from "react";
import { useDataMessage } from '@huddle01/react/hooks';
import { Card } from "../retroui/Card";
import { ScrollArea } from "../ui/ScrollArea";
import { Input } from "../retroui/Input";
import { Button } from "../retroui/Button";
import { useAccount } from 'wagmi';
import { useName } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

interface Message {
  id: string;
  user: string; // peerId
  content: string;
  timestamp: Date;
}

interface PlayerInfo {
  peerId: string;
  address: string;
  baseName?: string;
  isLoading?: boolean;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [players, setPlayers] = useState<PlayerInfo[]>([]);

  const { address } = useAccount();
  const { data: baseName, isLoading: isBaseNameLoading } = useName({ 
    address: address as `0x${string}`, 
    chain: base 
  });

  const { sendData } = useDataMessage({
    onMessage: (payload, from, label) => {
      if (label === 'chat') {
        const message: Message = {
          id: Date.now().toString(),
          user: from,
          content: payload,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, message]);
      } else if (label === 'player_info') {
        try {
          const playerInfo = JSON.parse(payload);
          // Ensure we include the peerId in the player info
          const fullPlayerInfo: PlayerInfo = {
            ...playerInfo,
            peerId: from
          };
          console.log('Received player info:', fullPlayerInfo); // Debug log
          setPlayers(prev => {
            const existing = prev.find(p => p.peerId === from);
            if (existing) {
              return prev.map(p => p.peerId === from ? fullPlayerInfo : p);
            }
            return [...prev, fullPlayerInfo];
          });
        } catch (error) {
          console.error('Error parsing player info:', error);
        }
      }
    },
  });

  // Send our player info on mount and when it changes
  useEffect(() => {
    if (address) {
      const playerInfo = {
        address,
        baseName: baseName || undefined,
        isLoading: isBaseNameLoading
      };
      console.log('Sending player info:', playerInfo); // Debug log
      sendData({
        to: '*',
        payload: JSON.stringify(playerInfo),
        label: 'player_info'
      });
    }
  }, [address, baseName, isBaseNameLoading, sendData]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    sendData({
      to: '*',
      payload: newMessage,
      label: 'chat',
    });

    setNewMessage("");
  };

  // Helper to get display name for a peerId
  const getDisplayName = (peerId: string) => {
    const player = players.find(p => p.peerId === peerId);
    console.log('Getting display name for peerId:', peerId, 'Found player:', player); // Debug log
    
    if (!player) return peerId;

    if (player.isLoading) {
      return "Loading...";
    }

    if (player.baseName) {
      return player.baseName;
    }

    if (player.address) {
      return `${player.address.slice(0, 6)}...${player.address.slice(-4)}`;
    }

    return peerId;
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <Card.Header>
        <Card.Title>Game Chat</Card.Title>
      </Card.Header>
      <Card.Content className="flex-1 flex flex-col gap-4">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{getDisplayName(message.user)}</span>
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage}>Send</Button>
        </div>
      </Card.Content>
    </Card>
  );
} 