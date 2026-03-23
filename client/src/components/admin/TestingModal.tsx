import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '../../services/api';

interface TestingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProcessStage = 
  | 'idle'
  | 'understanding'
  | 'setup'
  | 'running'
  | 'logging'
  | 'saving'
  | 'complete'
  | 'error';

const STAGE_MESSAGES = {
  understanding: 'Understanding test cases...',
  setup: 'Setting up the testing environment...',
  running: 'Running the test cases...',
  logging: 'Logging the results...',
  saving: 'Saving test data...',
};

const TestingModal: React.FC<TestingModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<ProcessStage>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check if it's an Excel file
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (validTypes.includes(selectedFile.type) || 
          selectedFile.name.endsWith('.xlsx') || 
          selectedFile.name.endsWith('.xls') ||
          selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a valid Excel or CSV file');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setStage('understanding');
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate stage progression while uploading
      const stages: Array<'understanding' | 'setup' | 'running' | 'logging' | 'saving'> = [
        'understanding',
        'setup',
        'running',
        'logging',
        'saving'
      ];

      let currentStageIndex = 0;
      const stageInterval = setInterval(() => {
        currentStageIndex++;
        if (currentStageIndex < stages.length) {
          setStage(stages[currentStageIndex]);
        }
      }, 2000);

      // Send to backend
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(stageInterval);
      
      setStage('complete');
      setResult(response.data);
      setUploading(false);
    } catch (err: any) {
      clearInterval(stageInterval);
      setStage('error');
      setError(err.response?.data?.message || 'Failed to upload file. Please try again.');
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setStage('idle');
      setResult(null);
      setError('');
      onClose();
    }
  };

  const handleReset = () => {
    setFile(null);
    setStage('idle');
    setResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Performance Testing</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload Section */}
          {stage === 'idle' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600 mb-2">Upload your test data file</p>
                <p className="text-sm text-gray-400 mb-4">Excel (.xlsx, .xls) or CSV files accepted</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  Select File
                </label>
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-blue-600" size={20} />
                    <div>
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Change
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="text-red-600" size={20} />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
              >
                Start Testing
              </button>
            </div>
          )}

          {/* Processing Stages */}
          {uploading && stage !== 'idle' && stage !== 'complete' && stage !== 'error' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Processing Your Test...
                </h3>
                <p className="text-gray-600">
                  {STAGE_MESSAGES[stage as keyof typeof STAGE_MESSAGES]}
                </p>
              </div>

              {/* Progress Indicators */}
              <div className="space-y-3">
                {Object.entries(STAGE_MESSAGES).map(([stageKey, message]) => {
                  const stages = ['understanding', 'setup', 'running', 'logging', 'saving'];
                  const currentIndex = stages.indexOf(stage);
                  const stageIndex = stages.indexOf(stageKey);
                  const isComplete = stageIndex < currentIndex;
                  const isCurrent = stage === stageKey;

                  return (
                    <div
                      key={stageKey}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isCurrent
                          ? 'bg-blue-50 border border-blue-200'
                          : isComplete
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
                      ) : isCurrent ? (
                        <Loader2 className="animate-spin text-blue-600 flex-shrink-0" size={20} />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      )}
                      <span
                        className={`${
                          isCurrent
                            ? 'text-blue-700 font-medium'
                            : isComplete
                            ? 'text-green-700'
                            : 'text-gray-500'
                        }`}
                      >
                        {message}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Complete State */}
          {stage === 'complete' && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="text-green-600 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Testing Complete!
                </h3>
                <p className="text-gray-600">Your test results are ready</p>
              </div>

              {/* Results Display - Placeholder for now */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-2 font-medium">Test Results:</p>
                <pre className="text-xs text-gray-800 overflow-auto max-h-64">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all"
              >
                Run Another Test
              </button>
            </div>
          )}

          {/* Error State */}
          {stage === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="text-red-600 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Testing Failed
                </h3>
                <p className="text-red-600 text-center">{error}</p>
              </div>

              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestingModal;
