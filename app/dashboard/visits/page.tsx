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
import { Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Visit = Database['public']['Tables']['visits']['Row'] & {
  patients: { first_name: string; last_name: string; medical_id: string } | null;
  profiles: { full_name: string } | null;
};

type Patient = Database['public']['Tables']['patients']['Row'];

export default function VisitsPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    chief_complaint: '',
    vital_signs: {
      blood_pressure: '',
      temperature: '',
      pulse: '',
      weight: '',
      height: '',
    },
    diagnosis: '',
    treatment_plan: '',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && user && profile) {
      loadData();
    }
  }, [authLoading, user, profile]);

  async function loadData() {
    try {
      const [visitsResult, patientsResult] = await Promise.all([
        supabase
          .from('visits')
          .select(`
            *,
            patients(first_name, last_name, medical_id),
            profiles(full_name)
          `)
          .order('visit_date', { ascending: false }),
        supabase.from('patients').select('*').order('first_name'),
      ]);

      if (visitsResult.error) throw visitsResult.error;
      if (patientsResult.error) throw patientsResult.error;

      setVisits(visitsResult.data || []);
      setPatients(patientsResult.data || []);
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

      const { error } = await supabase.from('visits').insert({
        patient_id: formData.patient_id,
        doctor_id: profile.id,
        chief_complaint: formData.chief_complaint,
        vital_signs: formData.vital_signs,
        diagnosis: formData.diagnosis,
        treatment_plan: formData.treatment_plan,
        notes: formData.notes,
      });

      if (error) throw error;

      toast.success('Visit recorded successfully');
      setDialogOpen(false);
      setFormData({
        patient_id: '',
        chief_complaint: '',
        vital_signs: {
          blood_pressure: '',
          temperature: '',
          pulse: '',
          weight: '',
          height: '',
        },
        diagnosis: '',
        treatment_plan: '',
        notes: '',
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record visit');
    }
  }

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
          <h1 className="text-3xl font-bold text-slate-900">Clinical Visits & EMR</h1>
          <p className="text-slate-600 mt-1">Manage patient visits and electronic medical records</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Visit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Visit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient *</Label>
                <Select
                  value={formData.patient_id}
                  onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
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
                <Label htmlFor="chief_complaint">Chief Complaint *</Label>
                <Textarea
                  id="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                  placeholder="Main reason for visit"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Vital Signs</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="bp" className="text-xs">Blood Pressure</Label>
                    <Input
                      id="bp"
                      placeholder="120/80"
                      value={formData.vital_signs.blood_pressure}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vital_signs: { ...formData.vital_signs, blood_pressure: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="temp" className="text-xs">Temperature</Label>
                    <Input
                      id="temp"
                      placeholder="98.6°F"
                      value={formData.vital_signs.temperature}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vital_signs: { ...formData.vital_signs, temperature: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="pulse" className="text-xs">Pulse</Label>
                    <Input
                      id="pulse"
                      placeholder="72 bpm"
                      value={formData.vital_signs.pulse}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vital_signs: { ...formData.vital_signs, pulse: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight" className="text-xs">Weight</Label>
                    <Input
                      id="weight"
                      placeholder="70 kg"
                      value={formData.vital_signs.weight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vital_signs: { ...formData.vital_signs, weight: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-xs">Height</Label>
                    <Input
                      id="height"
                      placeholder="170 cm"
                      value={formData.vital_signs.height}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vital_signs: { ...formData.vital_signs, height: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis *</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Clinical diagnosis"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatment_plan">Treatment Plan *</Label>
                <Textarea
                  id="treatment_plan"
                  value={formData.treatment_plan}
                  onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                  placeholder="Prescribed treatment and medications"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional observations"
                />
              </div>

              <Button type="submit" className="w-full">
                Record Visit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {visits.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No visits recorded yet</p>
            </CardContent>
          </Card>
        ) : (
          visits.map((visit) => (
            <Card key={visit.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {visit.patients?.first_name} {visit.patients?.last_name}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Medical ID: {visit.patients?.medical_id} | Doctor: {visit.profiles?.full_name}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    {format(new Date(visit.visit_date), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-semibold text-sm">Chief Complaint:</span>
                  <p className="text-slate-700 mt-1">{visit.chief_complaint}</p>
                </div>
                <div>
                  <span className="font-semibold text-sm">Diagnosis:</span>
                  <p className="text-slate-700 mt-1">{visit.diagnosis}</p>
                </div>
                <div>
                  <span className="font-semibold text-sm">Treatment Plan:</span>
                  <p className="text-slate-700 mt-1">{visit.treatment_plan}</p>
                </div>
                {visit.notes && (
                  <div>
                    <span className="font-semibold text-sm">Notes:</span>
                    <p className="text-slate-700 mt-1">{visit.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
