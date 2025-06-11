'use client';

import { useState } from 'react';
import { useRoom, usePeerIds, useDataMessage } from '@huddle01/react/hooks';
import { Button } from '@/components/retroui/Button';

export default function RoomManager() {
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ from: string; payload: string; label?: string }>>([]);

  const { peerIds } = usePeerIds();

  const { sendData } = useDataMessage({
    onMessage: (payload, from, label) => {
      console.log('Received message:', { payload, from, label });
      setMessages(prev => [...prev, { from, payload, label }]);
    },
  });

  const {
    room,
    state,
    joinRoom,
    leaveRoom,
    closeRoom,
    kickPeer,
    muteEveryone,
  } = useRoom({
    onJoin: (data) => {
      console.log('Successfully joined the room!', data.room);
      setIsJoining(false);
      setCurrentRoomId(data.room.roomId);
    },
    onWaiting: (data) => {
      console.log('Waiting:', data.reason, data.message);
      setError(`Waiting: ${data.message || data.reason}`);
    },
    onLeave: (data) => {
      console.log('Left the room:', data.reason, data.message);
      setCurrentRoomId(null);
      setError(data.message || `Left room: ${data.reason}`);
      setMessages([]);
    },
    onFailed: (data) => {
      console.log('Failed to join room:', data.status, data.message);
      setIsJoining(false);
      setError(`Failed: ${data.message}`);
    },
    onPeerJoin: (peerId) => {
      console.log(`${peerId} has joined the room`);
    },
    onPeerLeft: (peerId) => {
      console.log(`${peerId} has left the room`);
    },
  });

  const createRoom = async () => {
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

  const leaveRoomHandler = async () => {
    try {
      await leaveRoom();
    } catch (err) {
      setError('Failed to leave room: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const closeRoomHandler = async () => {
    try {
      await closeRoom();
    } catch (err) {
      setError('Failed to close room: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const sendMessageHandler = () => {
    if (!message.trim()) return;

    sendData({
      to: '*',
      payload: message,
      label: 'chat',
    });

    setMessage('');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Create Room</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={createRoom}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Create
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Join Room</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
              className="flex-1 p-2 border rounded"
            />
            <Button
              onClick={joinRoomHandler}
              disabled={isJoining || state === 'connected'}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isJoining ? 'Joining...' : 'Join'}
            </Button>
          </div>
        </div>

        {currentRoomId && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Room Controls</h2>
            <div className="flex gap-2">
              <Button
                onClick={leaveRoomHandler}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              >
                Leave Room
              </Button>
              <Button
                onClick={closeRoomHandler}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Close Room
              </Button>
            </div>
            <div className="mt-2 text-black">
              <p className="text-sm text-gray-600">Room ID: {currentRoomId}</p>
              <p className="text-sm text-gray-600">Status: {state}</p>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Active Members ({peerIds.length})</h3>
              <div className="space-y-1">
                {peerIds.map((peerId) => (
                  <div key={peerId} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-gray-700">{peerId}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Chat</h3>
              <div className="h-48 overflow-y-auto border rounded p-2 mb-2">
                {messages.map((msg, index) => (
                  <div key={index} className="mb-2">
                    <p className="text-xs text-gray-500">{msg.from}</p>
                    <p className="text-sm">{msg.payload}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border rounded"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessageHandler()}
                />
                <Button
                  onClick={sendMessageHandler}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 