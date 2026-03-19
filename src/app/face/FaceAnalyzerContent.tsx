'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ScanFace, ArrowRight, RefreshCw, Sparkles, Camera, Upload, Zap, Target } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { PhotoUpload } from '@/components/PhotoUpload';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { FaceResultsUI } from '@/components/face/FaceResultsUI';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { FaceAnalysisResult } from '@/types/face';
import type { ApiResult } from '@/types/api';

const FACE_GUIDELINES = [
  'Good lighting (natural light is best)',
  'Face the camera directly',
  'No heavy filters or edits',
  'Hair away from face if possible',
  'Neutral expression works best',
];

type PageState = 'upload' | 'analyzing' | 'results';

// Animated background orbs
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[150px]" />
    </div>
  );
}

// Glowing upload card
function GlowingUploadCard({ 
  label, 
  description, 
  required, 
  guidelines, 
  onPhotoChange,
  icon: Icon,
  glowColor = 'purple'
}: { 
  label: string;
  description: string;
  required?: boolean;
  guidelines?: string[];
  onPhotoChange: (base64: string | null) => void;
  icon: any;
  glowColor?: 'purple' | 'pink';
}) {
  const colors = {
    purple: {
      border: 'border-purple-500/30 hover:border-purple-500/50',
      glow: 'hover:shadow-purple-500/20',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
    },
    pink: {
      border: 'border-pink-500/30 hover:border-pink-500/50',
      glow: 'hover:shadow-pink-500/20',
      iconBg: 'bg-pink-500/20',
      iconColor: 'text-pink-400',
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
          {required && <span className="text-purple-400">*</span>}
        </div>
        <p className="text-xs text-zinc-500 mb-4">{description}</p>
        
        <PhotoUpload
          label=""
          required={required}
          guidelines={guidelines}
          onPhotoChange={onPhotoChange}
        />
      </div>
    </motion.div>
  );
}

export default function FaceAnalyzerContent() {
  const [pageState, setPageState] = useState<PageState>('upload');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [result, setResult] = useState<FaceAnalysisResult | null>(null);
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
      const response = await fetch('/api/face/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontPhotoBase64: frontPhoto,
          sidePhotoBase64: sidePhoto || undefined,
        }),
      });

      const data: ApiResult<FaceAnalysisResult> = await response.json();

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
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-b from-purple-500/30 to-purple-500/10 border border-purple-500/30 mb-6"
              animate={{ 
                boxShadow: ['0 0 30px rgba(168,85,247,0.3)', '0 0 50px rgba(168,85,247,0.5)', '0 0 30px rgba(168,85,247,0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ScanFace className="w-10 h-10 text-purple-400" />
            </motion.div>
            <h1 className="text-4xl font-bold text-white mb-3">
              Face Analyzer
            </h1>
            <p className="text-zinc-400 text-lg">
              {pageState === 'upload' && 'Upload your photo to discover your potential'}
              {pageState === 'analyzing' && 'AI is analyzing your features...'}
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
                    description="Face the camera directly"
                    required
                    guidelines={FACE_GUIDELINES}
                    onPhotoChange={setFrontPhoto}
                    icon={Camera}
                    glowColor="purple"
                  />
                  <GlowingUploadCard
                    label="Side Photo"
                    description="Optional - improves accuracy"
                    onPhotoChange={setSidePhoto}
                    icon={Camera}
                    glowColor="pink"
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
                    {FACE_GUIDELINES.map((guideline, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center gap-2 text-sm text-zinc-400"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        {guideline}
                      </motion.div>
                    ))}
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
                    whileHover={{ scale: 1.02, boxShadow: '0 0 50px rgba(168, 85, 247, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-lg font-semibold rounded-2xl shadow-xl shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Zap className="w-6 h-6" />
                    Analyze My Face
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
                  {['Golden Ratio', 'Feature Scoring', 'Style Tips', 'Action Plan'].map((feature, i) => (
                    <span key={i} className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-full text-xs text-zinc-400">
                      ✨ {feature}
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
                <div className="relative p-8 bg-zinc-900/50 border border-purple-500/20 rounded-3xl overflow-hidden">
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 animate-pulse" />
                  
                  <div className="relative flex flex-col items-center text-center">
                    {/* Spinning loader */}
                    <div className="relative w-32 h-32 mb-8">
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-purple-500/20"
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{ filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.5))' }}
                      />
                      <motion.div
                        className="absolute inset-2 rounded-full border-4 border-transparent border-t-pink-500"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        style={{ filter: 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.5))' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Analyzing Your Features
                    </h3>
                    
                    {/* Progress bar */}
                    <div className="w-full max-w-md mb-6">
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${analysisProgress}%` }}
                          transition={{ duration: 0.3 }}
                          style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)' }}
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
                        { label: 'Detecting facial landmarks', threshold: 30 },
                        { label: 'Calculating golden ratio harmony', threshold: 50 },
                        { label: 'Analyzing features', threshold: 70 },
                        { label: 'Generating recommendations', threshold: 90 },
                      ].map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center gap-3 ${analysisProgress > step.threshold ? 'text-purple-400' : 'text-zinc-500'}`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${analysisProgress > step.threshold ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800'}`}>
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
                <FaceResultsUI result={result} photoPreview={frontPhoto || undefined} />

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
                    onClick={() => window.location.href = '/face/preview'}
                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/20 transition-all"
                  >
                    <Sparkles className="w-5 h-5" />
                    See Best Version
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
