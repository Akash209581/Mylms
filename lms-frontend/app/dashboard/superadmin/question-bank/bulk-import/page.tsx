'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BulkQuestionImport from '@/components/BulkQuestionImport';

export default function SuperAdminBulkImportPage() {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Bulk Question Import
              </h1>
              <p className="mt-2 text-gray-600">
                Import multiple questions at once using Excel or CSV files
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/superadmin/question-bank')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to Question Bank
            </button>
          </div>
        </div>

        <BulkQuestionImport />
      </div>
    </div>
  );
}
