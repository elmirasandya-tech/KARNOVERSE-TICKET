import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket } from '@/types';

interface TicketItemProps {
  ticket: Ticket;
  quantity: number;
  onQuantityChange: (id: string, quantity: number) => void;
}

export const TicketItem: React.FC<TicketItemProps> = ({ ticket, quantity, onQuantityChange }) => {
  const handleIncrement = () => onQuantityChange(ticket.id, quantity + 1);
  const handleDecrement = () => onQuantityChange(ticket.id, Math.max(0, quantity - 1));
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      onQuantityChange(ticket.id, Math.max(0, val));
    } else if (e.target.value === '') {
      onQuantityChange(ticket.id, 0);
    }
  };

  const isOutOfStock = ticket.stock <= 0;

  return (
    <Card className={`overflow-hidden border-zinc-200 bg-white text-zinc-900 transition-all shadow-sm ${isOutOfStock ? 'opacity-75 grayscale-[0.5]' : 'hover:border-red-500/50'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-bold tracking-tight text-zinc-900">{ticket.name}</CardTitle>
          <Badge variant="outline" className="border-red-500/30 text-red-600 bg-red-50">
            {ticket.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-baseline gap-2">
          {ticket.discount && ticket.discount > 0 ? (
            <>
              <div className="text-2xl font-black text-zinc-900">
                Rp {(ticket.price - ticket.discount).toLocaleString('id-ID')}
              </div>
              <div className="text-sm text-zinc-400 line-through">
                Rp {ticket.price.toLocaleString('id-ID')}
              </div>
            </>
          ) : (
            <div className="text-2xl font-black text-zinc-900">
              Rp {ticket.price.toLocaleString('id-ID')}
            </div>
          )}
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {isOutOfStock ? (
            <span className="text-red-600 font-bold uppercase tracking-wider">Stok Tiket Habis</span>
          ) : (
            <>Stok: <span className={ticket.stock < 10 ? "text-red-600 font-bold" : "text-zinc-700 font-medium"}>{ticket.stock}</span></>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-zinc-50 p-3 border-t border-zinc-100">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900"
              onClick={handleDecrement}
              disabled={quantity === 0 || isOutOfStock}
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <Input
              type="number"
              value={quantity === 0 ? '' : quantity}
              onChange={handleInputChange}
              placeholder="0"
              disabled={isOutOfStock}
              className="h-8 w-16 border-zinc-300 bg-white text-center text-zinc-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:ring-red-500 disabled:opacity-50"
            />
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900"
              onClick={handleIncrement}
              disabled={quantity >= ticket.stock || isOutOfStock}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {quantity > 0 && (
            <div className="text-sm font-bold text-red-600">
              Rp {((ticket.price - (ticket.discount || 0)) * quantity).toLocaleString('id-ID')}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
