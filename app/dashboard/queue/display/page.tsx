'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type QueueType = Database['public']['Tables']['queue_types']['Row'];
type QueueEntry = Database['public']['Tables']['queue_entries']['Row'] & {
  queue_types: { name: string; color: string } | null;
  patients: { first_name: string; last_name: string; medical_id: string } | null;
};
type QueueDisplaySettings = Database['public']['Tables']['queue_display_settings']['Row'] & {
  queue_types: { name: string; color: string } | null;
};

export default function QueueDisplayPage() {
  const [queueTypes, setQueueTypes] = useState<QueueType[]>([]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [displaySettings, setDisplaySettings] = useState<QueueDisplaySettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadData();
    
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Refresh queue data every 30 seconds
    const refreshInterval = setInterval(() => {
      loadData();
    }, 30000);

    // Set up real-time updates
    const channel = supabase
      .channel('queue-display-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'queue_entries' },
        () => loadData()
      )
      .subscribe();

    return () => {
      clearInterval(timeInterval);
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
    try {
      const [queueTypesResult, queueEntriesResult, displaySettingsResult] = await Promise.all([
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
            patients(first_name, last_name, medical_id)
          `)
          .in('status', ['Waiting', 'In Progress'])
          .order('queue_number'),
        supabase
          .from('queue_display_settings')
          .select(`
            *,
            queue_types(name, color)
          `)
          .eq('active', true)
      ]);

      if (queueTypesResult.error) throw queueTypesResult.error;
      if (queueEntriesResult.error) throw queueEntriesResult.error;
      if (displaySettingsResult.error) throw displaySettingsResult.error;

      setQueueTypes(queueTypesResult.data || []);
      setQueueEntries(queueEntriesResult.data || []);
      setDisplaySettings(displaySettingsResult.data || []);
    } catch (error: any) {
      console.error('Failed to load queue display data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getCurrentQueueEntry = (queueTypeId: string) => {
    return queueEntries
      .filter(entry => entry.queue_type_id === queueTypeId && entry.status === 'In Progress')
      .sort((a, b) => a.queue_number - b.queue_number)[0];
  };

  const getNextQueueEntries = (queueTypeId: string, limit: number = 5) => {
    return queueEntries
      .filter(entry => entry.queue_type_id === queueTypeId && entry.status === 'Waiting')
      .sort((a, b) => a.queue_number - b.queue_number)
      .slice(0, limit);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Progress':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Waiting':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Healthcare Queue Display
        </h1>
        <div className="text-2xl font-mono text-blue-600">
          {format(currentTime, 'HH:mm:ss')}
        </div>
        <div className="text-lg text-slate-600">
          {format(currentTime, 'EEEE, MMMM do, yyyy')}
        </div>
      </div>

      {/* Queue Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {queueTypes.map((queueType) => {
          const currentEntry = getCurrentQueueEntry(queueType.id);
          const nextEntries = getNextQueueEntries(queueType.id, 5);
          const waitingCount = queueEntries.filter(entry => 
            entry.queue_type_id === queueType.id && entry.status === 'Waiting'
          ).length;
          const badgeColor = queueType.color || '#3b82f6';

          return (
            <Card key={queueType.id} className="shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded-full shadow-sm" 
                      style={{ backgroundColor: badgeColor }}
                    ></div>
                    <CardTitle className="text-xl">{queueType.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    <Users className="h-3 w-3 mr-1" />
                    {waitingCount} waiting
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Currently Serving */}
                {currentEntry ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">Currently Serving</span>
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      #{currentEntry.queue_number}
                    </div>
                    <div className="text-sm text-green-600">
                      {currentEntry.patients?.first_name} {currentEntry.patients?.last_name}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-gray-500 text-sm">No one currently being served</div>
                  </div>
                )}

                {/* Next in Queue */}
                {nextEntries.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="font-semibold text-slate-700">Next in Queue</span>
                    </div>
                    <div className="space-y-2">
                      {nextEntries.map((entry, index) => (
                        <div 
                          key={entry.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            index === 0 
                              ? 'bg-orange-50 border-orange-200' 
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`text-lg font-bold ${
                              index === 0 ? 'text-orange-600' : 'text-slate-600'
                            }`}>
                              #{entry.queue_number}
                            </div>
                            <div>
                              <div className={`font-medium ${
                                index === 0 ? 'text-orange-800' : 'text-slate-700'
                              }`}>
                                {entry.patients?.first_name} {entry.patients?.last_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {entry.patients?.medical_id}
                              </div>
                            </div>
                          </div>
                          {index === 0 && (
                            <Badge className="bg-orange-100 text-orange-800">
                              Next
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No one waiting */}
                {nextEntries.length === 0 && !currentEntry && (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                    <p>No patients in queue</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center mt-12 text-slate-500 text-sm">
        <p>Queue information updates automatically every 30 seconds</p>
        <p className="mt-1">Last updated: {format(currentTime, 'HH:mm:ss')}</p>
      </div>
    </div>
  );
}
