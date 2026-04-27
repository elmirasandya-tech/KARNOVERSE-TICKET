import React, { useState } from 'react';
import { Settings, Plus, Save, AlertTriangle, History, ArrowUp, ArrowDown, Trash2, Power, PowerOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Ticket, StockAdjustment } from '@/types';
import { toast } from 'sonner';

interface TicketSettingsProps {
  tickets: Ticket[];
  onUpdateTicket: (ticket: Ticket) => void;
  onAddTicket: (ticket: Ticket) => void;
  onDeleteTicket: (id: string) => void;
  onAdjustStock: (adjustment: StockAdjustment) => void;
  onResetData: () => void;
}

export function TicketSettings({ tickets, onUpdateTicket, onAddTicket, onDeleteTicket, onAdjustStock, onResetData }: TicketSettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newCategory, setNewCategory] = useState('Main');

  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'FORCE_MAJEURE'>('ADD');

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetPassword, setResetPassword] = useState('');

  const startEditing = (ticket: Ticket) => {
    setEditingId(ticket.id);
    setEditName(ticket.name);
    setEditPrice(ticket.price.toString());
    setEditDiscount((ticket.discount || 0).toString());
  };

  const saveEdit = () => {
    if (!editingId) return;
    const price = parseInt(editPrice);
    const discount = parseInt(editDiscount) || 0;
    if (isNaN(price)) return;

    const ticket = tickets.find(t => t.id === editingId);
    if (ticket) {
      onUpdateTicket({ ...ticket, name: editName, price, discount });
      setEditingId(null);
      toast.success('Tiket diperbarui');
    }
  };

  const handleAddTicket = () => {
    const price = parseInt(newPrice);
    const discount = parseInt(newDiscount) || 0;
    const stock = parseInt(newStock) || 0;
    if (!newName || isNaN(price)) {
      toast.error('Nama dan Harga harus diisi');
      return;
    }

    const ticketId = `t-${Date.now()}`;
    const initialAdjustment: StockAdjustment = {
      id: `ADJ-INIT-${Date.now()}`,
      ticketId: ticketId,
      type: 'ADD',
      amount: stock,
      note: 'Stok Awal (Tambah Tiket Baru)',
      timestamp: new Date().toISOString()
    };

    const newTicket: Ticket = {
      id: ticketId,
      name: newName,
      price,
      discount,
      stock,
      category: newCategory,
      isActive: true,
      adjustments: stock > 0 ? [initialAdjustment] : []
    };

    onAddTicket(newTicket);
    setIsAdding(false);
    setNewName('');
    setNewPrice('');
    setNewDiscount('');
    setNewStock('');
    toast.success('Tiket baru ditambahkan');
  };

  const toggleStatus = (ticket: Ticket) => {
    onUpdateTicket({ ...ticket, isActive: !ticket.isActive });
    toast.info(`Tiket ${ticket.name} ${!ticket.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
  };

  const handleAdjustStock = () => {
    if (!adjustId) return;
    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount <= 0) return;

    const adjustment: StockAdjustment = {
      id: `ADJ-${Date.now()}`,
      ticketId: adjustId,
      type: adjustType,
      amount,
      note: adjustNote || (adjustType === 'FORCE_MAJEURE' ? 'Force Majeure' : 'Penambahan Stok'),
      timestamp: new Date().toISOString()
    };

    onAdjustStock(adjustment);
    setAdjustId(null);
    setAdjustAmount('');
    setAdjustNote('');
    toast.success('Stok disesuaikan');
  };

  const handleResetWithPassword = () => {
    if (resetPassword === 'admin123') {
      onResetData();
      setShowResetDialog(false);
      setResetPassword('');
    } else {
      toast.error('Password Master salah!');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">PENGATURAN SISTEM</h2>
          <p className="text-sm text-zinc-500">Kelola inventaris tiket dan konfigurasi acara</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
          {isAdding ? 'Tutup Form' : <><Plus className="mr-2 h-4 w-4" /> Tambah Tiket Baru</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-red-100 bg-white shadow-lg overflow-hidden">
          <div className="h-1 bg-red-600 w-full" />
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-red-600" />
              Konfigurasi Tiket Baru
            </CardTitle>
            <CardDescription>Masukkan detail produk atau tiket yang akan dijual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold">Nama Tiket / Produk</Label>
                <Input 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  placeholder="Contoh: Tiket VIP Day 1" 
                  className="border-zinc-300 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold">Harga Jual (Rp)</Label>
                <Input 
                  type="number" 
                  value={newPrice} 
                  onChange={(e) => setNewPrice(e.target.value)} 
                  placeholder="0" 
                  className="border-zinc-300 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold">Potongan Harga / Diskon (Rp)</Label>
                <Input 
                  type="number" 
                  value={newDiscount} 
                  onChange={(e) => setNewDiscount(e.target.value)} 
                  placeholder="0" 
                  className="border-zinc-300 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold">Stok Awal Tersedia</Label>
                <Input 
                  type="number" 
                  value={newStock} 
                  onChange={(e) => setNewStock(e.target.value)} 
                  placeholder="0" 
                  className="border-zinc-300 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold">Kategori</Label>
                <Input 
                  value={newCategory} 
                  onChange={(e) => setNewCategory(e.target.value)} 
                  placeholder="Contoh: Main Event, Merchandise" 
                  className="border-zinc-300 focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
              <Button variant="ghost" onClick={() => setIsAdding(false)} className="text-zinc-500">Batal</Button>
              <Button onClick={handleAddTicket} className="bg-red-600 hover:bg-red-700 px-8 font-bold">
                Simpan & Aktifkan Tiket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-red-600" />
            Daftar Tiket & Produk
          </CardTitle>
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase sm:hidden">
            <span>Geser</span>
            <ArrowUp className="h-3 w-3 rotate-90" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-100 bg-zinc-50/50">
                    <TableHead className="font-bold text-zinc-900">Status</TableHead>
                    <TableHead className="font-bold text-zinc-900">Nama Tiket</TableHead>
                    <TableHead className="font-bold text-zinc-900">Harga (Rp)</TableHead>
                    <TableHead className="font-bold text-zinc-900">Diskon (Rp)</TableHead>
                    <TableHead className="font-bold text-zinc-900">Stok</TableHead>
                    <TableHead className="text-right font-bold text-zinc-900">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className={`border-zinc-100 hover:bg-zinc-50/50 ${!ticket.isActive ? 'opacity-50' : ''}`}>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleStatus(ticket)}
                          className={ticket.isActive ? "text-green-600" : "text-zinc-400"}
                        >
                          {ticket.isActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {editingId === ticket.id ? (
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                        ) : (
                          <span className="font-medium">{ticket.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === ticket.id ? (
                          <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="h-8" />
                        ) : (
                          <span>Rp {ticket.price.toLocaleString('id-ID')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === ticket.id ? (
                          <Input type="number" value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} className="h-8" />
                        ) : (
                          <span className="text-red-600 font-medium">Rp {(ticket.discount || 0).toLocaleString('id-ID')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ticket.stock < 10 ? "destructive" : "secondary"} className="font-mono">
                          {ticket.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {editingId === ticket.id ? (
                            <Button size="sm" onClick={saveEdit} className="bg-red-600 hover:bg-red-700">
                              <Save className="mr-1 h-3 w-3" /> Simpan
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => startEditing(ticket)}>
                              Edit
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setAdjustId(ticket.id)}>
                            Stok
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-zinc-400 hover:text-red-600"
                            onClick={() => onDeleteTicket(ticket.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {adjustId && (
        <Card className="border-red-200 bg-red-50/30 text-zinc-900 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Penyesuaian Stok: {tickets.find(t => t.id === adjustId)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="font-bold text-zinc-700">Jenis Penyesuaian</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant={adjustType === 'ADD' ? 'default' : 'outline'} 
                    className={`h-[120px] py-4 flex flex-col items-center justify-center gap-2 transition-all ${
                      adjustType === 'ADD' 
                        ? 'bg-green-600 hover:bg-green-700 border-green-600 shadow-md scale-[1.02]' 
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                    onClick={() => setAdjustType('ADD')}
                  >
                    <div className={`p-2 rounded-full ${adjustType === 'ADD' ? 'bg-white/20' : 'bg-zinc-100'}`}>
                      <ArrowUp className={`h-5 w-5 ${adjustType === 'ADD' ? 'text-white' : 'text-zinc-500'}`} />
                    </div>
                    <span className="font-bold text-[10px] uppercase tracking-wider">Tambah Stok</span>
                  </Button>
                  <Button 
                    variant={adjustType === 'FORCE_MAJEURE' ? 'destructive' : 'outline'} 
                    className={`h-[120px] py-4 flex flex-col items-center justify-center gap-2 transition-all ${
                      adjustType === 'FORCE_MAJEURE' 
                        ? 'bg-red-600 hover:bg-red-700 border-red-600 shadow-md scale-[1.02]' 
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                    onClick={() => setAdjustType('FORCE_MAJEURE')}
                  >
                    <div className={`p-2 rounded-full ${adjustType === 'FORCE_MAJEURE' ? 'bg-white/20' : 'bg-zinc-100'}`}>
                      <ArrowDown className={`h-5 w-5 ${adjustType === 'FORCE_MAJEURE' ? 'text-white' : 'text-zinc-500'}`} />
                    </div>
                    <span className="font-bold text-[10px] uppercase tracking-wider">Rusak (Majeure)</span>
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="font-bold text-zinc-700">Jumlah & Catatan</Label>
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={adjustAmount} 
                      onChange={(e) => setAdjustAmount(e.target.value)} 
                      className="border-zinc-300 h-[54px] text-xl font-black text-center focus:border-red-500 focus:ring-red-500 pl-12"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Qty</div>
                  </div>
                  <div className="relative">
                    <Input 
                      placeholder="Catatan (Opsional)" 
                      value={adjustNote} 
                      onChange={(e) => setAdjustNote(e.target.value)} 
                      className="border-zinc-300 h-[54px] text-sm focus:border-red-500 focus:ring-red-500 pl-12"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Note</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdjustId(null)}>Batal</Button>
              <Button onClick={handleAdjustStock} className="bg-red-600 hover:bg-red-700">Terapkan Perubahan</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-200 bg-white text-zinc-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-zinc-500" />
            Riwayat Penyesuaian Stok
          </CardTitle>
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase sm:hidden">
            <span>Geser</span>
            <ArrowUp className="h-3 w-3 rotate-90" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-100 bg-zinc-50/50">
                    <TableHead className="text-zinc-600">Waktu</TableHead>
                    <TableHead className="text-zinc-600">Tiket</TableHead>
                    <TableHead className="text-zinc-600">Tipe</TableHead>
                    <TableHead className="text-zinc-600">Jumlah</TableHead>
                    <TableHead className="text-zinc-600">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.flatMap(t => t.adjustments || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10).map((adj) => (
                    <TableRow key={adj.id} className="border-zinc-100">
                      <TableCell className="text-xs text-zinc-500">
                        {new Date(adj.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {tickets.find(t => t.id === adj.ticketId)?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={adj.type === 'ADD' ? 'secondary' : 'destructive'} className="text-[10px]">
                          {adj.type === 'ADD' ? 'TAMBAH' : 'RUSAK'}
                        </Badge>
                      </TableCell>
                      <TableCell className={adj.type === 'ADD' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {adj.type === 'ADD' ? '+' : '-'}{adj.amount}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-600 italic">
                        {adj.note}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-8">
        <Button 
          variant="outline" 
          onClick={() => setShowResetDialog(true)}
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold uppercase tracking-widest"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Reset Semua Data Acara
        </Button>
      </div>

      {showResetDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-red-200 shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-red-900">Konfirmasi Reset Data</CardTitle>
              <CardDescription>
                Tindakan ini akan menghapus seluruh riwayat transaksi, kas kecil, dan laporan. Data tidak dapat dikembalikan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold">Masukkan Password Master</Label>
                <Input 
                  type="password" 
                  value={resetPassword} 
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="••••••••"
                  className="text-center text-lg tracking-widest border-zinc-300 focus:border-red-500 focus:ring-red-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleResetWithPassword()}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleResetWithPassword} className="bg-red-600 hover:bg-red-700 font-bold py-6">
                  KONFIRMASI RESET TOTAL
                </Button>
                <Button variant="ghost" onClick={() => { setShowResetDialog(false); setResetPassword(''); }} className="text-zinc-500">
                  Batal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
