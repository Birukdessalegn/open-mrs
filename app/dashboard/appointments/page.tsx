'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  patients: { first_name: string; last_name: string; medical_id: string } | null;
  profiles: { full_name: string } | null;
};

type Patient = Database['public']['Tables']['patients']['Row'];
type Doctor = { id: string; full_name: string };

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [appointmentsResult, patientsResult, doctorsResult] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            *,
            patients(first_name, last_name, medical_id),
            profiles(full_name)
          `)
          .order('appointment_date', { ascending: false }),
        supabase.from('patients').select('*').order('first_name'),
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['Doctor', 'Admin'])
          .order('full_name'),
      ]);

      if (appointmentsResult.error) throw appointmentsResult.error;
      if (patientsResult.error) throw patientsResult.error;
      if (doctorsResult.error) throw doctorsResult.error;

      setAppointments(appointmentsResult.data || []);
      setPatients(patientsResult.data || []);
      setDoctors(doctorsResult.data || []);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const appointmentDateTime = `${formData.appointment_date}T${formData.appointment_time}:00`;

      const { error } = await supabase.from('appointments').insert({
        patient_id: formData.patient_id,
        doctor_id: formData.doctor_id,
        appointment_date: appointmentDateTime,
        reason: formData.reason,
        notes: formData.notes,
      });

      if (error) throw error;

      toast.success('Appointment scheduled successfully');
      setDialogOpen(false);
      setFormData({
        patient_id: '',
        doctor_id: '',
        appointment_date: '',
        appointment_time: '',
        reason: '',
        notes: '',
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule appointment');
    }
  }

  async function updateAppointmentStatus(id: string, status: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success('Appointment status updated');
      loadData();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'Scheduled' && new Date(a.appointment_date) >= new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-600 mt-1">Schedule and manage patient appointments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
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
                <Label htmlFor="doctor_id">Doctor *</Label>
                <Select
                  value={formData.doctor_id}
                  onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment_date">Date *</Label>
                  <Input
                    id="appointment_date"
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointment_time">Time *</Label>
                  <Input
                    id="appointment_time"
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Visit *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Chief complaint or reason for appointment"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or instructions"
                />
              </div>

              <Button type="submit" className="w-full">
                Schedule Appointment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No appointments scheduled</p>
            </CardContent>
          </Card>
        ) : (
          appointments.map((appointment) => {
            const appointmentDate = new Date(appointment.appointment_date);
            const isPast = appointmentDate < new Date();

            return (
              <Card key={appointment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {appointment.patients?.first_name} {appointment.patients?.last_name}
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        Medical ID: {appointment.patients?.medical_id} | Doctor: {appointment.profiles?.full_name}
                      </p>
                    </div>
                    <Badge
                      variant={
                        appointment.status === 'Scheduled'
                          ? 'default'
                          : appointment.status === 'Completed'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-slate-600">Date & Time:</span>
                      <p className="font-medium">{format(appointmentDate, 'MMM dd, yyyy - HH:mm')}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Reason:</span>
                      <p className="font-medium">{appointment.reason}</p>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div>
                      <span className="text-sm text-slate-600">Notes:</span>
                      <p className="text-slate-700 mt-1">{appointment.notes}</p>
                    </div>
                  )}

                  {appointment.status === 'Scheduled' && !isPast && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAppointmentStatus(appointment.id, 'Completed')}
                      >
                        Mark Completed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAppointmentStatus(appointment.id, 'Cancelled')}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
