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
import { Plus, Receipt, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  patients: { first_name: string; last_name: string; medical_id: string } | null;
  invoice_items: Database['public']['Tables']['invoice_items']['Row'][];
};

type Patient = Database['public']['Tables']['patients']['Row'];
type Service = Database['public']['Tables']['services']['Row'];

export default function BillingPage() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceFormData, setInvoiceFormData] = useState({
    patient_id: '',
    items: [] as { service_id: string; quantity: number }[],
  });
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_method: 'Cash' as 'Cash' | 'Card' | 'Insurance' | 'Mobile Money',
    reference_number: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [invoicesResult, patientsResult, servicesResult] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            *,
            patients(first_name, last_name, medical_id),
            invoice_items(*)
          `)
          .order('invoice_date', { ascending: false }),
        supabase.from('patients').select('*').order('first_name'),
        supabase.from('services').select('*').eq('active', true).order('service_name'),
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (patientsResult.error) throw patientsResult.error;
      if (servicesResult.error) throw servicesResult.error;

      setInvoices(invoicesResult.data || []);
      setPatients(patientsResult.data || []);
      setServices(servicesResult.data || []);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvoiceSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!profile?.id) throw new Error('User not authenticated');

      const invoiceNumber = `INV-${Date.now()}`;

      const itemsWithDetails = await Promise.all(
        invoiceFormData.items.map(async (item) => {
          const service = services.find((s) => s.id === item.service_id);
          return {
            service_id: item.service_id,
            description: service?.service_name || '',
            quantity: item.quantity,
            unit_price: service?.price || 0,
            total_price: (service?.price || 0) * item.quantity,
          };
        })
      );

      const subtotal = itemsWithDetails.reduce((sum, item) => sum + item.total_price, 0);
      const total = subtotal;

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          patient_id: invoiceFormData.patient_id,
          subtotal,
          total_amount: total,
          created_by: profile.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceItems = itemsWithDetails.map((item) => ({
        invoice_id: invoiceData.id,
        ...item,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);

      if (itemsError) throw itemsError;

      toast.success('Invoice created successfully');
      setInvoiceDialogOpen(false);
      setInvoiceFormData({ patient_id: '', items: [] });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invoice');
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!profile?.id || !selectedInvoice) throw new Error('Invalid state');

      const paymentAmount = parseFloat(paymentFormData.amount);
      const newAmountPaid = selectedInvoice.amount_paid + paymentAmount;
      const newStatus =
        newAmountPaid >= selectedInvoice.total_amount
          ? 'Paid'
          : newAmountPaid > 0
          ? 'Partially Paid'
          : 'Pending';

      const { error: paymentError } = await supabase.from('payments').insert({
        invoice_id: selectedInvoice.id,
        amount: paymentAmount,
        payment_method: paymentFormData.payment_method,
        reference_number: paymentFormData.reference_number,
        received_by: profile.id,
      });

      if (paymentError) throw paymentError;

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq('id', selectedInvoice.id);

      if (invoiceError) throw invoiceError;

      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentFormData({ amount: '', payment_method: 'Cash', reference_number: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    }
  }

  const addServiceToInvoice = () => {
    setInvoiceFormData({
      ...invoiceFormData,
      items: [...invoiceFormData.items, { service_id: '', quantity: 1 }],
    });
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const newItems = [...invoiceFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoiceFormData({ ...invoiceFormData, items: newItems });
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceFormData({
      ...invoiceFormData,
      items: invoiceFormData.items.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingInvoices = invoices.filter((i) => i.status === 'Pending' || i.status === 'Partially Paid');
  const paidInvoices = invoices.filter((i) => i.status === 'Paid');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing & Revenue</h1>
          <p className="text-slate-600 mt-1">Manage invoices and payments</p>
        </div>
        <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvoiceSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient *</Label>
                <Select
                  value={invoiceFormData.patient_id}
                  onValueChange={(value) => setInvoiceFormData({ ...invoiceFormData, patient_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} - {patient.medical_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Services</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addServiceToInvoice}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Service
                  </Button>
                </div>
                {invoiceFormData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={item.service_id}
                        onValueChange={(value) => updateInvoiceItem(index, 'service_id', value)}
                        required
                      >
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
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeInvoiceItem(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full" disabled={invoiceFormData.items.length === 0}>
                Create Invoice
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingInvoices.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({paidInvoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingInvoices.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No pending invoices</p>
              </CardContent>
            </Card>
          ) : (
            pendingInvoices.map((invoice) => (
              <Card key={invoice.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        {invoice.patients?.first_name} {invoice.patients?.last_name} - {invoice.patients?.medical_id}
                      </p>
                    </div>
                    <Badge variant={invoice.status === 'Pending' ? 'secondary' : 'default'}>
                      {invoice.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-slate-600">Date:</span>
                      <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Total Amount:</span>
                      <p className="font-medium text-lg">${invoice.total_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Amount Paid:</span>
                      <p className="font-medium">${invoice.amount_paid.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Balance Due:</span>
                      <p className="font-medium text-red-600">
                        ${(invoice.total_amount - invoice.amount_paid).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-sm">Items:</span>
                    <div className="mt-2 space-y-1">
                      {invoice.invoice_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                          <span>
                            {item.description} × {item.quantity}
                          </span>
                          <span className="font-medium">${item.total_price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setPaymentDialogOpen(true);
                    }}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          {paidInvoices.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No paid invoices</p>
              </CardContent>
            </Card>
          ) : (
            paidInvoices.map((invoice) => (
              <Card key={invoice.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        {invoice.patients?.first_name} {invoice.patients?.last_name}
                      </p>
                    </div>
                    <Badge className="bg-green-600">Paid</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-slate-600">Date:</span>
                      <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Total Amount:</span>
                      <p className="font-medium text-lg">${invoice.total_amount.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input value={selectedInvoice?.invoice_number || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Balance Due</Label>
              <Input
                value={`$${((selectedInvoice?.total_amount || 0) - (selectedInvoice?.amount_paid || 0)).toFixed(2)}`}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={(selectedInvoice?.total_amount || 0) - (selectedInvoice?.amount_paid || 0)}
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={paymentFormData.payment_method}
                onValueChange={(value: any) => setPaymentFormData({ ...paymentFormData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={paymentFormData.reference_number}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_number: e.target.value })}
                placeholder="Transaction reference"
              />
            </div>
            <Button type="submit" className="w-full">
              Record Payment
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
