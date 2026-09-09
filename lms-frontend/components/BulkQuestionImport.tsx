'use client'
import { API_URL } from '@/lib/api';

import React, { useState } from 'react';
import axios from 'axios';

interface BulkImportResponse {
  totalRows: number;
  successfullyInserted: number;
  failedRows: number;
  errorDetails: ErrorDetail[];
  uploadedBy?: string;
  timestamp: string;
}

interface ErrorDetail {
  rowNumber: number;
  reason: string;
  data?: {
    type?: string;
    topic?: string;
    questionText?: string;
  };
}

export default function BulkQuestionImport() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkImportResponse | null>(
    null,
  );
  const [showResultModal, setShowResultModal] = useState(false);

  const API_BASE_URL = API_URL;

  // Handle file drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  // Validate and set file
  const handleFileSelection = (selectedFile: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(selectedFile.type)) {
      alert('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
  };

  // Upload file
  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<BulkImportResponse>(
        `${API_BASE_URL}/question-bank/bulk-import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          withCredentials: true,
        },
      );

      setUploadResult(response.data);
      setShowResultModal(true);
    } catch (error: any) {
      alert(
        error.response?.data?.message ||
          'Failed to upload file. Please try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  // Download error report
  const handleDownloadErrorReport = async () => {
    if (!uploadResult || uploadResult.errorDetails.length === 0) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/question-bank/bulk-import/error-report`,
        { errorDetails: uploadResult.errorDetails },
        {
          responseType: 'blob',
          withCredentials: true,
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bulk_import_errors.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to download error report');
    }
  };

  // Reset upload
  const resetUpload = () => {
    setFile(null);
    setUploadResult(null);
    setShowResultModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-[var(--bg-surface)] rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">
          Bulk Question Import
        </h2>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>Prepare your Excel or CSV file with the required columns</li>
            <li>
              Supported question types: MCQ, FIB, MQ, JC, PQ, OP
            </li>
            <li>Maximum file size: 10MB</li>
            <li>Maximum rows per upload: 1000</li>
            <li>File format: Excel (.xlsx, .xls) or CSV</li>
          </ul>
        </div>

        {/* File Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
          />

          {!file ? (
            <>
              <div className="text-6xl mb-4">📄</div>
              <p className="text-[var(--text-secondary)] mb-2">
                Drag and drop your file here, or
              </p>
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
              >
                browse to upload
              </label>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                Excel (.xlsx, .xls) or CSV files only
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center space-x-4">
              <div className="text-4xl">📊</div>
              <div className="text-left">
                <p className="font-medium text-[var(--text-primary)]">{file.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="px-4 py-2 text-red-600 hover:text-red-800 font-medium"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {file && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`px-8 py-3 rounded-lg font-medium text-white transition-colors ${
                uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {uploading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                '🚀 Upload and Import'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Result Modal */}
      {showResultModal && uploadResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                  Import Results
                </h3>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">
                    Total Rows
                  </p>
                  <p className="text-3xl font-bold text-blue-900">
                    {uploadResult.totalRows}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 font-medium">Success</p>
                  <p className="text-3xl font-bold text-green-900">
                    {uploadResult.successfullyInserted}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-red-600 font-medium">Failed</p>
                  <p className="text-3xl font-bold text-red-900">
                    {uploadResult.failedRows}
                  </p>
                </div>
              </div>

              {/* Success Rate */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Success Rate
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {(
                      (uploadResult.successfullyInserted /
                        uploadResult.totalRows) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-green-600 h-4 rounded-full transition-all"
                    style={{
                      width: `${(uploadResult.successfullyInserted / uploadResult.totalRows) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Error Details */}
              {uploadResult.errorDetails.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-[var(--text-primary)] mb-3">
                    Error Details ({uploadResult.errorDetails.length} rows)
                  </h4>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-[var(--text-primary)]">
                            Row
                          </th>
                          <th className="text-left p-2 font-medium text-[var(--text-primary)]">
                            Type
                          </th>
                          <th className="text-left p-2 font-medium text-[var(--text-primary)]">
                            Error Reason
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.errorDetails.slice(0, 50).map((error, idx) => (
                          <tr
                            key={idx}
                            className="border-t hover:bg-gray-50"
                          >
                            <td className="p-2">{error.rowNumber}</td>
                            <td className="p-2">
                              {error.data?.type || 'N/A'}
                            </td>
                            <td className="p-2 text-red-600">
                              {error.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {uploadResult.errorDetails.length > 50 && (
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                      Showing first 50 errors. Download full report for all
                      errors.
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                {uploadResult.errorDetails.length > 0 && (
                  <button
                    onClick={handleDownloadErrorReport}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    📄 Download Error Report
                  </button>
                )}
                <button
                  onClick={resetUpload}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Import Another File
                </button>
                <button
                  onClick={() => setShowResultModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
