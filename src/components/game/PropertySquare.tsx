import React from 'react';
import { DollarSign, Home } from 'lucide-react';
import { Tooltip } from '../retroui/Tooltip';
import { Card } from '../retroui/Card';
import { Text } from '../retroui/Text';

interface Property {
  name: string;
  id: string;
  posistion: number;
  price?: number;
  rent?: number;
  group: string;
  buildings?: number;
  mortgaged?: boolean;
  multpliedrent?: number[];
  housecost?: number;
}

interface Player {
  peerId: string;
  address: string;
  position: number;
  baseName?: string;
}

interface PropertySquareProps {
  property: Property;
  position: number;
  players: Player[];
}

const PropertySquare: React.FC<PropertySquareProps> = ({ property, position, players }) => {
  const getGroupColor = (group: string) => {
    const colors = {
      'Purple': 'bg-gradient-to-br from-blue-600 to-blue-700',
      'lightgreen': 'bg-gradient-to-br from-blue-400 to-blue-500',
      'Violet': 'bg-gradient-to-br from-blue-700 to-blue-800',
      'Orange': 'bg-gradient-to-br from-blue-500 to-blue-600',
      'Red': 'bg-gradient-to-br from-blue-800 to-blue-900',
      'Yellow': 'bg-gradient-to-br from-blue-400 to-blue-500',
      'darkgreen': 'bg-gradient-to-br from-blue-700 to-blue-800',
      'darkblue': 'bg-gradient-to-br from-blue-800 to-blue-900',
      'Railroad': 'bg-gradient-to-br from-slate-800 to-slate-900',
      'Utilities': 'bg-gradient-to-br from-blue-400 to-blue-500'
    };
    return colors[group as keyof typeof colors] || 'bg-gradient-to-br from-slate-600 to-slate-700';
  };


  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-800 to-slate-900 p-1 text-white">
      <div className="w-full h-full flex flex-col">
        {/* Property color bar */}
        <div 
          className="h-2 w-full" 
          style={{ backgroundColor: property.group.toLowerCase() }}
        />
        
        {/* Property name */}
        <div className="flex-1 p-1">
          <p className="text-[8px] font-bold text-center leading-tight">
            {property.name}
          </p>
        </div>

        {/* Property price */}
        <div className="p-1">
          <p className="text-[8px] text-center">
            ${property.price}
          </p>
        </div>

        {/* Player tokens */}
        <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-1">
          {players.map((player, index) => (
            <div
              key={player.peerId}
              className="w-2 h-2 rounded-full bg-blue-500"
              style={{
                backgroundColor: `hsl(${index * 137.5 % 360}, 70%, 50%)`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertySquare;