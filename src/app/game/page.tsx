import { Wallet } from "@coinbase/onchainkit/wallet";
import GameBoard from "@/components/game/GameBoard";
import Chat from "@/components/game/Chat";

export default function GamePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900">
      <div className="container mx-auto py-8">
        <div className="flex justify-end mb-8">
          <Wallet />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <GameBoard />
          </div>
          <div className="lg:col-span-1">
            <Chat />
          </div>
        </div>
      </div>
    </div>
  );
} 