import { Card } from "../retroui/Card";


export default function GameBoard() {
  return (
    <Card className="aspect-square">
      <Card.Content className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Game Board</h2>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      </Card.Content>
    </Card>
  );
} 