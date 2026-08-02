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
import { Search, Receipt, User, Plus, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Patient = Database['public']['Tables']['patients']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  patients: { first_name: string; last_name: string; medical_id: string } | null;
  invoice_items: Database['public']['Tables']['invoice_items']['Row'][];
};

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function BillingPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [currentItem, setCurrentItem] = useState<InvoiceItem>({
    description: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
  });

  useEffect(() => {
    if (!authLoading && user && profile) {
      loadData();
    }
  }, [authLoading, user, profile]);

  async function loadData() {
    try {
      const [patientsResult, servicesResult, invoicesResult] = await Promise.all([
        supabase.from('patients').select('*').order('first_name'),
        supabase.from('services').select('*').eq('active', true).order('service_name'),
        supabase
          .from('invoices')
          .select(`
            *,
            patients(first_name, last_name, medical_id),
            invoice_items(*)
          `)
          .order('invoice_date', { ascending: false }),
      ]);

      if (patientsResult.error) throw patientsResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;

      setPatients(patientsResult.data || []);
      setServices(servicesResult.data || []);
      setInvoices(invoicesResult.data || []);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function addInvoiceItem() {
    if (!currentItem.description || currentItem.unit_price <= 0) {
      toast.error('Please fill in description and unit price');
      return;
    }

    const newItem = {
      ...currentItem,
      total_price: currentItem.quantity * currentItem.unit_price,
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setCurrentItem({
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    });
  }

  function removeInvoiceItem(index: number) {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  }

  function selectService(serviceId: string) {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setCurrentItem({
        description: service.service_name,
        quantity: 1,
        unit_price: service.price,
        total_price: service.price,
      });
    }
  }

  async function createInvoice() {
    try {
      if (!selectedPatient || !user || !profile?.id) {
        toast.error('Please select a patient and ensure you are logged in');
        return;
      }

      if (invoiceItems.length === 0) {
        toast.error('Please add at least one item to the invoice');
        return;
      }

      const subtotal = invoiceItems.reduce((sum, item) => sum + item.total_price, 0);
      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax;

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          patient_id: selectedPatient.id,
          invoice_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          subtotal,
          tax,
          discount: 0,
          total_amount: total,
          amount_paid: 0,
          status: 'Pending',
          created_by: profile.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const itemsToInsert = invoiceItems.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success('Invoice created successfully');
      setDialogOpen(false);
      setSelectedPatient(null);
      setInvoiceItems([]);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invoice');
    }
  }

  const filteredPatients = patients.filter((patient) =>
    patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.medical_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = invoiceItems.reduce((sum, item) => sum + item.total_price, 0);
  const tax = totalAmount * 0.1;
  const grandTotal = totalAmount + tax;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing Management</h1>
          <p className="text-slate-600 mt-1">Create invoices and manage patient billing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Patient Selection */}
              <div className="space-y-2">
                <Label>Select Patient *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search patients by name or medical ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className={`p-3 cursor-pointer hover:bg-slate-50 border-b ${
                        selectedPatient?.id === patient.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {patient.first_name} {patient.last_name}
                        </span>
                        <span className="text-slate-500">- {patient.medical_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedPatient && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800">
                      Selected: {selectedPatient.first_name} {selectedPatient.last_name} ({selectedPatient.medical_id})
                    </p>
                  </div>
                )}
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Invoice Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentItem({
                      description: '',
                      quantity: 1,
                      unit_price: 0,
                      total_price: 0,
                    })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {/* Add Item Form */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="service">Service</Label>
                    <Select onValueChange={selectService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.service_name} - ${service.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={currentItem.description}
                      onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                      placeholder="Service description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit_price">Unit Price</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentItem.unit_price}
                      onChange={(e) => setCurrentItem({ ...currentItem, unit_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Button type="button" onClick={addInvoiceItem} className="w-full">
                      Add to Invoice
                    </Button>
                  </div>
                </div>

                {/* Invoice Items List */}
                {invoiceItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Invoice Items</Label>
                    <div className="border rounded-lg">
                      {invoiceItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border-b last:border-b-0">
                          <div className="flex-1">
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-slate-600">
                              {item.quantity} × ${item.unit_price.toFixed(2)} = ${item.total_price.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeInvoiceItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoice Summary */}
                {invoiceItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Invoice Summary</Label>
                    <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (10%):</span>
                        <span>${tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={createInvoice} className="flex-1" disabled={!selectedPatient || invoiceItems.length === 0}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No invoices found</p>
              </div>
            ) : (
              invoices.map((invoice) => (
                <Card key={invoice.id} className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Invoice #{invoice.invoice_number}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {invoice.patients?.first_name} {invoice.patients?.last_name}
                          </div>
                          <div>
                            Medical ID: {invoice.patients?.medical_id}
                          </div>
                          <div>
                            Date: {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          invoice.status === 'Paid' ? 'default' :
                          invoice.status === 'Partially Paid' ? 'secondary' :
                          'outline'
                        }>
                          {invoice.status}
                        </Badge>
                        <div className="text-right">
                          <p className="font-bold text-lg">${invoice.total_amount.toFixed(2)}</p>
                          <p className="text-sm text-slate-500">
                            Paid: ${invoice.amount_paid.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">Items:</h4>
                      {invoice.invoice_items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.description} (×{item.quantity})</span>
                          <span>${item.total_price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
