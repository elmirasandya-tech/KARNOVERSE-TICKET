import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ticket as TicketIcon, 
  Wallet, 
  BarChart3, 
  ShoppingCart, 
  LogOut, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  Settings as SettingsIcon,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { TicketItem } from '@/components/TicketItem';
import { PettyCash } from '@/components/PettyCash';
import { Reports } from '@/components/Reports';
import { TicketSettings } from '@/components/TicketSettings';
import { 
  Ticket, 
  CartItem, 
  Transaction, 
  PaymentMethod, 
  PettyCash as PettyCashType, 
  Expense,
  DailyReport,
  StockAdjustment
} from '@/types';
import { googleSheetsService } from '@/services/googleSheets';

// Initial Mock Data
const INITIAL_TICKETS: Ticket[] = [
  { id: 't1', name: 'Tiket Penonton Futsal', price: 25000, stock: 1000, category: 'Main', isActive: true },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('kasir');
  
  // State
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem('tickets');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure isActive exists for old data
      return parsed.map((t: any) => ({ ...t, isActive: t.isActive ?? true }));
    }
    return INITIAL_TICKETS;
  });
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactionDiscount, setTransactionDiscount] = useState(0);
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [pettyCash, setPettyCash] = useState<PettyCashType>(() => {
    const saved = localStorage.getItem('pettyCash');
    return saved ? JSON.parse(saved) : { initialBalance: 1000000, dailyInitialBalances: {}, expenses: [], currentBalance: 1000000 };
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('tickets', JSON.stringify(tickets));
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('pettyCash', JSON.stringify(pettyCash));
  }, [tickets, transactions, pettyCash]);

  // Derived State
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + ((item.price - (item.discount || 0)) * item.quantity), 0), [cart]);
  const cartTotal = useMemo(() => Math.max(0, cartSubtotal - transactionDiscount), [cartSubtotal, transactionDiscount]);
  
  const dailyReport = useMemo((): DailyReport => {
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = transactions.filter(tx => tx.timestamp.startsWith(today));
    const todayExpenses = pettyCash.expenses.filter(exp => exp.timestamp.startsWith(today));
    
    const todayInitialBalance = (pettyCash.dailyInitialBalances && pettyCash.dailyInitialBalances[today]) ?? pettyCash.initialBalance;

    const cashRevenue = todayTxs.filter(tx => tx.paymentMethod === 'CASH').reduce((sum, tx) => sum + tx.total, 0);
    const transferRevenue = todayTxs.filter(tx => tx.paymentMethod === 'TRANSFER').reduce((sum, tx) => sum + tx.total, 0);
    
    const todayExpensesTotal = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      date: today,
      totalRevenue: cashRevenue + transferRevenue,
      cashRevenue,
      transferRevenue,
      totalTransactions: todayTxs.length,
      transactions: todayTxs,
      pettyCash: {
        ...pettyCash,
        initialBalance: todayInitialBalance,
        expenses: todayExpenses,
        // For the report, current balance should reflect today's starting + today's revenue - today's expenses
        currentBalance: todayInitialBalance + cashRevenue - todayExpensesTotal
      }
    };
  }, [transactions, pettyCash]);

  // Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'cashier123') {
      setIsAuthenticated(true);
      toast.success('Login berhasil');
    } else {
      toast.error('Password salah');
    }
  };

  const updateCartQuantity = (ticketId: string, quantity: number) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === ticketId);
      if (quantity === 0) {
        return prev.filter(item => item.id !== ticketId);
      }
      if (existing) {
        return prev.map(item => item.id === ticketId ? { ...item, quantity } : item);
      }
      return [...prev, { ...ticket, quantity }];
    });
  };

  const handleCheckout = async (method: PaymentMethod) => {
    if (cart.length === 0) return;

    const newTransaction: Transaction = {
      id: `TX-${Date.now()}`,
      items: [...cart],
      subtotal: cartSubtotal,
      discount: (cart.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0)) + transactionDiscount,
      total: cartTotal,
      paymentMethod: method,
      timestamp: new Date().toISOString(),
      cashier: 'Cashier 1'
    };

    // Update Stock
    setTickets(prev => prev.map(t => {
      const cartItem = cart.find(ci => ci.id === t.id);
      if (cartItem) {
        return { ...t, stock: t.stock - cartItem.quantity };
      }
      return t;
    }));

    // Update Transactions
    setTransactions(prev => [...prev, newTransaction]);
    
    // Update Petty Cash if CASH
    if (method === 'CASH') {
      setPettyCash(prev => ({
        ...prev,
        currentBalance: prev.currentBalance + cartTotal
      }));
    }

    // Clear Cart
    setCart([]);
    setTransactionDiscount(0);
    
    toast.success('Transaksi Berhasil!', {
      description: `Total: Rp ${cartTotal.toLocaleString('id-ID')} (${method})`,
      icon: <CheckCircle2 className="text-green-500" />
    });

    try {
      await googleSheetsService.syncTransaction(newTransaction);
    } catch (err) {
      console.error('Failed to sync to GAS', err);
    }
  };

  const handleUpdateInitialPettyCash = (amount: number) => {
    const today = new Date().toISOString().split('T')[0];
    setPettyCash(prev => {
      const dailyInitialBalances = prev.dailyInitialBalances || {};
      return {
        ...prev,
        initialBalance: amount, // Still update sync as a fallback
        dailyInitialBalances: {
          ...dailyInitialBalances,
          [today]: amount
        },
        currentBalance: amount + (prev.currentBalance - prev.initialBalance)
      };
    });
    toast.info('Modal awal diperbarui untuk hari ini');
  };

  const handleAddExpense = async (note: string, amount: number) => {
    const newExpense: Expense = {
      id: `EXP-${Date.now()}`,
      note,
      amount,
      timestamp: new Date().toISOString()
    };

    setPettyCash(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense],
      currentBalance: prev.currentBalance - amount
    }));

    toast.warning('Pengeluaran dicatat');
    
    try {
      await googleSheetsService.syncExpense(newExpense);
    } catch (err) {
      console.error('Failed to sync expense to GAS', err);
    }
  };

  const handleUpdateTicket = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    
    // If ticket is deactivated, remove from cart
    if (!updatedTicket.isActive) {
      setCart(prev => prev.filter(item => item.id !== updatedTicket.id));
    }
  };

  const handleAddTicket = (newTicket: Ticket) => {
    setTickets(prev => [...prev, newTicket]);
  };

  const handleDeleteTicket = (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    setCart(prev => prev.filter(item => item.id !== id));
    toast.error('Tiket dihapus');
  };

  const handleAdjustStock = (adjustment: StockAdjustment) => {
    setTickets(prev => prev.map(t => {
      if (t.id === adjustment.ticketId) {
        const newStock = adjustment.type === 'ADD' ? t.stock + adjustment.amount : t.stock - adjustment.amount;
        return {
          ...t,
          stock: Math.max(0, newStock),
          adjustments: [...(t.adjustments || []), adjustment]
        };
      }
      return t;
    }));
  };

  const handleResetData = () => {
    localStorage.clear();
    setTickets(INITIAL_TICKETS);
    setTransactions([]);
    setPettyCash({ initialBalance: 1000000, dailyInitialBalances: {}, expenses: [], currentBalance: 1000000 });
    setCart([]);
    setTransactionDiscount(0);
    toast.error('SEMUA DATA TELAH DIRESET');
  };

  const tabOrder = ['kasir', 'kas-kecil', 'laporan', 'settings'];
  
  const handleSwipe = (direction: number) => {
    // Disabling auto-swipe on tab level because it conflicts with table swiping
    // Users can still use bottom navigation or top tabs
    /*
    const currentIndex = tabOrder.indexOf(activeTab);
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < tabOrder.length) {
      setActiveTab(tabOrder[nextIndex]);
    }
    */
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 font-sans selection:bg-red-500 selection:text-white">
        <Card className="w-full max-w-md border-zinc-200 bg-white shadow-xl text-zinc-900">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <TicketIcon className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tighter uppercase">KARNOVERSE CASHIER</CardTitle>
            <p className="text-sm text-zinc-500">Masukkan password untuk mengakses sistem</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-red-600 font-bold uppercase tracking-widest hover:bg-red-700 text-white">
                Masuk Sistem
              </Button>
            </form>
          </CardContent>
        </Card>
        <Toaster theme="light" position="top-center" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-red-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-red-600">
              <TicketIcon className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tighter uppercase">KARNOVERSE <span className="text-red-600">CASHIER</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 sm:flex">
              <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-600">
                <User className="mr-1 h-3 w-3" /> Cashier 1
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsAuthenticated(false)}
              className="text-zinc-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 pb-24 sm:pb-6 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="hidden sm:flex bg-zinc-100 border border-zinc-200 p-1">
              <TabsTrigger value="kasir" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                <ShoppingCart className="mr-2 h-4 w-4" /> Kasir
              </TabsTrigger>
              <TabsTrigger value="kas-kecil" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                <Wallet className="mr-2 h-4 w-4" /> Kas Kecil
              </TabsTrigger>
              <TabsTrigger value="laporan" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                <BarChart3 className="mr-2 h-4 w-4" /> Laporan
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                <SettingsIcon className="mr-2 h-4 w-4" /> Pengaturan
              </TabsTrigger>
            </TabsList>
            
            <div className="hidden sm:block text-xs text-zinc-500 font-mono">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 100) handleSwipe(-1);
                  else if (info.offset.x < -100) handleSwipe(1);
                }}
                className="touch-pan-y"
              >
                <TabsContent value="kasir" className="mt-0 focus-visible:outline-none">
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Ticket Grid */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-zinc-900">Pilih Tiket</h2>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {tickets.filter(t => t.isActive).map(ticket => (
                          <TicketItem 
                            key={ticket.id} 
                            ticket={ticket} 
                            quantity={cart.find(item => item.id === ticket.id)?.quantity || 0}
                            onQuantityChange={updateCartQuantity}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Cart / Checkout */}
                    <div className="space-y-4 lg:pt-[44px]">
                      <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-xs text-red-800 leading-relaxed shadow-sm">
                        <div className="flex items-center gap-2 mb-1 font-bold text-red-700">
                          <AlertCircle className="h-3 w-3" /> Pengingat
                        </div>
                        Pastikan stok tiket fisik sesuai dengan sistem sebelum melakukan checkout.
                      </div>

                      <Card className="lg:sticky lg:top-24 border-zinc-200 bg-white text-zinc-900 shadow-lg">
                        <CardHeader className="pb-4 border-b border-zinc-100">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <ShoppingCart className="h-5 w-5 text-red-600" />
                            Keranjang Belanja
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                          <div className="min-h-[100px] space-y-3">
                            {cart.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-zinc-300">
                                <ShoppingCart className="mb-2 h-8 w-8 opacity-20" />
                                <p className="text-sm">Keranjang kosong</p>
                              </div>
                            ) : (
                              cart.map(item => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-zinc-900">{item.name}</span>
                                    <span className="text-xs text-zinc-500">{item.quantity} x Rp {item.price.toLocaleString('id-ID')}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-zinc-900">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                                    <button 
                                      onClick={() => updateCartQuantity(item.id, 0)}
                                      className="text-zinc-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          <Separator className="bg-zinc-100" />

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-zinc-500 text-sm">
                              <span>Subtotal</span>
                              <span>Rp {cartSubtotal.toLocaleString('id-ID')}</span>
                            </div>
                            
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm text-zinc-500">Diskon Transaksi</span>
                              <div className="relative flex-1 max-w-[120px]">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">Rp</span>
                                <input 
                                  type="number" 
                                  value={transactionDiscount || ''} 
                                  onChange={(e) => setTransactionDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full rounded border border-zinc-200 bg-zinc-50 py-1 pl-7 pr-2 text-right text-sm focus:border-red-500 focus:outline-none"
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xl font-black text-zinc-900 pt-2 border-t border-zinc-50">
                              <span>TOTAL</span>
                              <span className="text-red-600">Rp {cartTotal.toLocaleString('id-ID')}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-4">
                            <Button 
                              onClick={() => handleCheckout('CASH')}
                              disabled={cart.length === 0}
                              className="bg-green-600 hover:bg-green-700 font-bold uppercase text-white"
                            >
                              CASH
                            </Button>
                            <Button 
                              onClick={() => handleCheckout('TRANSFER')}
                              disabled={cart.length === 0}
                              className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-white"
                            >
                              TRANSFER
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="kas-kecil" className="mt-0 focus-visible:outline-none">
                  <PettyCash 
                    data={dailyReport.pettyCash} 
                    allTransactions={transactions}
                    onUpdateInitial={handleUpdateInitialPettyCash}
                    onAddExpense={handleAddExpense}
                  />
                </TabsContent>

                <TabsContent value="laporan" className="mt-0 focus-visible:outline-none">
                  <Reports 
                    report={dailyReport} 
                    allTransactions={transactions} 
                    allExpenses={pettyCash.expenses}
                    tickets={tickets} 
                  />
                </TabsContent>

                <TabsContent value="settings" className="mt-0 focus-visible:outline-none">
                  <TicketSettings 
                    tickets={tickets}
                    onUpdateTicket={handleUpdateTicket}
                    onAddTicket={handleAddTicket}
                    onDeleteTicket={handleDeleteTicket}
                    onAdjustStock={handleAdjustStock}
                    onResetData={handleResetData}
                  />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
      </main>

      <Toaster theme="light" position="top-center" closeButton richColors />

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-md sm:hidden">
        <div className="grid grid-cols-4 items-center h-16">
          <button 
            onClick={() => setActiveTab('kasir')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'kasir' ? 'text-red-600' : 'text-zinc-400'}`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase">Kasir</span>
          </button>
          <button 
            onClick={() => setActiveTab('kas-kecil')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'kas-kecil' ? 'text-red-600' : 'text-zinc-400'}`}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase">Kas Kecil</span>
          </button>
          <button 
            onClick={() => setActiveTab('laporan')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'laporan' ? 'text-red-600' : 'text-zinc-400'}`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase">Laporan</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-red-600' : 'text-zinc-400'}`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase">Set</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
