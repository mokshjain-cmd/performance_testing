import React, { useState, useRef } from 'react';
import { Layout } from '../components/layout';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Clock, Target, TrendingUp, XCircle, MinusCircle, Image as ImageIcon, Award, PlayCircle, Activity } from 'lucide-react';
import axios from 'axios';

type ActiveTab = 'performance' | 'stability';

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

const STAGE_DETAILS = {
  understanding: [
    'Parsing Excel file structure...',
    'Identifying test case parameters...',
    'Validating data format...',
    'Mapping test scenarios...',
  ],
  setup: [
    'Initializing test environment...',
    'Configuring test parameters...',
    'Loading baseline data...',
    'Preparing test devices...',
  ],
  running: [
    'Executing test case 1 of 10...',
    'Executing test case 2 of 10...',
    'Executing test case 3 of 10...',
    'Processing test results...',
  ],
  logging: [
    'Recording test metrics...',
    'Capturing performance data...',
    'Generating test logs...',
    'Compiling results...',
  ],
  saving: [
    'Saving test results to database...',
    'Generating summary report...',
    'Finalizing data...',
    'Completing test run...',
  ],
};

const TestingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('performance');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<ProcessStage>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    // Auto-scroll to bottom
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
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
        addLog(`File selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);
      } else {
        setError('Please select a valid Excel or CSV file');
        setFile(null);
      }
    }
  };

  const simulateStageProgress = async (currentStage: keyof typeof STAGE_DETAILS) => {
    const details = STAGE_DETAILS[currentStage];
    for (const detail of details) {
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
      addLog(detail);
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
    setLogs([]);

    addLog('Starting test execution...');
    addLog(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const stages: Array<keyof typeof STAGE_DETAILS> = [
        'understanding',
        'setup',
        'running',
        'logging',
        'saving'
      ];
      
      addLog('Connecting to testing backend...');
      
      // Start the upload in the background
      const uploadPromise = axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Run through stages sequentially while upload is processing
      for (let i = 0; i < stages.length; i++) {
        const currentStage = stages[i];
        setStage(currentStage);
        addLog(`\n=== ${STAGE_MESSAGES[currentStage]} ===`);
        await simulateStageProgress(currentStage);
      }

      // Wait for the upload to complete
      const uploadResponse = await uploadPromise;

      addLog('\n✓ Results received from backend!');
      addLog('\n=== Test Completed Successfully ===');
      setStage('complete');
      setResult(uploadResponse.data);
      setUploading(false);

    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to upload file. Please try again.';
      addLog(`\n✗ Error: ${errorMsg}`);
      setStage('error');
      setError(errorMsg);
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStage('idle');
    setResult(null);
    setError('');
    setLogs([]);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Performance Testing
            </h1>
            <p className="text-gray-600 mt-2">Upload test data and execute automated performance tests</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'performance'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Upload size={20} />
              Performance Testing
            </span>
          </button>
          <button
            onClick={() => setActiveTab('stability')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'stability'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Activity size={20} />
              Stability Testing
            </span>
          </button>
        </div>

        {/* Performance Testing Tab Content */}
        {activeTab === 'performance' && (
          <>
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Test Data</h2>
          
          {stage === 'idle' || stage === 'complete' || stage === 'error' ? (
            <div className="space-y-4">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-pink-400 transition-colors bg-gradient-to-br from-pink-50/50 to-purple-50/50">
                <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-700 mb-2 font-medium">Drag & drop your test file or click to browse</p>
                <p className="text-sm text-gray-500 mb-4">Excel (.xlsx, .xls) or CSV files accepted</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className={`inline-block px-6 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 cursor-pointer transition-all shadow-md hover:shadow-lg font-medium ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Select File
                </label>
              </div>

              {/* Selected File Display */}
              {file && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="text-pink-600" size={24} />
                    <div>
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  {stage !== 'idle' && stage !== 'error' ? null : (
                    <button
                      onClick={handleReset}
                      className="text-pink-600 hover:text-pink-700 text-sm font-medium"
                      disabled={uploading}
                    >
                      Change
                    </button>
                  )}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* Upload Button */}
              {stage === 'idle' && (
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-md hover:shadow-lg text-lg"
                >
                  Start Testing
                </button>
              )}

              {/* Reset Button after completion */}
              {(stage === 'complete' || stage === 'error') && (
                <button
                  onClick={handleReset}
                  className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 font-semibold transition-all shadow-md hover:shadow-lg text-lg"
                >
                  Run Another Test
                </button>
              )}
            </div>
          ) : (
            /* Processing State */
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg">
                <Loader2 className="animate-spin text-pink-600 flex-shrink-0" size={24} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{STAGE_MESSAGES[stage as keyof typeof STAGE_MESSAGES]}</p>
                  <p className="text-sm text-gray-600">Please wait while we process your test...</p>
                </div>
              </div>

              {/* Progress Stages Indicator */}
              <div className="grid grid-cols-5 gap-2">
                {Object.keys(STAGE_MESSAGES).map((stageKey, index) => {
                  const stages = ['understanding', 'setup', 'running', 'logging', 'saving'];
                  const currentIndex = stages.indexOf(stage);
                  const stageIndex = index;
                  const isComplete = stageIndex < currentIndex;
                  const isCurrent = stage === stageKey;

                  return (
                    <div
                      key={stageKey}
                      className={`text-center p-2 rounded-lg transition-all ${
                        isCurrent
                          ? 'bg-pink-100 border-2 border-pink-400'
                          : isComplete
                          ? 'bg-green-100 border-2 border-green-400'
                          : 'bg-gray-100 border-2 border-gray-300'
                      }`}
                    >
                      <div className="flex justify-center mb-1">
                        {isComplete ? (
                          <CheckCircle2 className="text-green-600" size={18} />
                        ) : isCurrent ? (
                          <Loader2 className="animate-spin text-pink-600" size={18} />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {stageKey.charAt(0).toUpperCase() + stageKey.slice(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Logs Section */}
        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Test Execution Logs
            </h2>
            <div className="bg-black rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.includes('===') 
                      ? 'text-yellow-400 font-bold' 
                      : log.includes('✓') 
                      ? 'text-green-400' 
                      : log.includes('✗') || log.includes('Error')
                      ? 'text-red-400'
                      : 'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* Results Section */}
        {stage === 'complete' && result && result.data && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-green-600" size={40} />
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">Test Execution Complete!</h2>
                    <p className="text-gray-600 mt-1">
                      {result.data.output?.total_test_runs || 0} test run(s) completed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Cases Summary */}
            {result.data.output?.test_cases && result.data.output.test_cases.map((testCase: any, index: number) => (
              <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Test Case Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold">{testCase.test_case_id}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          testCase.status === 'completed' 
                            ? 'bg-green-500 text-white' 
                            : testCase.status === 'failed'
                            ? 'bg-red-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}>
                          {testCase.status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-blue-100 mt-2 text-sm">Test Type: <span className="font-semibold">{testCase.test_type}</span></p>
                      {testCase.objective && (
                        <p className="text-blue-50 mt-1 text-sm italic">"{testCase.objective}"</p>
                      )}
                    </div>
                    <div className="text-right ml-6">
                      <div className="flex items-center gap-2 justify-end text-blue-100">
                        <Clock size={20} />
                        <span className="text-sm">Execution Time</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{(testCase.execution_time_ms / 1000).toFixed(2)}s</p>
                    </div>
                  </div>
                </div>

                {/* Goals Status */}
                {testCase.goals && (
                  <div className="p-6 bg-gray-50">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Target size={20} className="text-purple-600" />
                      Goals Status
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(testCase.goals).map(([goalKey, goalValue]: [string, any]) => (
                        <div
                          key={goalKey}
                          className={`p-4 rounded-lg border-2 ${
                            goalValue === 'pending'
                              ? 'bg-yellow-50 border-yellow-300'
                              : goalValue === 'completed' || goalValue === 'passed'
                              ? 'bg-green-50 border-green-300'
                              : goalValue === 'failed'
                              ? 'bg-red-50 border-red-300'
                              : 'bg-gray-50 border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-600 uppercase">
                              {goalKey.replace(/_/g, ' ')}
                            </span>
                            {goalValue === 'pending' ? (
                              <MinusCircle size={16} className="text-yellow-600" />
                            ) : goalValue === 'completed' || goalValue === 'passed' ? (
                              <CheckCircle2 size={16} className="text-green-600" />
                            ) : goalValue === 'failed' ? (
                              <XCircle size={16} className="text-red-600" />
                            ) : null}
                          </div>
                          <p className="text-lg font-bold text-gray-800 capitalize">{goalValue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Detailed Logs */}
            {result.data.logs && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp size={24} />
                    Execution Steps Log
                  </h3>
                  <p className="text-blue-100 mt-1">
                    Test Case: {result.data.logs.test_case_id} • Total Steps: {result.data.logs.total_steps}
                  </p>
                </div>

                {/* Steps List */}
                <div className="p-6">
                  <div className="space-y-4">
                    {result.data.logs.steps?.map((step: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-l-4 ${
                          step.status === 'success'
                            ? 'bg-green-50 border-green-500'
                            : step.status === 'failed'
                            ? 'bg-red-50 border-red-500'
                            : step.status === 'running'
                            ? 'bg-blue-50 border-blue-500'
                            : 'bg-gray-50 border-gray-400'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-1 bg-gray-800 text-white text-xs font-bold rounded">
                                Step {step.step_number}
                              </span>
                              <h4 className="font-semibold text-gray-800">{step.step_name}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                step.status === 'success'
                                  ? 'bg-green-200 text-green-800'
                                  : step.status === 'failed'
                                  ? 'bg-red-200 text-red-800'
                                  : step.status === 'running'
                                  ? 'bg-blue-200 text-blue-800'
                                  : 'bg-gray-200 text-gray-800'
                              }`}>
                                {step.status}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm mb-2">{step.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(step.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="ml-4">
                            {step.status === 'success' ? (
                              <CheckCircle2 className="text-green-600" size={24} />
                            ) : step.status === 'failed' ? (
                              <XCircle className="text-red-600" size={24} />
                            ) : step.status === 'running' ? (
                              <Loader2 className="text-blue-600 animate-spin" size={24} />
                            ) : (
                              <MinusCircle className="text-gray-400" size={24} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Timeline */}
                <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
                  <h4 className="text-lg font-semibold text-gray-800 mb-6">Execution Timeline</h4>
                  <div className="relative">
                    {/* Main horizontal line */}
                    <div className="absolute top-6 left-0 right-0 h-1 bg-gray-300"></div>
                    
                    {/* Steps on timeline */}
                    <div className="relative flex justify-between items-start">
                      {result.data.logs.steps
                        ?.filter((step: any, index: number, arr: any[]) => 
                          // Only show unique step numbers
                          index === arr.findIndex(s => s.step_number === step.step_number && s.status !== 'running')
                        )
                        .map((step: any, index: number) => {
                          const stepTime = new Date(step.timestamp);
                          const firstStepTime = new Date(result.data.logs.steps[0].timestamp);
                          const lastStepTime = new Date(result.data.logs.steps[result.data.logs.steps.length - 1].timestamp);
                          const totalDuration = lastStepTime.getTime() - firstStepTime.getTime();
                          const stepOffset = ((stepTime.getTime() - firstStepTime.getTime()) / totalDuration) * 100;

                          return (
                            <div
                              key={index}
                              className="flex flex-col items-center"
                              style={{ 
                                position: 'absolute',
                                left: `${stepOffset}%`,
                                transform: 'translateX(-50%)'
                              }}
                            >
                              {/* Vertical line */}
                              <div className={`w-1 h-8 ${
                                step.status === 'success'
                                  ? 'bg-green-500'
                                  : step.status === 'failed'
                                  ? 'bg-red-500'
                                  : 'bg-blue-500'
                              }`}></div>
                              
                              {/* Circle node */}
                              <div className={`w-6 h-6 rounded-full border-4 ${
                                step.status === 'success'
                                  ? 'bg-green-500 border-green-300'
                                  : step.status === 'failed'
                                  ? 'bg-red-500 border-red-300'
                                  : 'bg-blue-500 border-blue-300'
                              } shadow-lg z-10`}></div>
                              
                              {/* Label */}
                              <div className="mt-8 text-center">
                                <p className="text-xs font-bold text-gray-700 whitespace-nowrap">
                                  Step {step.step_number}
                                </p>
                                <p className="text-xs text-gray-600 whitespace-nowrap max-w-24 overflow-hidden text-ellipsis">
                                  {step.step_name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {stepTime.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    
                    {/* Add padding for labels */}
                    <div className="h-32"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Images Gallery */}
            {result.data.output?.test_cases?.some((tc: any) => 
              tc.images && (tc.images.reference_image || (tc.images.input_images && tc.images.input_images.length > 0))
            ) && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <ImageIcon size={24} />
                    Test Reference Images
                  </h3>
                  <p className="text-purple-100 mt-1">
                    Input images captured during test execution for validation
                  </p>
                </div>

                <div className="p-6">
                  {result.data.output.test_cases.map((testCase: any, tcIndex: number) => {
                    console.log('Test Case Images:', testCase.images);
                    
                    if (!testCase.images) {
                      return null;
                    }
                    
                    const hasReferenceImage = testCase.images.reference_image;
                    const hasInputImages = testCase.images.input_images && testCase.images.input_images.length > 0;
                    
                    if (!hasReferenceImage && !hasInputImages) {
                      return null;
                    }
                    
                    return (
                      <div key={tcIndex} className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold text-sm">
                            {testCase.test_case_id}
                          </span>
                          <span className="text-gray-600 text-sm">
                            {hasReferenceImage && '1 reference image'}{hasReferenceImage && hasInputImages && ' • '}
                            {hasInputImages && `${testCase.images.input_images.length} test image(s)`}
                          </span>
                        </div>

                        {/* Reference Image Section */}
                        {hasReferenceImage && (
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                              Reference Image
                            </h4>
                            <div className="max-w-md">
                              <div className="group relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg overflow-hidden border-4 border-amber-300 hover:border-amber-500 transition-all hover:shadow-2xl">
                                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={testCase.images.reference_image}
                                    alt="Reference image"
                                    className="w-full h-full object-contain hover:scale-110 transition-transform duration-300"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="absolute top-2 left-2 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                  REFERENCE
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-white text-sm font-medium">Reference Image</p>
                                  <p className="text-gray-300 text-xs">Expected outcome baseline</p>
                                </div>
                                <button
                                  onClick={() => {
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <html>
                                          <head><title>Reference Image</title></head>
                                          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                            <img src="${testCase.images.reference_image}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                                          </body>
                                        </html>
                                      `);
                                    }
                                  }}
                                  className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Click to view full size"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 text-amber-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Test Images Grid */}
                        {hasInputImages && (
                          <>
                            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                              Test Execution Images
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {testCase.images.input_images.map((imagePath: string, imgIndex: number) => {
                            // Check if it's a base64 string or a file path
                            const isBase64 = imagePath.startsWith('data:image');
                            const imageFileName = imagePath.split('/').pop() || `Image ${imgIndex + 1}`;
                            
                            // Construct the image URL - if not base64, assume it's a path from backend
                            const imageUrl = isBase64 ? imagePath : `http://localhost:5000/${imagePath}`;
                            
                            return (
                              <div
                                key={imgIndex}
                                className="group relative bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-purple-400 transition-all hover:shadow-xl"
                              >
                                {/* Image */}
                                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={imageUrl}
                                    alt={`Test image ${imgIndex + 1}`}
                                    className="w-full h-full object-contain hover:scale-110 transition-transform duration-300"
                                    loading="lazy"
                                    onError={(e) => {
                                      // Fallback if image fails to load
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `
                                          <div class="flex flex-col items-center justify-center p-4 text-center">
                                            <svg class="text-gray-400 mb-2" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                              <polyline points="21 15 16 10 5 21"></polyline>
                                            </svg>
                                            <p class="text-xs text-gray-600 break-all">${imageFileName}</p>
                                            <p class="text-xs text-red-500 mt-1">Failed to load</p>
                                          </div>
                                        `;
                                      }
                                    }}
                                  />
                                </div>

                                {/* Image Info Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-white text-xs font-medium truncate" title={imageFileName}>
                                    {imageFileName}
                                  </p>
                                  <p className="text-gray-300 text-xs">Image {imgIndex + 1}</p>
                                </div>

                                {/* Click to expand indicator */}
                                <button
                                  onClick={() => {
                                    // Open image in new tab for full view
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <html>
                                          <head><title>${imageFileName}</title></head>
                                          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                            <img src="${imageUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                                          </body>
                                        </html>
                                      `);
                                    }
                                  }}
                                  className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Click to view full size"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 text-purple-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                                    />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                          </>
                        )}

                        {/* Reference Note */}
                        <div className="mt-6 p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
                          <p className="text-sm text-purple-900">
                            <span className="font-semibold">💡 Validation Reference:</span> The reference image (with amber border) 
                            shows the expected outcome baseline. The test execution images show the actual watch screen captures 
                            during the test. Compare these images to validate test results and identify any discrepancies.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}

        {/* Stability Testing Tab Content */}
        {activeTab === 'stability' && (
          <StabilityTestingDashboard />
        )}
      </div>
    </Layout>
  );
};

// Stability Testing Dashboard Component
const StabilityTestingDashboard: React.FC = () => {
  // Mock data
  const sessionData = {
    id: "session_20260321_001",
    name: "VALIDATION_SUITE • session_20260321_001",
    mode: "VALIDATION_SUITE",
    startedAt: new Date("2026-03-21T10:43:00Z"),
    endedAt: new Date("2026-03-21T10:45:35Z"),
    status: "Completed",
  };

  const summary = {
    suiteScore: 96,
    totalScenarios: 18,
    passedScenarios: 14,
    warnedScenarios: 2,
    failedScenarios: 1,
    blockedScenarios: 1,
    totalAssertions: 27,
    passedAssertions: 26,
    failedAssertions: 1,
    duration: "02:35",
  };

  const scenarioRuns = [
    { id: 1, name: "Connectivity  — Device Info", category: "connectivity", duration: "5s", status: "PASS" },
    { id: 2, name: "Connectivity — BLE Ping", category: "connectivity", duration: "4s", status: "PASS" },
    { id: 3, name: "Heart Rate Measurement", category: "vitals", duration: "31s", status: "PASS" },
    { id: 4, name: "SpO₂ Measurement", category: "vitals", duration: "26s", status: "PASS" },
    { id: 5, name: "Full Fitness Sync (safe)", category: "fitness", duration: "7s", status: "PASS" },
    { id: 6, name: "Fitness Sync Read-Only", category: "fitness", duration: "7s", status: "PASS" },
    { id: 7, name: "Step Count Validation", category: "fitness", duration: "5s", status: "PASS" },
    { id: 8, name: "Workout Records", category: "fitness", duration: "3s", status: "WARN" },
    { id: 9, name: "Health Data Binding", category: "fitness", duration: "2s", status: "BLOCKED" },
    { id: 10, name: "Sleep Summary Sync", category: "fitness", duration: "5s", status: "PASS" },
    { id: 11, name: "Setup — Pairing Flow", category: "setup", duration: "12s", status: "PASS" },
    { id: 12, name: "Setup — Clock Sync", category: "setup", duration: "5s", status: "PASS" },
    { id: 13, name: "Setup — Preferences", category: "setup", duration: "4s", status: "WARN" },
    { id: 14, name: "Workout — Start/Stop", category: "workout", duration: "16s", status: "PASS" },
    { id: 15, name: "Workout — GPS Lock", category: "workout", duration: "11s", status: "PASS" },
    { id: 16, name: "Workout — HR During", category: "workout", duration: "8s", status: "PASS" },
    { id: 17, name: "OTA Cancel Smoke", category: "ota", duration: "75s", status: "CANCELLED" },
    { id: 18, name: "OTA Version Check", category: "ota", duration: "6s", status: "PASS" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'bg-green-500';
      case 'WARN': return 'bg-orange-500';
      case 'FAIL': return 'bg-red-500';
      case 'BLOCKED': return 'bg-gray-500';
      case 'CANCELLED': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'text-green-700';
      case 'WARN': return 'text-orange-700';
      case 'FAIL': return 'text-red-700';
      case 'BLOCKED': return 'text-gray-700';
      case 'CANCELLED': return 'text-blue-700';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-800">{sessionData.name}</h2>
              <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
                {sessionData.status}
              </span>
            </div>
            <p className="text-gray-600 text-sm">
              {sessionData.startedAt.toLocaleString()} → {sessionData.endedAt.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg">
          <p className="text-gray-500 text-sm mb-2">Suite score</p>
          <p className="text-5xl font-bold text-gray-800">{summary.suiteScore}</p>
          <p className="text-gray-500 text-sm mt-2">out of 100</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg">
          <p className="text-gray-500 text-sm mb-2">Scenarios</p>
          <p className="text-5xl font-bold text-gray-800">{summary.totalScenarios}</p>
          <p className="text-gray-500 text-sm mt-2">total run</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg">
          <p className="text-gray-500 text-sm mb-2">Assertions</p>
          <p className="text-5xl font-bold text-gray-800">{summary.totalAssertions}</p>
          <p className="text-gray-500 text-sm mt-2">{summary.passedAssertions} passed / {summary.failedAssertions} failed</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg">
          <p className="text-gray-500 text-sm mb-2">Duration</p>
          <p className="text-5xl font-bold text-gray-800">{summary.duration}</p>
          <p className="text-gray-500 text-sm mt-2">elapsed</p>
        </div>
      </div>

      {/* Scenario Outcomes Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">SCENARIO OUTCOMES</h3>
        
        <div className="flex items-center gap-4 mb-6">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">{summary.passedScenarios} passed</span>
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-sm text-gray-700">{summary.warnedScenarios} warned</span>
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-700">{summary.failedScenarios} failed</span>
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-sm text-gray-700">{summary.blockedScenarios} blocked</span>
          </span>
        </div>

        {/* Donut Chart */}
        <div className="flex items-center justify-center">
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              <circle cx="50" cy="50" r="35" fill="none" stroke="#e5e7eb" strokeWidth="20" />
              {/* Green - Pass */}
              <circle
                cx="50" cy="50" r="35" fill="none"
                stroke="#22c55e"
                strokeWidth="20"
                strokeDasharray={`${(summary.passedScenarios / summary.totalScenarios) * 220} 220`}
                strokeDashoffset="0"
              />
              {/* Orange - Warn */}
              <circle
                cx="50" cy="50" r="35" fill="none"
                stroke="#f97316"
                strokeWidth="20"
                strokeDasharray={`${(summary.warnedScenarios / summary.totalScenarios) * 220} 220`}
                strokeDashoffset={`-${(summary.passedScenarios / summary.totalScenarios) * 220}`}
              />
              {/* Yellow - Between warn and fail */}
              <circle
                cx="50" cy="50" r="35" fill="none"
                stroke="#eab308"
                strokeWidth="20"
                strokeDasharray={`${0.5 * 220} 220`}
                strokeDashoffset={`-${((summary.passedScenarios + summary.warnedScenarios) / summary.totalScenarios) * 220}`}
              />
              {/* Red - Fail */}
              <circle
                cx="50" cy="50" r="35" fill="none"
                stroke="#ef4444"
                strokeWidth="20"
                strokeDasharray={`${(summary.failedScenarios / summary.totalScenarios) * 220} 220`}
                strokeDashoffset={`-${((summary.passedScenarios + summary.warnedScenarios + 0.5) / summary.totalScenarios) * 220}`}
              />
              {/* Gray - Blocked */}
              <circle
                cx="50" cy="50" r="35" fill="none"
                stroke="#6b7280"
                strokeWidth="20"
                strokeDasharray={`${(summary.blockedScenarios / summary.totalScenarios) * 220} 220`}
                strokeDashoffset={`-${((summary.passedScenarios + summary.warnedScenarios + summary.failedScenarios + 0.5) / summary.totalScenarios) * 220}`}
              />
            </svg>
          </div>
        </div>

        <div className="flex justify-center gap-6 mt-6 text-sm text-gray-700">
          <span>Pass ({summary.passedScenarios})</span>
          <span>Warn ({summary.warnedScenarios})</span>
          <span>Fail ({summary.failedScenarios})</span>
          <span>Blocked ({summary.blockedScenarios})</span>
        </div>
      </div>

      {/* All Scenario Runs */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">ALL SCENARIO RUNS</h3>
        
        <div className="space-y-3">
          {scenarioRuns.map((scenario) => (
            <div key={scenario.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800">{scenario.name}</h4>
                <p className="text-gray-600 text-sm">{scenario.category} • {scenario.duration}</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Progress bar */}
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${getStatusColor(scenario.status)}`} style={{ width: '100%' }}></div>
                </div>
                {/* Status badge */}
                <span className={`px-3 py-1 rounded text-xs font-bold min-w-[90px] text-center ${
                  scenario.status === 'PASS' ? 'bg-green-500 text-white' :
                  scenario.status === 'WARN' ? 'bg-orange-500 text-white' :
                  scenario.status === 'FAIL' ? 'bg-red-500 text-white' :
                  scenario.status === 'BLOCKED' ? 'bg-gray-500 text-white' :
                  'bg-blue-500 text-white'
                }`}>
                  {scenario.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestingPage;
