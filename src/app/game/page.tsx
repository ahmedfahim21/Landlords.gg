import { Wallet } from "@coinbase/onchainkit/wallet";
import GameBoard from "@/components/game/GameBoard";
import Chat from "@/components/game/Chat";
import GameState from "@/components/game/GameState";

export default function GamePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto p-2">
        <div className="flex justify-end mb-4">
          <Wallet />
        </div>
        
        <div className="flex justify-center items-center h-[calc(100vh-120px)]">
          <div className="w-full max-w-[min(110vw,110vh)] aspect-[1/0.7]">
            <GameBoard />
          </div>
        </div>
        <div className="fixed bottom-4 right-4 flex gap-4">
          <GameState />
          {/* <Chat /> */}
        </div>
      </div>
    </div>
  );
}