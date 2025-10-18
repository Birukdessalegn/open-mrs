'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, TestTube, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type LabOrder = Database['public']['Tables']['lab_orders']['Row'] & {
  patients: { first_name: string; last_name: string; medical_id: string } | null;
  profiles: { full_name: string } | null;
  lab_order_items: (Database['public']['Tables']['lab_order_items']['Row'] & {
    lab_tests: { test_name: string; normal_range: string | null } | null;
  })[];
};

type Patient = Database['public']['Tables']['patients']['Row'];
type LabTest = Database['public']['Tables']['lab_tests']['Row'];

export default function LaboratoryPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [orderFormData, setOrderFormData] = useState({
    patient_id: '',
    test_ids: [] as string[],
    notes: '',
  });
  const [resultFormData, setResultFormData] = useState({
    result: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [ordersResult, patientsResult, testsResult] = await Promise.all([
        supabase
          .from('lab_orders')
          .select(`
            *,
            patients(first_name, last_name, medical_id),
            profiles(full_name),
            lab_order_items(
              *,
              lab_tests(test_name, normal_range)
            )
          `)
          .order('order_date', { ascending: false }),
        supabase.from('patients').select('*').order('first_name'),
        supabase.from('lab_tests').select('*').eq('active', true).order('test_name'),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (patientsResult.error) throw patientsResult.error;
      if (testsResult.error) throw testsResult.error;

      setOrders(ordersResult.data || []);
      setPatients(patientsResult.data || []);
      setTests(testsResult.data || []);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleOrderSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!profile?.id) throw new Error('User not authenticated');

      const { data: orderData, error: orderError } = await supabase
        .from('lab_orders')
        .insert({
          patient_id: orderFormData.patient_id,
          ordered_by: profile.id,
          notes: orderFormData.notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = orderFormData.test_ids.map((test_id) => ({
        lab_order_id: orderData.id,
        lab_test_id: test_id,
      }));

      const { error: itemsError } = await supabase.from('lab_order_items').insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('Lab order created successfully');
      setOrderDialogOpen(false);
      setOrderFormData({ patient_id: '', test_ids: [], notes: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create order');
    }
  }

  async function handleResultSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!profile?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('lab_order_items')
        .update({
          result: resultFormData.result,
          result_date: new Date().toISOString(),
          performed_by: profile.id,
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      const { data: itemsData } = await supabase
        .from('lab_order_items')
        .select('result')
        .eq('lab_order_id', selectedItem.lab_order_id)
        .is('result', null);

      if (itemsData && itemsData.length === 0) {
        await supabase
          .from('lab_orders')
          .update({ status: 'Completed' })
          .eq('id', selectedItem.lab_order_id);
      }

      toast.success('Result recorded successfully');
      setResultDialogOpen(false);
      setSelectedItem(null);
      setResultFormData({ result: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record result');
    }
  }

  const toggleTest = (testId: string) => {
    setOrderFormData((prev) => ({
      ...prev,
      test_ids: prev.test_ids.includes(testId)
        ? prev.test_ids.filter((id) => id !== testId)
        : [...prev.test_ids, testId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === 'Pending' || o.status === 'In Progress');
  const completedOrders = orders.filter((o) => o.status === 'Completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Laboratory</h1>
          <p className="text-slate-600 mt-1">Manage lab test orders and results</p>
        </div>
        <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Lab Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient *</Label>
                <Select
                  value={orderFormData.patient_id}
                  onValueChange={(value) => setOrderFormData({ ...orderFormData, patient_id: value })}
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
                <Label>Select Tests *</Label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {tests.map((test) => (
                    <div
                      key={test.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleTest(test.id)}
                    >
                      <input
                        type="checkbox"
                        checked={orderFormData.test_ids.includes(test.id)}
                        onChange={() => toggleTest(test.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{test.test_name}</div>
                        <div className="text-xs text-slate-500">{test.description}</div>
                      </div>
                      <div className="text-sm font-semibold">${test.price}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={orderFormData.notes}
                  onChange={(e) => setOrderFormData({ ...orderFormData, notes: e.target.value })}
                  placeholder="Special instructions or notes"
                />
              </div>

              <Button type="submit" className="w-full" disabled={orderFormData.test_ids.length === 0}>
                Create Order
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Orders ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <TestTube className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No pending orders</p>
              </CardContent>
            </Card>
          ) : (
            pendingOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {order.patients?.first_name} {order.patients?.last_name}
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        Medical ID: {order.patients?.medical_id} | Ordered by: {order.profiles?.full_name}
                      </p>
                    </div>
                    <Badge variant={order.status === 'Pending' ? 'secondary' : 'default'}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-semibold text-sm">Order Date:</span>
                    <p className="text-slate-700">{format(new Date(order.order_date), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-sm">Tests:</span>
                    <div className="mt-2 space-y-2">
                      {order.lab_order_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div>
                            <div className="font-medium">{item.lab_tests?.test_name}</div>
                            {item.result ? (
                              <div className="text-sm text-green-600">Result: {item.result}</div>
                            ) : (
                              <div className="text-sm text-orange-600">Awaiting result</div>
                            )}
                          </div>
                          {!item.result && profile?.role === 'Lab Tech' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedItem({ ...item, lab_order_id: order.id });
                                setResultDialogOpen(true);
                              }}
                            >
                              Enter Result
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No completed orders</p>
              </CardContent>
            </Card>
          ) : (
            completedOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {order.patients?.first_name} {order.patients?.last_name}
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        Medical ID: {order.patients?.medical_id}
                      </p>
                    </div>
                    <Badge className="bg-green-600">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-semibold text-sm">Tests & Results:</span>
                    <div className="mt-2 space-y-2">
                      {order.lab_order_items.map((item) => (
                        <div key={item.id} className="p-3 bg-slate-50 rounded">
                          <div className="font-medium">{item.lab_tests?.test_name}</div>
                          <div className="text-sm text-slate-600 mt-1">Result: {item.result}</div>
                          {item.lab_tests?.normal_range && (
                            <div className="text-xs text-slate-500 mt-1">
                              Normal Range: {item.lab_tests.normal_range}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Test Result</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResultSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Test Name</Label>
              <Input value={selectedItem?.lab_tests?.test_name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="result">Result *</Label>
              <Textarea
                id="result"
                value={resultFormData.result}
                onChange={(e) => setResultFormData({ result: e.target.value })}
                placeholder="Enter test result"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Submit Result
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
