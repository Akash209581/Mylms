'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BulkQuestionImport from '@/components/BulkQuestionImport';

export default function AdminBulkImportPage() {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
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
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                Bulk Question Import
              </h1>
              <p className="mt-2 text-[var(--text-secondary)]">
                Import multiple questions at once using Excel or CSV files
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/admin/question-bank')}
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
