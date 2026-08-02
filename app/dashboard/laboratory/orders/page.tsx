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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, TestTube, User, Calendar, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Patient = Database['public']['Tables']['patients']['Row'];
type Visit = Database['public']['Tables']['visits']['Row'] & {
  patients: { first_name: string; last_name: string; medical_id: string } | null;
};
type LabTest = Database['public']['Tables']['lab_tests']['Row'];
type LabOrder = Database['public']['Tables']['lab_orders']['Row'] & {
  patients: { first_name: string; last_name: string; medical_id: string } | null;
  lab_order_items: (Database['public']['Tables']['lab_order_items']['Row'] & {
    lab_tests: { test_name: string; test_code: string } | null;
  })[];
};

export default function LabOrdersPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    visit_id: '',
    notes: '',
    selectedTests: [] as string[],
  });

  useEffect(() => {
    if (!authLoading && user && profile) {
      loadData();
    }
  }, [authLoading, user, profile]);

  async function loadData() {
    try {
      const [patientsResult, visitsResult, labTestsResult, labOrdersResult] = await Promise.all([
        supabase.from('patients').select('*').order('first_name'),
        supabase
          .from('visits')
          .select(`
            *,
            patients(first_name, last_name, medical_id)
          `)
          .order('visit_date', { ascending: false }),
        supabase
          .from('lab_tests')
          .select('*')
          .eq('active', true)
          .order('test_name'),
        supabase
          .from('lab_orders')
          .select(`
            *,
            patients(first_name, last_name, medical_id),
            lab_order_items(
              *,
              lab_tests(test_name, test_code)
            )
          `)
          .order('order_date', { ascending: false }),
      ]);

      if (patientsResult.error) throw patientsResult.error;
      if (visitsResult.error) throw visitsResult.error;
      if (labTestsResult.error) throw labTestsResult.error;
      if (labOrdersResult.error) throw labOrdersResult.error;

      setPatients(patientsResult.data || []);
      setVisits(visitsResult.data || []);
      setLabTests(labTestsResult.data || []);
      setLabOrders(labOrdersResult.data || []);
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
        toast.error('User not authenticated. Please log in again.');
        return;
      }

      if (formData.selectedTests.length === 0) {
        toast.error('Please select at least one lab test');
        return;
      }

      const selectedVisit = visits.find(v => v.id === formData.visit_id);
      if (!selectedVisit) {
        toast.error('Please select a valid visit');
        return;
      }

      // Create lab order
      const { data: labOrder, error: orderError } = await supabase
        .from('lab_orders')
        .insert({
          patient_id: selectedVisit.patient_id,
          visit_id: formData.visit_id,
          ordered_by: profile.id,
          notes: formData.notes,
          status: 'Pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create lab order items
      const orderItems = formData.selectedTests.map(testId => ({
        lab_order_id: labOrder.id,
        lab_test_id: testId,
      }));

      const { error: itemsError } = await supabase
        .from('lab_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('Lab order created successfully');
      setDialogOpen(false);
      setFormData({
        patient_id: '',
        visit_id: '',
        notes: '',
        selectedTests: [],
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create lab order');
    }
  }

  function toggleTestSelection(testId: string) {
    setFormData(prev => ({
      ...prev,
      selectedTests: prev.selectedTests.includes(testId)
        ? prev.selectedTests.filter(id => id !== testId)
        : [...prev.selectedTests, testId]
    }));
  }

  const filteredPatients = patients.filter((patient) =>
    patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.medical_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVisits = visits.filter(visit => 
    visit.patient_id === formData.patient_id
  );

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

  // Check if user has permission to create lab orders (Doctor or Admin)
  if (profile.role !== 'Doctor' && profile.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">Only doctors can create lab orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lab Orders</h1>
          <p className="text-slate-600 mt-1">Create laboratory test orders for patients</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Lab Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Lab Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                        formData.patient_id === patient.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setFormData({ ...formData, patient_id: patient.id, visit_id: '' })}
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
              </div>

              {/* Visit Selection */}
              {formData.patient_id && (
                <div className="space-y-2">
                  <Label>Select Visit *</Label>
                  <Select
                    value={formData.visit_id}
                    onValueChange={(value) => setFormData({ ...formData, visit_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a visit" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredVisits.map((visit) => (
                        <SelectItem key={visit.id} value={visit.id}>
                          {visit.visit_date ? format(new Date(visit.visit_date), 'MMM dd, yyyy') : 'N/A'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Lab Tests Selection */}
              <div className="space-y-2">
                <Label>Select Lab Tests *</Label>
                <div className="max-h-60 overflow-y-auto border rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {labTests.map((test) => (
                      <div key={test.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={test.id}
                          checked={formData.selectedTests.includes(test.id)}
                          onCheckedChange={() => toggleTestSelection(test.id)}
                        />
                        <Label htmlFor={test.id} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{test.test_name}</span>
                            <span className="text-sm text-slate-500">${test.price}</span>
                          </div>
                          <div className="text-sm text-slate-600">
                            Code: {test.test_code}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                {formData.selectedTests.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      Selected {formData.selectedTests.length} test(s)
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes for the lab order"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={formData.selectedTests.length === 0}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Create Lab Order
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent Lab Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Recent Lab Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {labOrders.length === 0 ? (
              <div className="text-center py-12">
                <TestTube className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No lab orders found</p>
              </div>
            ) : (
              labOrders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Lab Order #{order.id.slice(-8)}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {order.patients?.first_name} {order.patients?.last_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {order.patients?.medical_id}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          order.status === 'Completed' ? 'default' :
                          order.status === 'In Progress' ? 'secondary' :
                          'outline'
                        }>
                          {order.status}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {order.order_date ? format(new Date(order.order_date), 'MMM dd, yyyy') : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Tests Ordered:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {order.lab_order_items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                              <TestTube className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">
                                {item.lab_tests?.test_name} ({item.lab_tests?.test_code})
                              </span>
                              {item.result && (
                                <Badge variant="secondary" className="ml-auto">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      {order.notes && (
                        <div>
                          <span className="font-medium text-slate-900">Notes:</span>
                          <p className="text-slate-700 mt-1">{order.notes}</p>
                        </div>
                      )}
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
