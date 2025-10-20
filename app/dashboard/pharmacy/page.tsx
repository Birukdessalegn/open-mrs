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
import { Plus, Search, Package, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Prescription = Database['public']['Tables']['prescriptions']['Row'] & {
  visits: { 
    visit_date: string;
    patients: { first_name: string; last_name: string; medical_id: string } | null;
  } | null;
};

type Patient = Database['public']['Tables']['patients']['Row'];
type Visit = Database['public']['Tables']['visits']['Row'] & {
  patients: { first_name: string; last_name: string; medical_id: string } | null;
};

export default function PharmacyPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    visit_id: '',
    patient_id: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  useEffect(() => {
    if (!authLoading && user && profile) {
      loadData();
    }
  }, [authLoading, user, profile]);

  async function loadData() {
    try {
      const [prescriptionsResult, patientsResult, visitsResult] = await Promise.all([
        supabase
          .from('prescriptions')
          .select(`
            *,
            visits(
              visit_date,
              patients(first_name, last_name, medical_id)
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('patients').select('*').order('first_name'),
        supabase
          .from('visits')
          .select(`
            *,
            patients(first_name, last_name, medical_id)
          `)
          .order('visit_date', { ascending: false }),
      ]);

      if (prescriptionsResult.error) throw prescriptionsResult.error;
      if (patientsResult.error) throw patientsResult.error;
      if (visitsResult.error) throw visitsResult.error;

      setPrescriptions(prescriptionsResult.data || []);
      setPatients(patientsResult.data || []);
      setVisits(visitsResult.data || []);
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

      const selectedVisit = visits.find(v => v.id === formData.visit_id);
      if (!selectedVisit) {
        toast.error('Please select a valid visit');
        return;
      }

      const { error } = await supabase.from('prescriptions').insert({
        visit_id: formData.visit_id,
        patient_id: selectedVisit.patient_id,
        medication_name: formData.medication_name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration,
        instructions: formData.instructions,
      });

      if (error) throw error;

      toast.success('Prescription created successfully');
      setDialogOpen(false);
      setFormData({
        visit_id: '',
        patient_id: '',
        medication_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create prescription');
    }
  }

  const filteredPrescriptions = prescriptions.filter((prescription) =>
    prescription.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.visits?.patients?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.visits?.patients?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prescription.visits?.patients?.medical_id.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pharmacy Management</h1>
          <p className="text-slate-600 mt-1">Manage patient prescriptions and medication orders</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Prescription
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Prescription</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="visit_id">Select Visit *</Label>
                <Select
                  value={formData.visit_id}
                  onValueChange={(value) => {
                    const selectedVisit = visits.find(v => v.id === value);
                    setFormData({ 
                      ...formData, 
                      visit_id: value,
                      patient_id: selectedVisit?.patient_id || ''
                    });
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a visit" />
                  </SelectTrigger>
                  <SelectContent>
                    {visits.map((visit) => (
                      <SelectItem key={visit.id} value={visit.id}>
                        {visit.patients?.first_name} {visit.patients?.last_name} - {visit.patients?.medical_id} 
                        ({format(new Date(visit.visit_date), 'MMM dd, yyyy')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medication_name">Medication Name *</Label>
                  <Input
                    id="medication_name"
                    value={formData.medication_name}
                    onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                    placeholder="e.g., Amoxicillin"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage *</Label>
                  <Input
                    id="dosage"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Once daily">Once daily</SelectItem>
                      <SelectItem value="Twice daily">Twice daily</SelectItem>
                      <SelectItem value="Three times daily">Three times daily</SelectItem>
                      <SelectItem value="Four times daily">Four times daily</SelectItem>
                      <SelectItem value="Every 6 hours">Every 6 hours</SelectItem>
                      <SelectItem value="Every 8 hours">Every 8 hours</SelectItem>
                      <SelectItem value="Every 12 hours">Every 12 hours</SelectItem>
                      <SelectItem value="As needed">As needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration *</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3 days">3 days</SelectItem>
                      <SelectItem value="5 days">5 days</SelectItem>
                      <SelectItem value="7 days">7 days</SelectItem>
                      <SelectItem value="10 days">10 days</SelectItem>
                      <SelectItem value="14 days">14 days</SelectItem>
                      <SelectItem value="21 days">21 days</SelectItem>
                      <SelectItem value="30 days">30 days</SelectItem>
                      <SelectItem value="As needed">As needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="e.g., Take with food, avoid alcohol, etc."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full">
                Create Prescription
              </Button>
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
                placeholder="Search prescriptions by medication, patient name, or medical ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPrescriptions.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No prescriptions found</p>
              </div>
            ) : (
              filteredPrescriptions.map((prescription) => (
                <Card key={prescription.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5 text-blue-600" />
                          {prescription.medication_name}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {prescription.visits?.patients?.first_name} {prescription.visits?.patients?.last_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {prescription.visits?.patients?.medical_id}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {format(new Date(prescription.created_at), 'MMM dd, yyyy')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm font-medium text-slate-600">Dosage:</span>
                        <p className="text-slate-900">{prescription.dosage}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-600">Frequency:</span>
                        <p className="text-slate-900">{prescription.frequency}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-600">Duration:</span>
                        <p className="text-slate-900">{prescription.duration}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-600">Visit Date:</span>
                        <p className="text-slate-900">
                          {prescription.visits?.visit_date ? 
                            format(new Date(prescription.visits.visit_date), 'MMM dd, yyyy') : 
                            'N/A'
                          }
                        </p>
                      </div>
                    </div>
                    {prescription.instructions && (
                      <div>
                        <span className="text-sm font-medium text-slate-600">Instructions:</span>
                        <p className="text-slate-700 mt-1">{prescription.instructions}</p>
                      </div>
                    )}
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