import React, { useState } from 'react';
import { Wallet, PlusCircle, History, ArrowDownCircle, ArrowUpCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PettyCash as PettyCashType, Expense, Transaction } from '@/types';

interface PettyCashProps {
  data: PettyCashType;
  allTransactions: Transaction[];
  onUpdateInitial: (amount: number) => void;
  onAddExpense: (note: string, amount: number) => void;
}

export function PettyCash({ data, allTransactions, onUpdateInitial, onAddExpense }: PettyCashProps) {
  const [initialInput, setInitialInput] = useState(data.initialBalance.toString());
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const currentStats = React.useMemo(() => {
    const expenses = data.expenses.filter(exp => exp.timestamp.startsWith(selectedDate));
    const txs = allTransactions.filter(tx => tx.timestamp.startsWith(selectedDate));
    
    const initialBalance = (data.dailyInitialBalances && data.dailyInitialBalances[selectedDate]) ?? data.initialBalance;
    const cashRevenue = txs.filter(tx => tx.paymentMethod === 'CASH').reduce((sum, tx) => sum + tx.total, 0);
    const expensesTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    return {
      initialBalance,
      currentBalance: initialBalance + cashRevenue - expensesTotal,
      expenses
    };
  }, [selectedDate, data, allTransactions]);

  const handleSetInitial = () => {
    const amount = parseFloat(initialInput);
    if (!isNaN(amount)) {
      onUpdateInitial(amount);
    }
  };

  const handleAddExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (expenseNote && !isNaN(amount)) {
      onAddExpense(expenseNote, amount);
      setExpenseNote('');
      setExpenseAmount('');
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-red-600" />
              Status Kas Kecil (Petty Cash)
            </CardTitle>
            <CardDescription className="text-zinc-500">Kelola modal awal dan saldo saat ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-zinc-50 p-4 border border-zinc-100">
                <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Modal Awal</div>
                <div className="text-xl font-black text-zinc-900">Rp {currentStats.initialBalance.toLocaleString('id-ID')}</div>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 border border-zinc-100">
                <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Saldo Akhir Hari</div>
                <div className={`text-xl font-black ${currentStats.currentBalance < currentStats.initialBalance ? 'text-red-600' : 'text-green-600'}`}>
                  Rp {currentStats.currentBalance.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-800">
              <strong>Catatan Akhir Shift:</strong> Modal awal (Rp {currentStats.initialBalance.toLocaleString('id-ID')}) harus dikembalikan ke brankas utama. Sisa saldo setelah pengembalian modal adalah pendapatan bersih tunai.
            </div>

            {isToday && (
              <div className="space-y-2">
                <Label htmlFor="initial-cash" className="text-zinc-700">Update Modal Awal (Shift Hari Ini)</Label>
                <div className="flex gap-2">
                  <Input
                    id="initial-cash"
                    type="number"
                    value={initialInput}
                    onChange={(e) => setInitialInput(e.target.value)}
                    className="bg-white border-zinc-300 text-zinc-900 focus-visible:ring-red-500"
                  />
                  <Button onClick={handleSetInitial} className="bg-red-600 hover:bg-red-700">Set</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isToday ? (
          <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-red-600" />
                Catat Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expense-note" className="text-zinc-700">Keterangan</Label>
                <Input
                  id="expense-note"
                  placeholder="Contoh: Beli air minum"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-900 focus-visible:ring-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-amount" className="text-zinc-700">Jumlah (Rp)</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  placeholder="0"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-900 focus-visible:ring-red-500"
                />
              </div>
              <Button 
                onClick={handleAddExpense} 
                className="w-full bg-red-600 hover:bg-red-700 font-bold"
                disabled={!expenseNote || !expenseAmount}
              >
                Simpan Pengeluaran
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-zinc-200 bg-zinc-50/50 text-zinc-500 shadow-sm border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Calendar className="h-10 w-10 mb-4 opacity-20" />
              <p className="text-sm font-medium">Mode Riwayat Aktif</p>
              <p className="text-xs opacity-70 mt-1">Pencatatan hanya diperbolehkan pada tanggal hari ini ({new Date().toLocaleDateString('id-ID')})</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm">
        <CardHeader className="flex flex-col space-y-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-zinc-500" />
              Riwayat Kas
            </CardTitle>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase sm:hidden">
              <span>Geser</span>
              <ArrowDownCircle className="h-3 w-3 rotate-[-90deg]" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 text-xs bg-transparent border-none focus-visible:ring-0 p-0"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-x-auto">
            <div className="min-w-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-100 hover:bg-transparent bg-zinc-50/50">
                    <TableHead className="text-zinc-600 font-bold">Waktu</TableHead>
                    <TableHead className="text-zinc-600 font-bold">Keterangan</TableHead>
                    <TableHead className="text-right text-zinc-600 font-bold">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    if (currentStats.expenses.length === 0) {
                      return (
                        <TableRow className="border-zinc-100 hover:bg-transparent">
                          <TableCell colSpan={3} className="text-center text-zinc-400 py-8 italic">
                            Tidak ada pengeluaran pada tanggal ini
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    return [...currentStats.expenses].reverse().map((expense) => (
                      <TableRow key={expense.id} className="border-zinc-100 hover:bg-zinc-50/30">
                        <TableCell className="text-xs text-zinc-500">
                          {new Date(expense.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="font-medium text-zinc-900">{expense.note}</TableCell>
                        <TableCell className="text-right text-red-600 font-mono font-bold">
                          -Rp {expense.amount.toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
