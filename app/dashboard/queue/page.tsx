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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  Square,
  Bell,
  User,
  Calendar,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type QueueType = Database['public']['Tables']['queue_types']['Row'];
type QueueEntry = Database['public']['Tables']['queue_entries']['Row'] & {
  queue_types: { name: string; color: string } | null;
  patients: { first_name: string; last_name: string; medical_id: string; phone: string } | null;
  appointments: { appointment_date: string; reason: string } | null;
  profiles: { full_name: string } | null;
};
type Patient = Database['public']['Tables']['patients']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  patients: { first_name: string; last_name: string; medical_id: string } | null;
};

export default function QueueManagementPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [queueTypes, setQueueTypes] = useState<QueueType[]>([]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQueueType, setSelectedQueueType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    queue_type_id: '',
    patient_id: '',
    appointment_id: '',
    priority: 'Normal',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && user && profile) {
      loadData();
      // Set up real-time updates
      const channel = supabase
        .channel('queue-updates')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'queue_entries' },
          () => loadData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authLoading, user, profile]);

  async function loadData() {
    try {
      console.log('Loading queue data...');
      
      const [queueTypesResult, queueEntriesResult, patientsResult, appointmentsResult] = await Promise.all([
        supabase
          .from('queue_types')
          .select('*')
          .eq('active', true)
          .order('priority_order'),
        supabase
          .from('queue_entries')
          .select(`
            *,
            queue_types(name, color),
            patients(first_name, last_name, medical_id, phone),
            appointments(appointment_date, reason),
            profiles(full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('patients')
          .select('*')
          .order('first_name'),
        supabase
          .from('appointments')
          .select(`
            *,
            patients(first_name, last_name, medical_id)
          `)
          .eq('status', 'Scheduled')
          .gte('appointment_date', new Date().toISOString().split('T')[0])
          .order('appointment_date'),
      ]);

      console.log('Queue types result:', queueTypesResult);
      console.log('Queue entries result:', queueEntriesResult);
      console.log('Patients result:', patientsResult);
      console.log('Appointments result:', appointmentsResult);

      if (queueTypesResult.error) {
        console.error('Queue types error:', queueTypesResult.error);
        throw queueTypesResult.error;
      }
      if (queueEntriesResult.error) {
        console.error('Queue entries error:', queueEntriesResult.error);
        throw queueEntriesResult.error;
      }
      if (patientsResult.error) {
        console.error('Patients error:', patientsResult.error);
        throw patientsResult.error;
      }
      if (appointmentsResult.error) {
        console.error('Appointments error:', appointmentsResult.error);
        throw appointmentsResult.error;
      }

      setQueueTypes(queueTypesResult.data || []);
      setQueueEntries(queueEntriesResult.data || []);
      setPatients(patientsResult.data || []);
      setAppointments(appointmentsResult.data || []);
      
      console.log('Queue data loaded successfully');
    } catch (error: any) {
      console.error('Error loading queue data:', error);
      toast.error(`Failed to load queue data: ${error.message}`);
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

      // Get next queue number
      const { data: nextNumber, error: numberError } = await supabase
        .rpc('get_next_queue_number', { queue_type_uuid: formData.queue_type_id });

      if (numberError) throw numberError;

      // Get estimated wait time
      const { data: estimatedWait, error: waitError } = await supabase
        .rpc('calculate_estimated_wait_time', { queue_type_uuid: formData.queue_type_id });

      if (waitError) throw waitError;

      const { error } = await supabase
        .from('queue_entries')
        .insert({
          queue_type_id: formData.queue_type_id,
          patient_id: formData.patient_id,
          appointment_id: formData.appointment_id || null,
          priority: formData.priority,
          notes: formData.notes,
          queue_number: nextNumber,
          estimated_wait_time: estimatedWait || 15,
          created_by: profile.id,
        });

      if (error) throw error;

      toast.success('Patient added to queue successfully');
      setDialogOpen(false);
      setFormData({
        queue_type_id: '',
        patient_id: '',
        appointment_id: '',
        priority: 'Normal',
        notes: '',
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add patient to queue');
    }
  }

  async function updateQueueStatus(entryId: string, status: string) {
    try {
      const updateData: any = { status };
      
      if (status === 'In Progress') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'Completed') {
        updateData.completed_at = new Date().toISOString();
        // Calculate actual wait time
        const entry = queueEntries.find(e => e.id === entryId);
        if (entry?.started_at) {
          const startTime = new Date(entry.started_at).getTime();
          const completedTime = new Date().getTime();
          updateData.actual_wait_time = Math.round((completedTime - startTime) / (1000 * 60));
        }
      }

      const { error } = await supabase
        .from('queue_entries')
        .update(updateData)
        .eq('id', entryId);

      if (error) throw error;

      toast.success(`Queue status updated to ${status}`);
      loadData();
    } catch (error: any) {
      toast.error('Failed to update queue status');
    }
  }

  async function callNextPatient(queueTypeId: string) {
    try {
      const nextEntry = queueEntries
        .filter(entry => 
          entry.queue_type_id === queueTypeId && 
          entry.status === 'Waiting'
        )
        .sort((a, b) => a.queue_number - b.queue_number)[0];

      if (!nextEntry) {
        toast.info('No patients waiting in this queue');
        return;
      }

      const { error } = await supabase
        .from('queue_entries')
        .update({ 
          status: 'In Progress',
          called_at: new Date().toISOString(),
          started_at: new Date().toISOString()
        })
        .eq('id', nextEntry.id);

      if (error) throw error;

      toast.success(`Called ${nextEntry.patients?.first_name} ${nextEntry.patients?.last_name} - Queue #${nextEntry.queue_number}`);
      loadData();
    } catch (error: any) {
      toast.error('Failed to call next patient');
    }
  }

  const filteredEntries = queueEntries.filter((entry) => {
    const matchesSearch = 
      entry.patients?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.patients?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.patients?.medical_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.queue_number.toString().includes(searchTerm);
    
    const matchesQueueType = selectedQueueType === 'all' || entry.queue_type_id === selectedQueueType;
    const matchesStatus = selectedStatus === 'all' || entry.status === selectedStatus;
    
    return matchesSearch && matchesQueueType && matchesStatus;
  });

  const getStatusIcon = (status: string | null | undefined) => {
    switch (status) {
      case 'Waiting':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'In Progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Cancelled':
        return <Square className="h-4 w-4 text-red-600" />;
      case 'No Show':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const isSameDay = (value: string | null | undefined) => {
    if (!value) return false;

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return false;
    }

    return parsedDate.toDateString() === new Date().toDateString();
  };

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'Waiting':
        return 'bg-orange-100 text-orange-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      case 'No Show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Normal':
        return 'bg-blue-100 text-blue-800';
      case 'Low':
        return 'bg-gray-100 text-gray-800';
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

  // Check if user has permission to manage queues
  if (profile.role !== 'Receptionist' && profile.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">Only receptionists can manage queues.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Queue Management</h1>
          <p className="text-slate-600 mt-1">Manage patient queues and service flow</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add to Queue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Patient to Queue</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="queue_type">Queue Type *</Label>
                  <Select
                    value={formData.queue_type_id}
                    onValueChange={(value) => setFormData({ ...formData, queue_type_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select queue type" />
                    </SelectTrigger>
                    <SelectContent>
                      {queueTypes.map((queueType) => (
                        <SelectItem key={queueType.id} value={queueType.id}>
                          {queueType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient">Patient *</Label>
                <Select
                  value={formData.patient_id}
                  onValueChange={(value) => setFormData({ ...formData, patient_id: value, appointment_id: '' })}
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

              {formData.patient_id && (
                <div className="space-y-2">
                  <Label htmlFor="appointment">Appointment (Optional)</Label>
                  <Select
                    value={formData.appointment_id}
                    onValueChange={(value) => setFormData({ ...formData, appointment_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select appointment" />
                    </SelectTrigger>
                    <SelectContent>
                      {appointments
                        .filter(apt => apt.patient_id === formData.patient_id)
                        .map((appointment) => (
                          <SelectItem key={appointment.id} value={appointment.id}>
                            {format(new Date(appointment.appointment_date), 'MMM dd, yyyy HH:mm')} - {appointment.reason}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes for this queue entry"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Add to Queue
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Queue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Waiting</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queueEntries.filter(entry => entry.status === 'Waiting').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Patients in queue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Play className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {queueEntries.filter(entry => entry.status === 'In Progress').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently being served
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {queueEntries.filter(entry => 
                entry.status === 'Completed' && 
                isSameDay(entry.created_at)
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Served today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {queueEntries.length > 0 
                ? Math.round(queueEntries.reduce((sum, entry) => sum + (entry.estimated_wait_time || 0), 0) / queueEntries.length)
                : 0
              }m
            </div>
            <p className="text-xs text-muted-foreground">
              Average wait time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Management Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Queues</TabsTrigger>
          {queueTypes.map((queueType) => (
            <TabsTrigger key={queueType.id} value={queueType.id}>
              {queueType.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {queueTypes.map((queueType) => (
          <TabsContent key={queueType.id} value={queueType.id} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: queueType.color ?? '#3b82f6' as string }}
                    ></div>
                    <CardTitle>{queueType.name}</CardTitle>
                    <Badge variant="outline">
                      {queueEntries.filter(entry => 
                        entry.queue_type_id === queueType.id && 
                        entry.status === 'Waiting'
                      ).length} waiting
                    </Badge>
                  </div>
                  <Button
                    onClick={() => callNextPatient(queueType.id)}
                    className="gap-2"
                    disabled={!queueEntries.some(entry => 
                      entry.queue_type_id === queueType.id && 
                      entry.status === 'Waiting'
                    )}
                  >
                    <Bell className="h-4 w-4" />
                    Call Next
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {queueEntries
                    .filter(entry => entry.queue_type_id === queueType.id)
                    .sort((a, b) => a.queue_number - b.queue_number)
                    .map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-bold text-blue-600">
                            #{entry.queue_number}
                          </div>
                          <div>
                            <div className="font-medium">
                              {entry.patients?.first_name} {entry.patients?.last_name}
                            </div>
                            <div className="text-sm text-slate-600">
                              {entry.patients?.medical_id}
                            </div>
                          </div>
                          <Badge className={getPriorityColor(entry.priority || 'Normal')}>
                            {entry.priority || 'Normal'}
                          </Badge>
                          <Badge className={getStatusColor(entry.status || 'Waiting')}>
                            {getStatusIcon(entry.status || 'Waiting')}
                            <span className="ml-1">{entry.status || 'Waiting'}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.status === 'Waiting' && (
                            <Button
                              size="sm"
                              onClick={() => updateQueueStatus(entry.id, 'In Progress')}
                            >
                              Start
                            </Button>
                          )}
                          {entry.status === 'In Progress' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQueueStatus(entry.id, 'Completed')}
                            >
                              Complete
                            </Button>
                          )}
                          {entry.status !== 'Completed' && entry.status !== 'Cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQueueStatus(entry.id, 'Cancelled')}
                              className="text-red-600"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  {queueEntries.filter(entry => entry.queue_type_id === queueType.id).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      No patients in this queue
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by patient name, medical ID, or queue number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Waiting">Waiting</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="No Show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Queue #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Queue Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wait Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-bold text-blue-600">
                        #{entry.queue_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {entry.patients?.first_name} {entry.patients?.last_name}
                          </div>
                          <div className="text-sm text-slate-600">
                            {entry.patients?.medical_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: (entry.queue_types?.color ?? '#3b82f6') as string }}
                          ></div>
                          {entry.queue_types?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(entry.priority || 'Normal')}>
                          {entry.priority || 'Normal'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(entry.status || 'Waiting')}>
                          {getStatusIcon(entry.status || 'Waiting')}
                          <span className="ml-1">{entry.status || 'Waiting'}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.estimated_wait_time} min
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {entry.status === 'Waiting' && (
                            <Button
                              size="sm"
                              onClick={() => updateQueueStatus(entry.id, 'In Progress')}
                            >
                              Start
                            </Button>
                          )}
                          {entry.status === 'In Progress' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQueueStatus(entry.id, 'Completed')}
                            >
                              Complete
                            </Button>
                          )}
                          {entry.status !== 'Completed' && entry.status !== 'Cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQueueStatus(entry.id, 'Cancelled')}
                              className="text-red-600"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredEntries.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">No queue entries found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
