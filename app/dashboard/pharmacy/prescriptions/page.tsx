'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Package, User, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Prescription = Database['public']['Tables']['prescriptions']['Row'] & {
  visits: { 
    visit_date: string;
    patients: { first_name: string; last_name: string; medical_id: string; phone: string | null } | null;
  } | null;
};

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return 'N/A';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'N/A';
  }

  return format(parsedDate, 'MMM dd, yyyy');
}

export default function PharmacistPrescriptionsPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && user && profile) {
      loadData();
    }
  }, [authLoading, user, profile]);

  async function loadData() {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          visits(
            visit_date,
            patients(first_name, last_name, medical_id, phone)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error: any) {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }

  async function markPrescriptionFilled(prescriptionId: string) {
    try {
      if (!profile?.id) {
        toast.error('User not authenticated');
        return;
      }

      // Update prescription status directly
      const { error: updateError } = await supabase
        .from('prescriptions')
        .update({ 
          status: 'Filled',
          updated_at: new Date().toISOString()
        })
        .eq('id', prescriptionId);

      if (updateError) throw updateError;

      // Also try to create a fulfillment record if the table exists
      const { error: fulfillmentError } = await supabase
        .from('prescription_fulfillments')
        .insert({
          prescription_id: prescriptionId,
          fulfilled_by: profile.id,
          fulfilled_at: new Date().toISOString(),
          status: 'Filled',
        });

      if (fulfillmentError) {
        // Table might not exist yet, that's okay
        console.log('Prescription fulfillment table not found, using direct update only');
      }

      toast.success('Prescription marked as filled');
      loadData();
    } catch (error: any) {
      toast.error('Failed to update prescription status: ' + error.message);
    }
  }

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const matchesSearch = 
      prescription.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.visits?.patients?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.visits?.patients?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.visits?.patients?.medical_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // For now, we'll show all prescriptions as "pending" since we don't have a status field
    const matchesStatus = statusFilter === 'all' || statusFilter === 'pending';
    
    return matchesSearch && matchesStatus;
  });

  const printPrescription = (prescription: Prescription) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - ${prescription.visits?.patients?.first_name} ${prescription.visits?.patients?.last_name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .clinic-details {
            font-size: 14px;
            color: #666;
          }
          .prescription-title {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            text-decoration: underline;
          }
          .patient-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .info-label {
            font-weight: bold;
            color: #333;
          }
          .medication-details {
            background-color: #fff;
            border: 2px solid #333;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .medication-name {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 15px;
            text-align: center;
          }
          .dosage-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .dosage-item {
            text-align: center;
          }
          .dosage-label {
            font-weight: bold;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
          }
          .dosage-value {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-top: 5px;
          }
          .instructions {
            background-color: #f0f9ff;
            padding: 15px;
            border-left: 4px solid #2563eb;
            margin: 20px 0;
          }
          .instructions-title {
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: end;
          }
          .doctor-signature {
            text-align: center;
          }
          .signature-line {
            border-bottom: 1px solid #333;
            width: 200px;
            margin-bottom: 5px;
          }
          .date-section {
            text-align: right;
          }
          .print-date {
            font-size: 14px;
            color: #666;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">OpenMRS Pro Clinic</div>
          <div class="clinic-details">
            Professional Healthcare Management System<br>
            Phone: (555) 123-4567 | Email: info@clinic.com
          </div>
        </div>

        <div class="prescription-title">PRESCRIPTION</div>

        <div class="patient-info">
          <div class="info-row">
            <span class="info-label">Patient Name:</span>
            <span>${prescription.visits?.patients?.first_name} ${prescription.visits?.patients?.last_name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Medical ID:</span>
            <span>${prescription.visits?.patients?.medical_id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone:</span>
            <span>${prescription.visits?.patients?.phone || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Visit Date:</span>
            <span>${formatDisplayDate(prescription.visits?.visit_date)}</span>
          </div>
        </div>

        <div class="medication-details">
          <div class="medication-name">${prescription.medication_name}</div>
          <div class="dosage-info">
            <div class="dosage-item">
              <div class="dosage-label">Dosage</div>
              <div class="dosage-value">${prescription.dosage}</div>
            </div>
            <div class="dosage-item">
              <div class="dosage-label">Frequency</div>
              <div class="dosage-value">${prescription.frequency}</div>
            </div>
            <div class="dosage-item">
              <div class="dosage-label">Duration</div>
              <div class="dosage-value">${prescription.duration}</div>
            </div>
            <div class="dosage-item">
              <div class="dosage-label">Prescribed Date</div>
              <div class="dosage-value">${formatDisplayDate(prescription.created_at)}</div>
            </div>
          </div>
        </div>

        ${prescription.instructions ? `
        <div class="instructions">
          <div class="instructions-title">Special Instructions:</div>
          <div>${prescription.instructions}</div>
        </div>
        ` : ''}

        <div class="footer">
          <div class="doctor-signature">
            <div class="signature-line"></div>
            <div>Doctor's Signature</div>
          </div>
          <div class="date-section">
            <div class="print-date">Printed on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
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

  // Check if user has permission to view prescriptions (Pharmacist or Admin)
  if (profile.role !== 'Pharmacist' && profile.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">You don't have permission to view prescriptions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Prescription Management</h1>
        <p className="text-slate-600 mt-1">View and manage patient prescriptions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search prescriptions by medication, patient name, or medical ID..."
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
                <SelectItem value="all">All Prescriptions</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
              </SelectContent>
            </Select>
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
                <Card key={prescription.id} className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5 text-green-600" />
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
                          {prescription.visits?.patients?.phone && (
                            <div>
                              Phone: {prescription.visits.patients.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          <Clock className="h-4 w-4 mr-1" />
                          Pending
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {formatDisplayDate(prescription.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm font-medium text-slate-600">Dosage:</span>
                        <p className="text-slate-900 font-medium">{prescription.dosage}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-600">Frequency:</span>
                        <p className="text-slate-900 font-medium">{prescription.frequency}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-600">Duration:</span>
                        <p className="text-slate-900 font-medium">{prescription.duration}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-600">Visit Date:</span>
                        <p className="text-slate-900">
                          {formatDisplayDate(prescription.visits?.visit_date)}
                        </p>
                      </div>
                    </div>

                    {prescription.instructions && (
                      <div>
                        <span className="text-sm font-medium text-slate-600">Instructions:</span>
                        <p className="text-slate-700 mt-1 bg-slate-50 p-3 rounded-lg">
                          {prescription.instructions}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Badge variant={
                        prescription.status === 'Filled' ? 'default' :
                        prescription.status === 'Pending' ? 'outline' :
                        'secondary'
                      }>
                        {prescription.status || 'Pending'}
                      </Badge>
                      {(!prescription.status || prescription.status === 'Pending') && (
                        <Button
                          size="sm"
                          onClick={() => markPrescriptionFilled(prescription.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark as Filled
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => printPrescription(prescription)}
                      >
                        Print Prescription
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Pending Prescriptions</p>
                <p className="text-2xl font-bold text-slate-900">
                  {prescriptions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Filled Today</p>
                <p className="text-2xl font-bold text-slate-900">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Urgent Prescriptions</p>
                <p className="text-2xl font-bold text-slate-900">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
