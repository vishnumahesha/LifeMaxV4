'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { User, ArrowRight, RefreshCw, Sparkles, Zap, Target, Ruler, Dumbbell } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { PhotoUpload } from '@/components/PhotoUpload';
import { BodyResultsUI } from '@/components/body/BodyResultsUI';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { BodyAnalysisResult } from '@/types/body';
import type { ApiResult } from '@/types/api';

const BODY_GUIDELINES = [
  'Full body visible in frame',
  'Stand naturally with arms at sides',
  'Form-fitting clothes work best',
  'Good lighting, plain background',
  'Both front and side view helps',
];

type PageState = 'upload' | 'analyzing' | 'results';

// Animated background orbs
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]" />
    </div>
  );
}

// Glowing upload card
function GlowingUploadCard({ 
  label, 
  description, 
  required, 
  onPhotoChange,
  glowColor = 'cyan'
}: { 
  label: string;
  description: string;
  required?: boolean;
  onPhotoChange: (base64: string | null) => void;
  glowColor?: 'cyan' | 'teal';
}) {
  const colors = {
    cyan: {
      border: 'border-cyan-500/30 hover:border-cyan-500/50',
      glow: 'hover:shadow-cyan-500/20',
    },
    teal: {
      border: 'border-teal-500/30 hover:border-teal-500/50',
      glow: 'hover:shadow-teal-500/20',
    }
  };
  const c = colors[glowColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-1 rounded-3xl bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 ${c.border} border transition-all duration-300 hover:shadow-2xl ${c.glow}`}
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      <div className="relative bg-zinc-900/80 rounded-[22px] p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">{label}</span>
          {required && <span className="text-cyan-400">*</span>}
        </div>
        <p className="text-xs text-zinc-500 mb-4">{description}</p>
        
        <PhotoUpload
          label=""
          required={required}
          onPhotoChange={onPhotoChange}
        />
      </div>
    </motion.div>
  );
}

export default function BodyAnalyzerContent() {
  const [pageState, setPageState] = useState<PageState>('upload');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [result, setResult] = useState<BodyAnalysisResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const handleAnalyze = async () => {
    if (!frontPhoto) {
      toast.error('Please upload a front-facing photo');
      return;
    }

    setPageState('analyzing');
    setAnalysisProgress(0);

    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const response = await fetch('/api/body/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontPhotoBase64: frontPhoto,
          sidePhotoBase64: sidePhoto || undefined,
        }),
      });

      const data: ApiResult<BodyAnalysisResult> = await response.json();

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (!data.ok) {
        toast.error(data.error.message);
        setPageState('upload');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      
      setResult(data.data);
      setPageState('results');

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Analysis error:', error);
      toast.error('Failed to analyze photo. Please try again.');
      setPageState('upload');
    }
  };

  const handleReset = () => {
    setPageState('upload');
    setFrontPhoto(null);
    setSidePhoto(null);
    setResult(null);
    setAnalysisProgress(0);
  };

  return (
    <ErrorBoundary>
      <AppShell>
        <BackgroundOrbs />
        <div className="relative min-h-screen px-4 py-8 pb-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <motion.div 
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-b from-cyan-500/30 to-cyan-500/10 border border-cyan-500/30 mb-6"
              animate={{ 
                boxShadow: ['0 0 30px rgba(6,182,212,0.3)', '0 0 50px rgba(6,182,212,0.5)', '0 0 30px rgba(6,182,212,0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <User className="w-10 h-10 text-cyan-400" />
            </motion.div>
            <h1 className="text-4xl font-bold text-white mb-3">
              Body Analyzer
            </h1>
            <p className="text-zinc-400 text-lg">
              {pageState === 'upload' && 'Get your body type & proportions analysis'}
              {pageState === 'analyzing' && 'AI is analyzing your physique...'}
              {pageState === 'results' && 'Your personalized analysis is ready'}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Upload State */}
            {pageState === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Upload Cards */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <GlowingUploadCard
                    label="Front Photo"
                    description="Stand facing the camera"
                    required
                    onPhotoChange={setFrontPhoto}
                    glowColor="cyan"
                  />
                  <GlowingUploadCard
                    label="Side Photo"
                    description="Optional - improves accuracy"
                    onPhotoChange={setSidePhoto}
                    glowColor="teal"
                  />
                </div>

                {/* Guidelines Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
                >
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                    📸 Photo Guidelines
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {BODY_GUIDELINES.map((guideline, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center gap-2 text-sm text-zinc-400"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {guideline}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Stats Input (Optional) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 bg-gradient-to-b from-zinc-900/80 to-zinc-900/50 border border-cyan-500/20 rounded-2xl"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Ruler className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-medium text-white">Optional Stats</span>
                    <span className="text-xs text-zinc-500">(improves accuracy)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Height</label>
                      <input
                        type="text"
                        placeholder="5'10&quot;"
                        className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Weight</label>
                      <input
                        type="text"
                        placeholder="170 lbs"
                        className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Age</label>
                      <input
                        type="text"
                        placeholder="25"
                        className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Analyze Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.button
                    onClick={handleAnalyze}
                    disabled={!frontPhoto}
                    whileHover={{ scale: 1.02, boxShadow: '0 0 50px rgba(6, 182, 212, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-cyan-600 to-teal-500 text-white text-lg font-semibold rounded-2xl shadow-xl shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Dumbbell className="w-6 h-6" />
                    Analyze My Body
                    <ArrowRight className="w-6 h-6" />
                  </motion.button>
                </motion.div>

                {/* Feature badges */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap justify-center gap-3"
                >
                  {['Kibbe Type', 'Proportions', 'Posture', 'Action Plan'].map((feature, i) => (
                    <span key={i} className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-full text-xs text-zinc-400">
                      💪 {feature}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Analyzing State */}
            {pageState === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="relative p-8 bg-zinc-900/50 border border-cyan-500/20 rounded-3xl overflow-hidden">
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-teal-500/5 to-cyan-500/5 animate-pulse" />
                  
                  <div className="relative flex flex-col items-center text-center">
                    {/* Spinning loader */}
                    <div className="relative w-32 h-32 mb-8">
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-cyan-500/20"
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{ filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.5))' }}
                      />
                      <motion.div
                        className="absolute inset-2 rounded-full border-4 border-transparent border-t-teal-500"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        style={{ filter: 'drop-shadow(0 0 10px rgba(20, 184, 166, 0.5))' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Dumbbell className="w-10 h-10 text-cyan-400 animate-pulse" />
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Analyzing Your Physique
                    </h3>
                    
                    {/* Progress bar */}
                    <div className="w-full max-w-md mb-6">
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${analysisProgress}%` }}
                          transition={{ duration: 0.3 }}
                          style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)' }}
                        />
                      </div>
                      <p className="text-sm text-zinc-500 mt-2">
                        {Math.round(analysisProgress)}% complete
                      </p>
                    </div>

                    {/* Analysis steps */}
                    <div className="space-y-3 text-left w-full max-w-sm">
                      {[
                        { label: 'Processing image quality', threshold: 10 },
                        { label: 'Detecting body landmarks', threshold: 30 },
                        { label: 'Analyzing proportions', threshold: 50 },
                        { label: 'Determining Kibbe type', threshold: 70 },
                        { label: 'Generating recommendations', threshold: 90 },
                      ].map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center gap-3 ${analysisProgress > step.threshold ? 'text-cyan-400' : 'text-zinc-500'}`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${analysisProgress > step.threshold ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800'}`}>
                            {analysisProgress > step.threshold ? '✓' : '○'}
                          </span>
                          {step.label}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Results State */}
            {pageState === 'results' && result && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <BodyResultsUI result={result} photoPreview={frontPhoto || undefined} />

                {/* Action Buttons */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-4 mt-8"
                >
                  <motion.button
                    onClick={handleReset}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl border border-zinc-700 transition-all"
                  >
                    <RefreshCw className="w-5 h-5" />
                    New Analysis
                  </motion.button>
                  <motion.button
                    onClick={() => window.location.href = '/action'}
                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    <Target className="w-5 h-5" />
                    Get Action Plan
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
    </ErrorBoundary>
  );
}
