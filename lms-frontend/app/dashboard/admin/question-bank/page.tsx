import BulkQuestionImport from '@/components/BulkQuestionImport';

export default function AdminQuestionBankPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Question Bank Management</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Import questions in bulk using Excel or CSV files
          </p>
        </div>
        
        <BulkQuestionImport />
      </div>
    </div>
  );
}
