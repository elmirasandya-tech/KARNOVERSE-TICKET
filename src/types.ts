export interface StockAdjustment {
  id: string;
  ticketId: string;
  type: 'ADD' | 'REMOVE' | 'FORCE_MAJEURE';
  amount: number;
  note: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  name: string;
  price: number;
  discount?: number; // Fixed amount discount per ticket
  stock: number;
  category: string;
  isActive: boolean;
  adjustments?: StockAdjustment[];
}

export interface CartItem extends Ticket {
  quantity: number;
}

export type PaymentMethod = 'CASH' | 'TRANSFER';

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number; // Total discount (ticket-level + transaction-level)
  total: number;
  paymentMethod: PaymentMethod;
  timestamp: string;
  cashier: string;
}

export interface Expense {
  id: string;
  note: string;
  amount: number;
  timestamp: string;
}

export interface PettyCash {
  initialBalance: number; // For backward compatibility/default
  dailyInitialBalances?: Record<string, number>; // Map of YYYY-MM-DD -> balance
  expenses: Expense[];
  currentBalance: number;
}

export interface DailyReport {
  date: string;
  totalRevenue: number;
  cashRevenue: number;
  transferRevenue: number;
  totalTransactions: number;
  transactions: Transaction[];
  pettyCash: PettyCash;
}
