import React, { useMemo, useState } from 'react';
import { BarChart3, Receipt, Calendar, CreditCard, Banknote, Download, FileText, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DailyReport, Transaction, Ticket, Expense } from '@/types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  report: DailyReport;
  allTransactions: Transaction[];
  allExpenses: Expense[];
  tickets: Ticket[];
}

export function Reports({ report, allTransactions, allExpenses, tickets }: ReportsProps) {
  const [reportType, setReportType] = useState<'DAILY' | 'CUMULATIVE'>('DAILY');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const currentTransactions = useMemo(() => {
    if (reportType === 'CUMULATIVE') return allTransactions;
    return allTransactions.filter(tx => tx.timestamp.startsWith(selectedDate));
  }, [reportType, selectedDate, allTransactions]);

  const currentExpenses = useMemo(() => {
    if (reportType === 'CUMULATIVE') return allExpenses;
    return allExpenses.filter(exp => exp.timestamp.startsWith(selectedDate));
  }, [reportType, selectedDate, allExpenses]);

  const currentInitialBalance = useMemo(() => {
    if (reportType === 'CUMULATIVE') return report.pettyCash.initialBalance; // Default/Fallback for cumulative
    return (report.pettyCash.dailyInitialBalances && report.pettyCash.dailyInitialBalances[selectedDate]) ?? report.pettyCash.initialBalance;
  }, [reportType, selectedDate, report.pettyCash]);

  const stats = useMemo(() => {
    const txs = currentTransactions;
    const cashRevenue = txs.filter(tx => tx.paymentMethod === 'CASH').reduce((sum, tx) => sum + tx.total, 0);
    const transferRevenue = txs.filter(tx => tx.paymentMethod === 'TRANSFER').reduce((sum, tx) => sum + tx.total, 0);
    const totalRevenue = cashRevenue + transferRevenue;
    const totalDiscount = txs.reduce((sum, tx) => sum + (tx.discount || 0), 0);
    
    const expensesTotal = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netCash = cashRevenue - expensesTotal;

    return { 
      totalRevenue, 
      cashRevenue, 
      transferRevenue, 
      totalDiscount, 
      totalTransactions: txs.length, 
      netCash, 
      expenses: expensesTotal,
      initialBalance: currentInitialBalance
    };
  }, [currentTransactions, currentExpenses, currentInitialBalance]);

  const soldPerType = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Initialize all tickets with 0
    tickets.forEach(ticket => {
      counts[ticket.name] = 0;
    });

    currentTransactions.forEach(tx => {
      tx.items.forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [currentTransactions, tickets]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = reportType === 'DAILY' 
      ? new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'Seluruh Periode Acara';

    // Header with Red Rectangle Background
    doc.setFillColor(220, 38, 38); // Red
    doc.rect(14, 10, 182, 25, 'F');

    doc.setTextColor(255, 255, 255); // White
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('KARNOVERSE EVENT CASHIER', 105, 20, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const subtitle = `Laporan ${reportType === 'DAILY' ? 'Harian' : 'Kumulatif'}: ${dateStr}`;
    doc.text(subtitle, 105, 28, { align: 'center' });

    // Reset for the rest of the document
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Summary Section
    doc.setFontSize(12);
    doc.text('Ringkasan Pendapatan:', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Kategori', 'Jumlah']],
      body: [
        ['Total Pendapatan', `Rp ${stats.totalRevenue.toLocaleString('id-ID')}`],
        ['Pendapatan Tunai (Cash)', `Rp ${stats.cashRevenue.toLocaleString('id-ID')}`],
        ['Pendapatan Transfer', `Rp ${stats.transferRevenue.toLocaleString('id-ID')}`],
        ['Total Diskon Diberikan', `Rp ${stats.totalDiscount.toLocaleString('id-ID')}`],
        ['---', '---'],
        ['Modal Awal Kas Kecil (Petty Cash)', `Rp ${stats.initialBalance.toLocaleString('id-ID')}`],
        ['Total Pengeluaran Kas Kecil', `Rp ${stats.expenses.toLocaleString('id-ID')}`],
        ['Saldo Akhir Tunai (Cash in Hand)', `Rp ${(stats.initialBalance + stats.cashRevenue - stats.expenses).toLocaleString('id-ID')}`],
        ['---', '---'],
        ['Uang Bersih Tunai (Earnings Only)', `Rp ${stats.netCash.toLocaleString('id-ID')}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] }
    });

    // Sold Per Type Section
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Tiket Terjual Per Jenis:', 14, finalY);
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Nama Tiket', 'Jumlah Terjual']],
      body: soldPerType.map(([name, count]) => [name, `${count} pcs`]),
      theme: 'grid',
      headStyles: { fillColor: [39, 39, 42] }
    });

    // Petty Cash Expenses Section
    const finalYExpenses = (doc as any).lastAutoTable.finalY + 10;
    if (currentExpenses.length > 0) {
      doc.text('Detail Pengeluaran Kas Kecil:', 14, finalYExpenses);
      
      autoTable(doc, {
        startY: finalYExpenses + 5,
        head: [['Waktu', 'Keterangan', 'Jumlah']],
        body: currentExpenses.map(exp => [
          new Date(exp.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
          exp.note,
          `Rp ${exp.amount.toLocaleString('id-ID')}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] }
      });
    }

    // Transaction Details Section
    const finalY2 = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Detail Transaksi:', 14, finalY2);
    
    autoTable(doc, {
      startY: finalY2 + 5,
      head: [['Waktu', 'Item', 'Metode', 'Diskon', 'Total']],
      body: currentTransactions.map(tx => [
        new Date(tx.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        tx.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
        tx.paymentMethod,
        `Rp ${(tx.discount || 0).toLocaleString('id-ID')}`,
        `Rp ${tx.total.toLocaleString('id-ID')}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] }
    });

    // Footer with Page Numbers and Timestamp
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180); // Lighter gray for lower opacity
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const time = now.toLocaleTimeString('id-ID', { hour12: false });
      const footerText = `Dicetak pada : ${dd}/${mm}/${yy},${time}  •  halaman ${i} dari ${pageCount}`;
      doc.text(footerText, 105, 287, { align: 'center' });
    }

    doc.save(`Laporan_Karnoverse_${reportType}_${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">Laporan Penjualan</h2>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={reportType === 'DAILY' ? 'default' : 'outline'}
                onClick={() => setReportType('DAILY')}
                className={reportType === 'DAILY' ? 'bg-red-600' : ''}
              >
                Harian
              </Button>
              <Button 
                size="sm" 
                variant={reportType === 'CUMULATIVE' ? 'default' : 'outline'}
                onClick={() => setReportType('CUMULATIVE')}
                className={reportType === 'CUMULATIVE' ? 'bg-zinc-900' : ''}
              >
                Kumulatif (Semua)
              </Button>
            </div>
          </div>
          
          {reportType === 'DAILY' && (
            <div className="flex items-center gap-2 bg-zinc-100 p-2 rounded-lg border border-zinc-200">
              <Calendar className="h-4 w-4 text-zinc-500" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-bold focus:outline-none text-zinc-900"
              />
            </div>
          )}
        </div>
        <Button onClick={exportToPDF} className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Export PDF {reportType === 'DAILY' ? 'Harian' : 'Kumulatif'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total Pendapatan</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-zinc-900">Rp {stats.totalRevenue.toLocaleString('id-ID')}</div>
            <p className="text-xs text-zinc-500 mt-1">{stats.totalTransactions} Transaksi {reportType === 'DAILY' ? 'pada tanggal ini' : 'total'}</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Tunai (Cash)</CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-zinc-900">Rp {stats.cashRevenue.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Transfer</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-zinc-900">Rp {stats.transferRevenue.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 text-red-600 font-bold">Total Diskon</CardTitle>
            <History className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-600">Rp {stats.totalDiscount.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
      </div>

      {reportType === 'DAILY' && (
        <Card className="border-red-200 bg-red-50 text-red-900 shadow-sm max-w-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Uang Bersih Tunai (Harian)</CardTitle>
            <Banknote className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">Rp {stats.netCash.toLocaleString('id-ID')}</div>
            <p className="text-[10px] text-red-700 mt-1 font-medium">
              (Total Cash - Pengeluaran Hari Ini)
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sold Per Type Card */}
        <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-zinc-500" />
              Tiket Terjual ({reportType === 'DAILY' ? 'Harian' : 'Kumulatif'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {soldPerType.length === 0 ? (
                <p className="text-sm text-zinc-400 italic">Belum ada tiket terjual</p>
              ) : (
                soldPerType.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between border-b border-zinc-50 pb-2">
                    <span className="text-sm font-medium text-zinc-700">{name}</span>
                    <Badge variant="secondary" className="font-mono text-sm">
                      {count} pcs
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Transactions */}
        <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-600" />
              Detail Transaksi ({reportType === 'DAILY' ? 'Hari Ini' : 'Semua'})
            </CardTitle>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase sm:hidden">
              <span>Geser</span>
              <History className="h-3 w-3 rotate-[-90deg]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-100 hover:bg-transparent bg-zinc-50/50">
                      <TableHead className="text-zinc-600 font-bold">Waktu</TableHead>
                      <TableHead className="text-zinc-600 font-bold">Item</TableHead>
                      <TableHead className="text-zinc-600 font-bold">Metode</TableHead>
                      <TableHead className="text-zinc-600 font-bold">Diskon</TableHead>
                      <TableHead className="text-right text-zinc-600 font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTransactions.length === 0 ? (
                      <TableRow className="border-zinc-100 hover:bg-transparent">
                        <TableCell colSpan={5} className="text-center text-zinc-400 py-8 italic">Belum ada transaksi</TableCell>
                      </TableRow>
                    ) : (
                      [...currentTransactions].reverse().map((tx) => (
                        <TableRow key={tx.id} className="border-zinc-100 hover:bg-zinc-50/30">
                          <TableCell className="text-xs text-zinc-500">
                            {new Date(tx.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {tx.items.map((item, idx) => (
                                <div key={idx} className="text-sm text-zinc-900">
                                  <span className="font-bold">{item.quantity}x</span> {item.name}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={tx.paymentMethod === 'CASH' ? 'border-green-500/30 text-green-600 bg-green-50' : 'border-blue-500/30 text-blue-600 bg-blue-50'}>
                              {tx.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-red-600 font-medium">
                            {tx.discount > 0 ? `Rp ${tx.discount.toLocaleString('id-ID')}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-black text-zinc-900">
                            Rp {tx.total.toLocaleString('id-ID')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
