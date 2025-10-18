'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Medication = Database['public']['Tables']['medications']['Row'];
type MedicationStock = Database['public']['Tables']['medication_stock']['Row'] & {
  medications: { medication_name: string } | null;
};

export default function PharmacyPage() {
  const { profile } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [stockBatches, setStockBatches] = useState<MedicationStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [medicationFormData, setMedicationFormData] = useState({
    medication_name: '',
    generic_name: '',
    brand_name: '',
    category: '',
    unit: 'Tablet' as 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Cream' | 'Drop' | 'Inhaler',
    description: '',
    reorder_level: 10,
  });
  const [stockFormData, setStockFormData] = useState({
    medication_id: '',
    batch_number: '',
    quantity: '',
    unit_price: '',
    selling_price: '',
    expiry_date: '',
    supplier: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [medicationsResult, stockResult] = await Promise.all([
        supabase.from('medications').select('*').order('medication_name'),
        supabase
          .from('medication_stock')
          .select(`
            *,
            medications(medication_name)
          `)
          .order('expiry_date'),
      ]);

      if (medicationsResult.error) throw medicationsResult.error;
      if (stockResult.error) throw stockResult.error;

      setMedications(medicationsResult.data || []);
      setStockBatches(stockResult.data || []);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleMedicationSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('medications').insert(medicationFormData);

      if (error) throw error;

      toast.success('Medication added successfully');
      setMedicationDialogOpen(false);
      setMedicationFormData({
        medication_name: '',
        generic_name: '',
        brand_name: '',
        category: '',
        unit: 'Tablet',
        description: '',
        reorder_level: 10,
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add medication');
    }
  }

  async function handleStockSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!profile?.id) throw new Error('User not authenticated');

      const { error } = await supabase.from('medication_stock').insert({
        medication_id: stockFormData.medication_id,
        batch_number: stockFormData.batch_number,
        quantity: parseInt(stockFormData.quantity),
        unit_price: parseFloat(stockFormData.unit_price),
        selling_price: parseFloat(stockFormData.selling_price),
        expiry_date: stockFormData.expiry_date,
        supplier: stockFormData.supplier,
        received_by: profile.id,
      });

      if (error) throw error;

      await supabase.from('stock_transactions').insert({
        medication_id: stockFormData.medication_id,
        transaction_type: 'Purchase',
        quantity: parseInt(stockFormData.quantity),
        notes: `Batch: ${stockFormData.batch_number}`,
        performed_by: profile.id,
      });

      toast.success('Stock added successfully');
      setStockDialogOpen(false);
      setStockFormData({
        medication_id: '',
        batch_number: '',
        quantity: '',
        unit_price: '',
        selling_price: '',
        expiry_date: '',
        supplier: '',
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add stock');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const lowStockMedications = medications.filter((med) => {
    const totalStock = stockBatches
      .filter((stock) => stock.medication_id === med.id)
      .reduce((sum, stock) => sum + stock.quantity, 0);
    return totalStock < med.reorder_level;
  });

  const expiringStock = stockBatches.filter((stock) => {
    const daysToExpiry = Math.ceil(
      (new Date(stock.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysToExpiry <= 90 && daysToExpiry > 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pharmacy & Inventory</h1>
          <p className="text-slate-600 mt-1">Manage medications and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={medicationDialogOpen} onOpenChange={setMedicationDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Medication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Medication</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleMedicationSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medication_name">Medication Name *</Label>
                    <Input
                      id="medication_name"
                      value={medicationFormData.medication_name}
                      onChange={(e) =>
                        setMedicationFormData({ ...medicationFormData, medication_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="generic_name">Generic Name</Label>
                    <Input
                      id="generic_name"
                      value={medicationFormData.generic_name}
                      onChange={(e) =>
                        setMedicationFormData({ ...medicationFormData, generic_name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand_name">Brand Name</Label>
                    <Input
                      id="brand_name"
                      value={medicationFormData.brand_name}
                      onChange={(e) => setMedicationFormData({ ...medicationFormData, brand_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={medicationFormData.category}
                      onChange={(e) => setMedicationFormData({ ...medicationFormData, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <Select
                      value={medicationFormData.unit}
                      onValueChange={(value: any) => setMedicationFormData({ ...medicationFormData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tablet">Tablet</SelectItem>
                        <SelectItem value="Capsule">Capsule</SelectItem>
                        <SelectItem value="Syrup">Syrup</SelectItem>
                        <SelectItem value="Injection">Injection</SelectItem>
                        <SelectItem value="Cream">Cream</SelectItem>
                        <SelectItem value="Drop">Drop</SelectItem>
                        <SelectItem value="Inhaler">Inhaler</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder_level">Reorder Level</Label>
                    <Input
                      id="reorder_level"
                      type="number"
                      value={medicationFormData.reorder_level}
                      onChange={(e) =>
                        setMedicationFormData({ ...medicationFormData, reorder_level: parseInt(e.target.value) || 10 })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={medicationFormData.description}
                    onChange={(e) => setMedicationFormData({ ...medicationFormData, description: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Add Medication
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Stock Batch</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleStockSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="medication_id">Medication *</Label>
                  <Select
                    value={stockFormData.medication_id}
                    onValueChange={(value) => setStockFormData({ ...stockFormData, medication_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select medication" />
                    </SelectTrigger>
                    <SelectContent>
                      {medications.map((med) => (
                        <SelectItem key={med.id} value={med.id}>
                          {med.medication_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="batch_number">Batch Number *</Label>
                    <Input
                      id="batch_number"
                      value={stockFormData.batch_number}
                      onChange={(e) => setStockFormData({ ...stockFormData, batch_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={stockFormData.quantity}
                      onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Unit Price *</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={stockFormData.unit_price}
                      onChange={(e) => setStockFormData({ ...stockFormData, unit_price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selling_price">Selling Price *</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={stockFormData.selling_price}
                      onChange={(e) => setStockFormData({ ...stockFormData, selling_price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry_date">Expiry Date *</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={stockFormData.expiry_date}
                      onChange={(e) => setStockFormData({ ...stockFormData, expiry_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={stockFormData.supplier}
                      onChange={(e) => setStockFormData({ ...stockFormData, supplier: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Add Stock
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {(lowStockMedications.length > 0 || expiringStock.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {lowStockMedications.length > 0 && (
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {lowStockMedications.slice(0, 5).map((med) => (
                    <li key={med.id} className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                      {med.medication_name}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {expiringStock.length > 0 && (
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                  Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {expiringStock.slice(0, 5).map((stock) => (
                    <li key={stock.id} className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                      {stock.medications?.medication_name} - Batch {stock.batch_number}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="medications">
        <TabsList>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="stock">Stock Batches</TabsTrigger>
        </TabsList>

        <TabsContent value="medications">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medication Name</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Total Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                        No medications found
                      </TableCell>
                    </TableRow>
                  ) : (
                    medications.map((med) => {
                      const totalStock = stockBatches
                        .filter((stock) => stock.medication_id === med.id)
                        .reduce((sum, stock) => sum + stock.quantity, 0);
                      const isLowStock = totalStock < med.reorder_level;

                      return (
                        <TableRow key={med.id}>
                          <TableCell className="font-medium">{med.medication_name}</TableCell>
                          <TableCell>{med.generic_name || '-'}</TableCell>
                          <TableCell>{med.unit}</TableCell>
                          <TableCell>{totalStock}</TableCell>
                          <TableCell>{med.reorder_level}</TableCell>
                          <TableCell>
                            {isLowStock ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : (
                              <Badge variant="secondary">In Stock</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medication</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Supplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                        No stock batches found
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockBatches.map((stock) => {
                      const daysToExpiry = Math.ceil(
                        (new Date(stock.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      const isExpiringSoon = daysToExpiry <= 90 && daysToExpiry > 0;

                      return (
                        <TableRow key={stock.id} className={isExpiringSoon ? 'bg-amber-50' : ''}>
                          <TableCell className="font-medium">{stock.medications?.medication_name}</TableCell>
                          <TableCell>{stock.batch_number}</TableCell>
                          <TableCell>{stock.quantity}</TableCell>
                          <TableCell>
                            {format(new Date(stock.expiry_date), 'MMM dd, yyyy')}
                            {isExpiringSoon && (
                              <Badge variant="outline" className="ml-2 text-amber-700 border-amber-300">
                                Expiring Soon
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{stock.supplier || '-'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
