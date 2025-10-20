'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Package, AlertTriangle, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Medication = Database['public']['Tables']['medications']['Row'];
type StockItem = {
  id: string;
  medication_id: string;
  medication_name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  last_updated: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

export default function StockManagementPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState({
    medication_id: '',
    current_stock: '',
    minimum_stock: '',
    unit: '',
  });

  useEffect(() => {
    if (!authLoading && user && profile) {
      loadData();
    }
  }, [authLoading, user, profile]);

  async function loadData() {
    try {
      const [medicationsResult, stockResult] = await Promise.all([
        supabase
          .from('medications')
          .select('*')
          .order('medication_name'),
        supabase
          .from('pharmacy_stock')
          .select(`
            *,
            medications(medication_name, unit)
          `)
          .order('medication_id'),
      ]);

      if (medicationsResult.error) throw medicationsResult.error;
      if (stockResult.error) {
        // If pharmacy_stock table doesn't exist, create sample data
        console.log('Pharmacy stock table not found, using sample data');
        setStockItems([]);
      } else {
        const stockItems = stockResult.data?.map(item => ({
          id: item.id,
          medication_id: item.medication_id,
          medication_name: item.medications?.medication_name || 'Unknown',
          current_stock: item.current_stock,
          minimum_stock: item.minimum_stock,
          unit: item.medications?.unit || 'units',
          last_updated: item.updated_at,
          status: item.current_stock <= 0 ? 'Out of Stock' : 
                  item.current_stock <= item.minimum_stock ? 'Low Stock' : 'In Stock'
        })) || [];
        setStockItems(stockItems);
      }

      setMedications(medicationsResult.data || []);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!user || !profile?.id) {
        toast.error('User not authenticated');
        return;
      }

      const stockData = {
        medication_id: formData.medication_id,
        current_stock: parseInt(formData.current_stock),
        minimum_stock: parseInt(formData.minimum_stock),
        updated_by: profile.id,
      };

      if (editingItem) {
        // Update existing stock item
        const { error } = await supabase
          .from('pharmacy_stock')
          .update(stockData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Stock updated successfully');
      } else {
        // Create new stock item
        const { error } = await supabase
          .from('pharmacy_stock')
          .insert(stockData);

        if (error) throw error;
        toast.success('Stock item added successfully');
      }

      setDialogOpen(false);
      setEditingItem(null);
      setFormData({
        medication_id: '',
        current_stock: '',
        minimum_stock: '',
        unit: '',
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save stock item');
    }
  }

  async function deleteStockItem(itemId: string) {
    try {
      const { error } = await supabase
        .from('pharmacy_stock')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Stock item deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error('Failed to delete stock item');
    }
  }

  function openEditDialog(item: StockItem) {
    setEditingItem(item);
    setFormData({
      medication_id: item.medication_id,
      current_stock: item.current_stock.toString(),
      minimum_stock: item.minimum_stock.toString(),
      unit: item.unit,
    });
    setDialogOpen(true);
  }

  const filteredStockItems = stockItems.filter((item) => {
    const matchesSearch = 
      item.medication_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Stock':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Low Stock':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'Out of Stock':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'bg-green-100 text-green-800';
      case 'Low Stock':
        return 'bg-orange-100 text-orange-800';
      case 'Out of Stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  // Check if user has permission to manage stock (Pharmacist or Admin)
  if (profile.role !== 'Pharmacist' && profile.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">Only pharmacists can manage stock.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stock Management</h1>
          <p className="text-slate-600 mt-1">Manage pharmacy inventory and stock levels</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Stock Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Stock Item' : 'Add New Stock Item'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="medication">Medication *</Label>
                <Select
                  value={formData.medication_id}
                  onValueChange={(value) => {
                    const medication = medications.find(m => m.id === value);
                    setFormData({ 
                      ...formData, 
                      medication_id: value,
                      unit: medication?.unit || ''
                    });
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select medication" />
                  </SelectTrigger>
                  <SelectContent>
                    {medications.map((medication) => (
                      <SelectItem key={medication.id} value={medication.id}>
                        {medication.medication_name} ({medication.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_stock">Current Stock *</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum_stock">Minimum Stock *</Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingItem ? 'Update Stock' : 'Add Stock Item'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingItem(null);
                    setFormData({
                      medication_id: '',
                      current_stock: '',
                      minimum_stock: '',
                      unit: '',
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Different medications in stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stockItems.filter(item => item.status === 'Low Stock').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Items need restocking
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stockItems.filter(item => item.status === 'Out of Stock').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Items completely out
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search medications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="In Stock">In Stock</SelectItem>
                <SelectItem value="Low Stock">Low Stock</SelectItem>
                <SelectItem value="Out of Stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStockItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No stock items found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Minimum Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.medication_name}
                    </TableCell>
                    <TableCell>
                      {item.current_stock} {item.unit}
                    </TableCell>
                    <TableCell>
                      {item.minimum_stock} {item.unit}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1">{item.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.last_updated), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteStockItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

