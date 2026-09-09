'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import BulkQuestionImport from '@/components/BulkQuestionImport';

export default function InstructorBulkImportPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(stored);
    const allowed = ['INSTRUCTOR', 'ADMIN', 'SUPERADMIN', 'QUESTION_CREATOR'];
    if (!allowed.includes(user.role)) {
      router.push('/login');
      return;
    }
    setUserRole(user.role);
  }, [router]);

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={userRole} />
      <Navbar title="Bulk Question Import" />
      <main className="page-content">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold role-text-primary">
                Bulk Question Import
              </h1>
              <p className="mt-1 role-text-muted">
                Import multiple questions at once using Excel or CSV files
              </p>
            </div>
            <button
              onClick={() => {
                const target = ['SUPERADMIN', 'ADMIN'].includes(userRole)
                  ? `/dashboard/${userRole.toLowerCase()}/question-bank`
                  : '/dashboard/instructor/question-bank';
                router.push(target);
              }}
              className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              ← Back to Question Bank
            </button>
          </div>

          <BulkQuestionImport />
        </div>
      </main>
    </div>
  );
}
