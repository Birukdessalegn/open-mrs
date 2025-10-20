'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function QueueTestPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    if (!authLoading && user && profile) {
      testQueueTables();
    }
  }, [authLoading, user, profile]);

  async function testQueueTables() {
    const results: any = {};

    try {
      // Test queue_types table
      const queueTypesResult = await supabase
        .from('queue_types')
        .select('*')
        .limit(5);
      
      results.queueTypes = {
        success: !queueTypesResult.error,
        error: queueTypesResult.error?.message,
        data: queueTypesResult.data,
        count: queueTypesResult.data?.length || 0
      };

      // Test queue_entries table
      const queueEntriesResult = await supabase
        .from('queue_entries')
        .select('*')
        .limit(5);
      
      results.queueEntries = {
        success: !queueEntriesResult.error,
        error: queueEntriesResult.error?.message,
        data: queueEntriesResult.data,
        count: queueEntriesResult.data?.length || 0
      };

      // Test patients table
      const patientsResult = await supabase
        .from('patients')
        .select('*')
        .limit(5);
      
      results.patients = {
        success: !patientsResult.error,
        error: patientsResult.error?.message,
        data: patientsResult.data,
        count: patientsResult.data?.length || 0
      };

      // Test appointments table
      const appointmentsResult = await supabase
        .from('appointments')
        .select('*')
        .limit(5);
      
      results.appointments = {
        success: !appointmentsResult.error,
        error: appointmentsResult.error?.message,
        data: appointmentsResult.data,
        count: appointmentsResult.data?.length || 0
      };

      // Test RPC functions
      try {
        const nextNumberResult = await supabase
          .rpc('get_next_queue_number', { queue_type_uuid: 'test' });
        
        results.getNextQueueNumber = {
          success: !nextNumberResult.error,
          error: nextNumberResult.error?.message,
          data: nextNumberResult.data
        };
      } catch (error: any) {
        results.getNextQueueNumber = {
          success: false,
          error: error.message
        };
      }

    } catch (error: any) {
      results.generalError = error.message;
    }

    setTestResults(results);
  }

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user || !profile) {
    return <div>Authentication required</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Queue Tables Test</h1>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">User Info:</h2>
          <p>Role: {profile.role}</p>
          <p>User ID: {user.id}</p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Test Results:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
        
        <button 
          onClick={testQueueTables}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Run Tests Again
        </button>
      </div>
    </div>
  );
}

