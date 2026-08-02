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
import { Search, TestTube, User, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type LabOrder = Database['public']['Tables']['lab_orders']['Row'] & {
  patients: { first_name: string; last_name: string; medical_id: string } | null;
  profiles: { full_name: string } | null;
  lab_order_items: (Database['public']['Tables']['lab_order_items']['Row'] & {
    lab_tests: { test_name: string; test_code: string; normal_range: string | null } | null;
  })[];
};

type LabTest = Database['public']['Tables']['lab_tests']['Row'];

export default function LaboratoryPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<any>(null);
  const [resultData, setResultData] = useState({
    result: '',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && user && profile) {
      loadData();
    }
  }, [authLoading, user, profile]);

  async function loadData() {
    try {
      const [ordersResult, testsResult] = await Promise.all([
        supabase
          .from('lab_orders')
          .select(`
            *,
            patients(first_name, last_name, medical_id),
            profiles(full_name),
            lab_order_items(
              *,
              lab_tests(test_name, test_code, normal_range)
            )
          `)
          .order('order_date', { ascending: false }),
        supabase
          .from('lab_tests')
          .select('*')
          .eq('active', true)
          .order('test_name'),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (testsResult.error) throw testsResult.error;

      setLabOrders(ordersResult.data || []);
      setLabTests(testsResult.data || []);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      const { error } = await supabase
        .from('lab_orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order status updated successfully');
      loadData();
    } catch (error: any) {
      toast.error('Failed to update order status');
    }
  }

  async function submitTestResult() {
    try {
      if (!selectedOrderItem || !profile?.id) {
        toast.error('Invalid data');
        return;
      }

      const { error } = await supabase
        .from('lab_order_items')
        .update({
          result: resultData.result,
          result_date: new Date().toISOString(),
          performed_by: profile.id,
        })
        .eq('id', selectedOrderItem.id);

      if (error) throw error;

      toast.success('Test result submitted successfully');
      setResultDialogOpen(false);
      setSelectedOrderItem(null);
      setResultData({ result: '', notes: '' });
      loadData();
    } catch (error: any) {
      toast.error('Failed to submit test result');
    }
  }

  const filteredOrders = labOrders.filter((order) => {
    const matchesSearch = 
      order.patients?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patients?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patients?.medical_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Pending':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'Cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-orange-100 text-orange-800';
      case 'Cancelled':
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Laboratory Management</h1>
        <p className="text-slate-600 mt-1">Manage lab orders and test results</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by patient name or medical ID..."
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
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <TestTube className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No lab orders found</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TestTube className="h-5 w-5 text-blue-600" />
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
                          <div>
                            Ordered by: {order.profiles?.full_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(order.status ?? '')}>
                         {getStatusIcon(order.status ?? '')}
                          <span className="text-sm text-slate-500"> {format(new Date(order.order_date ?? ''), 'MMM dd, yyyy')}</span>
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {format(new Date(order.order_date), 'MMM dd, yyyy' ?? '')}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Tests Ordered:</h4>
                      <div className="space-y-2">
                        {order.lab_order_items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <div className="font-medium">{item.lab_tests?.test_name}</div>
                              <div className="text-sm text-slate-600">
                                Code: {item.lab_tests?.test_code}
                                {item.lab_tests?.normal_range && (
                                  <span className="ml-2">Normal: {item.lab_tests.normal_range}</span>
                                )}
                              </div>
                              {item.result && (
                                <div className="text-sm mt-1">
                                  <span className="font-medium">Result: </span>
                                  <span className="text-green-700">{item.result}</span>
                                  {item.result_date && (
                                    <span className="text-slate-500 ml-2">
                                      ({format(new Date(item.result_date), 'MMM dd, yyyy HH:mm')})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!item.result ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrderItem(item);
                                    setResultDialogOpen(true);
                                  }}
                                >
                                  Enter Result
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Completed
                                </Badge>
                              )}
                            </div>
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

                    <div className="flex gap-2 pt-2">
                      {order.status === 'Pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.id, 'In Progress')}
                        >
                          Start Processing
                        </Button>
                      )}
                      {order.status === 'In Progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.id, 'Completed')}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Result Entry Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Test Result</DialogTitle>
          </DialogHeader>
          {selectedOrderItem && (
            <div className="space-y-4">
              <div>
                <Label>Test: {selectedOrderItem.lab_tests?.test_name}</Label>
                <p className="text-sm text-slate-600">
                  Patient: {labOrders.find(o => o.lab_order_items.some(item => item.id === selectedOrderItem.id))?.patients?.first_name} {labOrders.find(o => o.lab_order_items.some(item => item.id === selectedOrderItem.id))?.patients?.last_name}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="result">Test Result *</Label>
                <Input
                  id="result"
                  value={resultData.result}
                  onChange={(e) => setResultData({ ...resultData, result: e.target.value })}
                  placeholder="Enter test result"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={resultData.notes}
                  onChange={(e) => setResultData({ ...resultData, notes: e.target.value })}
                  placeholder="Additional notes about the result"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={submitTestResult} className="flex-1">
                  Submit Result
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResultDialogOpen(false);
                    setSelectedOrderItem(null);
                    setResultData({ result: '', notes: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
