import React from 'react';
import { ArrowRight, Home, Car, Gift, AlertTriangle } from 'lucide-react';
import { Tooltip } from '../retroui/Tooltip';
import { Card } from '../retroui/Card';
import { Text } from '../retroui/Text';

interface Property {
  name: string;
  id: string;
  posistion: number;
  group: string;
}

interface Player {
  peerId: string;
  address: string;
  position: number;
  baseName?: string;
}

interface SpecialSquareProps {
  property: Property;
  position: number;
  players: Player[];
}

const SpecialSquare: React.FC<SpecialSquareProps> = ({ property, position, players }) => {
  const getSpecialSquareConfig = (id: string) => {
    const configs = {
      'go': {
        icon: <ArrowRight className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-blue-900/90 to-blue-800/90',
        border: 'border-blue-500/30',
        text: 'GO',
        subtitle: 'Collect $200',
        description: 'Collect $200 salary as you pass'
      },
      'jail': {
        icon: <AlertTriangle className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-blue-900/90 to-blue-800/90',
        border: 'border-blue-500/30',
        text: 'JAIL',
        subtitle: 'Just Visiting',
        description: 'Just visiting or in jail'
      },
      'freeparking': {
        icon: <Car className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-blue-900/90 to-blue-800/90',
        border: 'border-blue-500/30',
        text: 'FREE',
        subtitle: 'PARKING',
        description: 'Nothing happens - just resting'
      },
      'gotojail': {
        icon: <AlertTriangle className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-blue-900/90 to-blue-800/90',
        border: 'border-blue-500/30',
        text: 'GO TO',
        subtitle: 'JAIL',
        description: 'Go directly to jail - do not pass GO'
      },
      'chance1': {
        icon: <Gift className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-blue-900/90 to-blue-800/90',
        border: 'border-blue-500/30',
        text: '?',
        subtitle: 'CHANCE',
        description: 'Draw a Chance card'
      },
      'chance2': {
        icon: <Gift className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-blue-900/90 to-blue-800/90',
        border: 'border-blue-500/30',
        text: '?',
        subtitle: 'CHANCE',
        description: 'Draw a Chance card'
      },
      'chance3': {
        icon: <Gift className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-blue-900/90 to-blue-800/90',
        border: 'border-blue-500/30',
        text: '?',
        subtitle: 'CHANCE',
        description: 'Draw a Chance card'
      },
      'communitychest1': {
        icon: <Gift className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-blue-900/90 to-blue-800/90',
        border: 'border-blue-500/30',
        text: 'COMMUNITY',
        subtitle: 'CHEST',
        description: 'Draw a Community Chest card'
      },
      'communitychest2': {
        icon: <Gift className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-blue-900/90 to-blue-800/90',
        border: 'border-blue-500/30',
        text: 'COMMUNITY',
        subtitle: 'CHEST',
        description: 'Draw a Community Chest card'
      },
      'communitychest3': {
        icon: <Gift className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-blue-900/90 to-blue-800/90',
        border: 'border-blue-500/30',
        text: 'COMMUNITY',
        subtitle: 'CHEST',
        description: 'Draw a Community Chest card'
      },
      'incometax': {
        icon: <Home className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-slate-900/90 to-slate-800/90',
        border: 'border-slate-500/30',
        text: 'INCOME',
        subtitle: 'TAX $200',
        description: 'Pay $200 income tax'
      },
      'luxerytax': {
        icon: <Home className="w-6 h-6 text-blue-400" />,
        bg: 'bg-gradient-to-br from-slate-900/90 to-slate-800/90',
        border: 'border-slate-500/30',
        text: 'LUXURY',
        subtitle: 'TAX $75',
        description: 'Pay $75 luxury tax'
      }
    };
    
    return configs[id as keyof typeof configs] || {
      icon: <Home className="w-6 h-6 text-blue-400" />,
      bg: 'bg-gradient-to-br from-slate-900/90 to-slate-800/90',
      border: 'border-slate-500/30',
      text: property.name.toUpperCase().slice(0, 8),
      subtitle: '',
      description: property.name
    };
  };

  const config = getSpecialSquareConfig(property.id);

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-800 to-slate-900 p-1 text-white">
      <div className="w-full h-full flex flex-col">
        {/* Special square icon */}
        <div className="h-2 w-full flex items-center justify-center py-2">
          {config.icon}
        </div>
        
        {/* Property name */}
        <div className="flex-1 p-1">
          <p className="text-[8px] font-bold text-center leading-tight">
            {property.name}
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

export default SpecialSquare;
