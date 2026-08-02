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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, TestTube, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type LabTest = Database['public']['Tables']['lab_tests']['Row'];

export default function LabTestsPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [formData, setFormData] = useState({
    test_name: '',
    test_code: '',
    description: '',
    price: '',
    normal_range: '',
    active: true,
  });

  useEffect(() => {
    if (!authLoading && user && profile) {
      loadData();
    }
  }, [authLoading, user, profile]);

  async function loadData() {
    try {
      const { data, error } = await supabase
        .from('lab_tests')
        .select('*')
        .order('test_name');

      if (error) throw error;
      setLabTests(data || []);
    } catch (error: any) {
      toast.error('Failed to load lab tests');
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

      const testData = {
        test_name: formData.test_name,
        test_code: formData.test_code,
        description: formData.description || null,
        price: parseFloat(formData.price) || 0,
        normal_range: formData.normal_range || null,
        active: formData.active,
      };

      if (editingTest) {
        const { error } = await supabase
          .from('lab_tests')
          .update(testData)
          .eq('id', editingTest.id);

        if (error) throw error;
        toast.success('Lab test updated successfully');
      } else {
        const { error } = await supabase
          .from('lab_tests')
          .insert(testData);

        if (error) throw error;
        toast.success('Lab test created successfully');
      }

      setDialogOpen(false);
      setEditingTest(null);
      setFormData({
        test_name: '',
        test_code: '',
        description: '',
        price: '',
        normal_range: '',
        active: true,
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save lab test');
    }
  }

  async function deleteTest(testId: string) {
    if (!confirm('Are you sure you want to delete this lab test?')) return;

    try {
      const { error } = await supabase
        .from('lab_tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;
      toast.success('Lab test deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error('Failed to delete lab test');
    }
  }

  async function toggleTestStatus(testId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('lab_tests')
        .update({ active: !currentStatus })
        .eq('id', testId);

      if (error) throw error;
      toast.success(`Lab test ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadData();
    } catch (error: any) {
      toast.error('Failed to update lab test status');
    }
  }

  function openEditDialog(test: LabTest) {
    setEditingTest(test);
    setFormData({
      test_name: test.test_name,
      test_code: test.test_code,
      description: test.description || '',
      price: test.price.toString(),
      normal_range: test.normal_range || '',
      active: test.active ?? false,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingTest(null);
    setFormData({
      test_name: '',
      test_code: '',
      description: '',
      price: '',
      normal_range: '',
      active: true,
    });
  }

  const filteredTests = labTests.filter((test) =>
    test.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.test_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (test.description && test.description.toLowerCase().includes(searchTerm.toLowerCase()))
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

  // Check if user has permission to manage lab tests (Admin or Lab Tech)
  if (profile.role !== 'Admin' && profile.role !== 'Lab Tech') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">You don't have permission to manage lab tests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lab Tests Management</h1>
          <p className="text-slate-600 mt-1">Manage available laboratory tests</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => closeDialog()}>
              <Plus className="h-4 w-4" />
              Add Lab Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTest ? 'Edit Lab Test' : 'Add New Lab Test'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test_name">Test Name *</Label>
                  <Input
                    id="test_name"
                    value={formData.test_name}
                    onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                    placeholder="e.g., Complete Blood Count"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test_code">Test Code *</Label>
                  <Input
                    id="test_code"
                    value={formData.test_code}
                    onChange={(e) => setFormData({ ...formData, test_code: e.target.value.toUpperCase() })}
                    placeholder="e.g., CBC"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the test"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="normal_range">Normal Range</Label>
                  <Input
                    id="normal_range"
                    value={formData.normal_range}
                    onChange={(e) => setFormData({ ...formData, normal_range: e.target.value })}
                    placeholder="e.g., 4.5-11.0 x10³/μL"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingTest ? 'Update Test' : 'Create Test'}
                </Button>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search lab tests by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTests.length === 0 ? (
              <div className="text-center py-12">
                <TestTube className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No lab tests found</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTests.map((test) => (
                  <Card key={test.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TestTube className="h-5 w-5 text-blue-600" />
                            {test.test_name}
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                            <span>Code: {test.test_code}</span>
                            <span>Price: ${test.price.toFixed(2)}</span>
                            <span className="text-sm text-slate-500">{format(new Date(test.created_at ?? ''), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={test.active ? 'default' : 'secondary'}>
                            {test.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {test.description && (
                        <div>
                          <span className="font-medium text-slate-900">Description:</span>
                          <p className="text-slate-700 mt-1">{test.description}</p>
                        </div>
                      )}
                      {test.normal_range && (
                        <div>
                          <span className="font-medium text-slate-900">Normal Range:</span>
                          <p className="text-slate-700 mt-1">{test.normal_range}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(test)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleTestStatus(test.id, test.active)}
                        >
                          {test.active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteTest(test.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
