'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  Wand2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  ImagePlus,
  Eye,
  Scissors,
  Timer,
  Check,
  Info,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { PhotoUpload } from '@/components/PhotoUpload';
import type { ApiResult } from '@/types/api';

type PageState = 'upload' | 'customize' | 'generating' | 'results';

// Enhancement level: 1 (subtle), 2 (moderate), 3 (strong realistic)
type EnhancementLevel = 1 | 2 | 3;

interface PreviewOptions {
  level: EnhancementLevel;
  hairstyle: {
    length: 'short' | 'medium' | 'long';
    finish: 'textured' | 'clean';
  };
  glasses: {
    enabled: boolean;
    style?: 'round' | 'rectangular' | 'browline' | 'aviator' | 'geometric';
  };
  grooming?: {
    facialHair?: 'none' | 'stubble' | 'trimmed';
    brows?: 'natural' | 'cleaned';
  };
  lighting?: 'neutral_soft' | 'studio_soft' | 'outdoor_shade';
}

interface HairstyleChip {
  label: string;
  preset: { length: 'short' | 'medium' | 'long'; finish: 'textured' | 'clean' };
  reason: string;
}

interface GlassesChip {
  label: string;
  preset: { style: 'round' | 'rectangular' | 'browline' | 'aviator' | 'geometric' };
  reason: string;
}

interface PreviewResult {
  images: Array<{ url: string; seed: number }>;
  disclaimers: string[];
  appliedChanges: string[];
  recommendedOptions: {
    hairstyleChips: HairstyleChip[];
    glassesChips: GlassesChip[];
  };
  reachability: {
    estimatedWeeks: { min: number; max: number };
    confidence: number;
    assumptions: string[];
  };
}

// Animated background
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-500/5 rounded-full blur-[150px]" />
    </div>
  );
}

// Enhancement Level Selector
function LevelSelector({ value, onChange }: { value: EnhancementLevel; onChange: (v: EnhancementLevel) => void }) {
  const levels = [
    { value: 1 as const, label: 'Subtle', desc: 'Same-day improvements', time: '0-2 weeks' },
    { value: 2 as const, label: 'Moderate', desc: 'Weeks of consistent effort', time: '4-12 weeks' },
    { value: 3 as const, label: 'Maximum', desc: 'Months of dedication', time: '8-20+ weeks' },
  ];

  return (
    <div className="mb-6">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
        <Sparkles className="w-4 h-4 text-pink-400" />
        Enhancement Level
      </label>
      <div className="grid grid-cols-3 gap-3">
        {levels.map((level) => (
          <button
            key={level.value}
            onClick={() => onChange(level.value)}
            className={`p-4 rounded-xl border transition-all text-left ${
              value === level.value
                ? 'bg-pink-500/20 border-pink-500 text-white'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            <div className="font-semibold mb-1">{level.label}</div>
            <div className="text-xs opacity-70">{level.desc}</div>
            <div className="text-xs mt-2 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {level.time}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Hairstyle Selector with recommendation chips
function HairstyleSelector({
  value,
  onChange,
  recommendedChips,
}: {
  value: { length: string; finish: string };
  onChange: (v: { length: 'short' | 'medium' | 'long'; finish: 'textured' | 'clean' }) => void;
  recommendedChips: HairstyleChip[];
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="mb-6">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
        <Scissors className="w-4 h-4 text-pink-400" />
        Hairstyle
      </label>

      {/* Recommended Chips */}
      {recommendedChips.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-zinc-500 mb-2">Recommended for your face shape:</div>
          <div className="flex flex-wrap gap-2">
            {recommendedChips.map((chip, i) => (
              <button
                key={i}
                onClick={() => onChange(chip.preset)}
                className={`px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                  value.length === chip.preset.length && value.finish === chip.preset.finish
                    ? 'bg-pink-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
                title={chip.reason}
              >
                {chip.label}
                {value.length === chip.preset.length && value.finish === chip.preset.finish && (
                  <Check className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Options Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-1 mt-2"
      >
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showAdvanced ? 'Hide options' : 'Custom options'}
      </button>

      {showAdvanced && (
        <div className="mt-3 p-4 bg-zinc-800/50 rounded-xl space-y-4">
          <div>
            <div className="text-xs text-zinc-500 mb-2">Length</div>
            <div className="flex gap-2">
              {(['short', 'medium', 'long'] as const).map((len) => (
                <button
                  key={len}
                  onClick={() => onChange({ ...value, length: len } as { length: 'short' | 'medium' | 'long'; finish: 'textured' | 'clean' })}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                    value.length === len ? 'bg-pink-500 text-white' : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-2">Finish</div>
            <div className="flex gap-2">
              {(['textured', 'clean'] as const).map((fin) => (
                <button
                  key={fin}
                  onClick={() => onChange({ ...value, finish: fin } as { length: 'short' | 'medium' | 'long'; finish: 'textured' | 'clean' })}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                    value.finish === fin ? 'bg-pink-500 text-white' : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {fin}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Glasses Selector
type GlassesStyle = 'round' | 'rectangular' | 'browline' | 'aviator' | 'geometric';

function GlassesSelector({
  value,
  onChange,
  recommendedChips,
}: {
  value: { enabled: boolean; style?: GlassesStyle };
  onChange: (v: { enabled: boolean; style?: GlassesStyle }) => void;
  recommendedChips: GlassesChip[];
}) {
  return (
    <div className="mb-6">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
        <Eye className="w-4 h-4 text-pink-400" />
        Glasses
      </label>

      {/* Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => onChange({ enabled: false })}
          className={`px-4 py-2 rounded-lg text-sm ${
            !value.enabled ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          None
        </button>
        <button
          onClick={() => onChange({ enabled: true, style: value.style || 'rectangular' })}
          className={`px-4 py-2 rounded-lg text-sm ${
            value.enabled ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          Add Glasses
        </button>
      </div>

      {/* Style options when enabled */}
      {value.enabled && (
        <div className="p-4 bg-zinc-800/50 rounded-xl">
          {recommendedChips.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-zinc-500 mb-2">Recommended frames:</div>
              <div className="flex flex-wrap gap-2">
                {recommendedChips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => onChange({ enabled: true, style: chip.preset.style })}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      value.style === chip.preset.style
                        ? 'bg-pink-500 text-white'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                    }`}
                    title={chip.reason}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="text-xs text-zinc-500 mb-2">All styles:</div>
          <div className="flex flex-wrap gap-2">
            {(['round', 'rectangular', 'browline', 'aviator', 'geometric'] as const).map((style) => (
              <button
                key={style}
                onClick={() => onChange({ enabled: true, style })}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                  value.style === style ? 'bg-pink-500 text-white' : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Reachability Display
function ReachabilityCard({
  reachability,
}: {
  reachability: PreviewResult['reachability'];
}) {
  const [expanded, setExpanded] = useState(false);
  const confidenceLabel =
    reachability.confidence >= 0.7 ? 'High' : reachability.confidence >= 0.5 ? 'Medium' : 'Low';
  const confidenceColor =
    reachability.confidence >= 0.7 ? 'text-green-400' : reachability.confidence >= 0.5 ? 'text-yellow-400' : 'text-orange-400';

  return (
    <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-white flex items-center gap-2">
          <Timer className="w-4 h-4 text-pink-400" />
          Time to Reach This Look
        </h4>
        <span className={`text-sm ${confidenceColor}`}>{confidenceLabel} confidence</span>
      </div>

      <div className="text-2xl font-bold text-pink-400 mb-2">
        {reachability.estimatedWeeks.min === reachability.estimatedWeeks.max
          ? `~${reachability.estimatedWeeks.min} weeks`
          : `${reachability.estimatedWeeks.min}-${reachability.estimatedWeeks.max} weeks`}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-1"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide assumptions' : 'View assumptions'}
      </button>

      {expanded && (
        <ul className="mt-3 space-y-1">
          {reachability.assumptions.map((assumption, i) => (
            <li key={i} className="text-xs text-zinc-500 flex items-start gap-2">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {assumption}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Main Component
export default function BestVersionContent() {
  const [pageState, setPageState] = useState<PageState>('upload');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sidePhotoPreview, setSidePhotoPreview] = useState<string | null>(null);
  const [faceScanData, setFaceScanData] = useState<{ faceShape?: string; faceShapeConfidence?: number } | null>(null);

  const [options, setOptions] = useState<PreviewOptions>({
    level: 2,
    hairstyle: { length: 'short', finish: 'textured' },
    glasses: { enabled: false },
    grooming: { brows: 'natural' },
    lighting: 'neutral_soft',
  });

  const [result, setResult] = useState<PreviewResult | null>(null);
  const [recommendedChips, setRecommendedChips] = useState<{
    hairstyleChips: HairstyleChip[];
    glassesChips: GlassesChip[];
  }>({ hairstyleChips: [], glassesChips: [] });

  // Load face scan data from localStorage if available
  useEffect(() => {
    const savedScan = localStorage.getItem('lastFaceScan');
    if (savedScan) {
      try {
        const data = JSON.parse(savedScan);
        setFaceScanData({
          faceShape: data.faceShape?.label,
          faceShapeConfidence: data.faceShape?.confidence,
        });
        // Set recommended defaults
        if (data.stylingRecommendations?.haircuts) {
          // Could pre-populate from scan data
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handlePhotoChange = (base64: string | null) => {
    setPhotoPreview(base64);
    if (base64) {
      setPageState('customize');
    }
  };

  const handleGenerate = async () => {
    if (!photoPreview) {
      toast.error('Please upload a photo first');
      return;
    }

    setPageState('generating');

    try {
      // Build request body, omitting undefined/null values
      const requestBody: Record<string, unknown> = {
        frontPhotoBase64: photoPreview,
        options: {
          level: options.level,
          hairstyle: options.hairstyle,
          glasses: options.glasses,
          grooming: options.grooming,
          lighting: options.lighting,
        },
      };

      // Only include optional fields if they have values
      if (sidePhotoPreview) {
        requestBody.sidePhotoBase64 = sidePhotoPreview;
      }
      if (faceScanData?.faceShape) {
        requestBody.faceShape = faceScanData.faceShape;
        requestBody.faceShapeConfidence = faceScanData.faceShapeConfidence || 0.7;
      }

      // Add timeout to fetch request (65 seconds - slightly longer than API timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);

      const response = await fetch('/api/face/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle rate limit specifically
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Rate limit reached. Please wait 1-2 minutes and try again.');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data: ApiResult<PreviewResult> = await response.json();

      if (!data.ok) {
        // Check if it's a rate limit error
        if (data.error?.code === 'RATE_LIMITED' || data.error?.message?.includes('rate limit')) {
          throw new Error('Rate limit reached. Please wait 1-2 minutes before trying again. Free tier has limited requests per minute.');
        }
        throw new Error(data.error.message);
      }

      console.log('Preview result:', {
        hasImages: !!data.data.images,
        imageCount: data.data.images?.length || 0,
        firstImageUrl: data.data.images?.[0]?.url ? 'exists' : 'missing',
        urlLength: data.data.images?.[0]?.url?.length || 0,
      });

      setResult(data.data);
      setRecommendedChips(data.data.recommendedOptions);
      setPageState('results');
      
      if (data.data.images && data.data.images.length > 0 && data.data.images[0]?.url) {
        toast.success('Preview generated successfully!');
      } else {
        toast.warning('Preview generated, but image enhancement unavailable. Showing recommendations only.');
      }
    } catch (err) {
      console.error('Generation error:', err);
      let errorMessage = 'Failed to generate preview';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again with a smaller image or check your connection.';
        } else if (err.message.includes('429') || err.message.includes('rate limit') || err.message.includes('Rate limit')) {
          errorMessage = '⚠️ Rate limit reached! Please wait 2-3 minutes before trying again. The free Replicate tier has limited requests per minute.';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage, {
        duration: 5000, // Show for 5 seconds
      });
      setPageState('customize');
    }
  };

  const handleReset = () => {
    setPageState('upload');
    setPhotoPreview(null);
    setSidePhotoPreview(null);
    setResult(null);
  };

  return (
    <AppShell>
      <BackgroundOrbs />

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full mb-4"
          >
            <Wand2 className="w-4 h-4 text-pink-400" />
            <span className="text-sm text-pink-400">Identity-Preserving Preview</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Best Version</h1>
          <p className="text-zinc-400">Get a personalized glow-up plan with realistic timelines</p>
        </div>

        <AnimatePresence mode="wait">
          {/* Upload State */}
          {pageState === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PhotoUpload
                label="Upload Your Photo"
                description="Front-facing photo for best results"
                onPhotoChange={handlePhotoChange}
                required
                guidelines={[
                  'Face the camera directly',
                  'Good, even lighting',
                  'Neutral expression',
                  'No heavy filters',
                ]}
              />
            </motion.div>
          )}

          {/* Customize State */}
          {pageState === 'customize' && (
            <motion.div
              key="customize"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Photo Preview */}
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-pink-500/30 relative">
                  {photoPreview && (
                    <Image src={photoPreview} alt="Your photo" fill className="object-cover" unoptimized />
                  )}
                </div>
              </div>

              <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-6">Customize Your Preview</h2>

                {/* Enhancement Level */}
                <LevelSelector value={options.level} onChange={(v) => setOptions({ ...options, level: v })} />

                {/* Hairstyle */}
                <HairstyleSelector
                  value={options.hairstyle}
                  onChange={(v) => setOptions({ ...options, hairstyle: v })}
                  recommendedChips={recommendedChips.hairstyleChips}
                />

                {/* Glasses */}
                <GlassesSelector
                  value={options.glasses}
                  onChange={(v) => setOptions({ ...options, glasses: v })}
                  recommendedChips={recommendedChips.glassesChips}
                />

                {/* Grooming */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-zinc-400 mb-3 block">Grooming</label>
                  <div className="flex flex-wrap gap-2">
                    {(['natural', 'cleaned'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setOptions({ ...options, grooming: { ...options.grooming, brows: opt } })}
                        className={`px-4 py-2 rounded-lg text-sm capitalize ${
                          options.grooming?.brows === opt
                            ? 'bg-pink-500 text-white'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {opt === 'natural' ? 'Natural brows' : 'Tidied brows'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Identity Disclaimer */}
                <div className="p-4 bg-zinc-800/50 rounded-xl mb-6 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-zinc-400">
                    <strong className="text-white">Identity-preserving:</strong> This preview will NOT change
                    bone structure, jaw, nose, or eye shape. Only modifiable factors like hair, grooming,
                    glasses, and lighting.
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setPageState('upload')}
                    className="px-6 py-3 bg-zinc-800 text-white rounded-xl flex items-center gap-2 hover:bg-zinc-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90"
                  >
                    Generate Preview
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Generating State */}
          {pageState === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-pink-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-pink-500 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Generating Your Best Version</h3>
              <p className="text-sm text-zinc-400 mb-4">Applying enhancements: leaner face, striking eyes, smooth skin, enhanced brows & hair, professional lighting...</p>
              <p className="text-xs text-zinc-500">This may take 30-60 seconds for best results</p>
              <p className="text-zinc-400 text-sm">Preserving your identity while applying improvements...</p>
            </motion.div>
          )}

          {/* Results State */}
          {pageState === 'results' && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Before/After Comparison */}
              <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  Your Best Version Preview
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-sm text-zinc-500 mb-2">Current</div>
                    <div className="aspect-square rounded-xl overflow-hidden border border-zinc-700 relative">
                      {photoPreview && (
                        <Image src={photoPreview} alt="Current" fill className="object-cover" unoptimized />
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-pink-400 mb-2">Best Version</div>
                    <div className="aspect-square rounded-xl overflow-hidden border border-pink-500/30 bg-zinc-800 relative">
                      {result.images[0]?.url ? (
                        <Image
                          src={result.images[0].url.startsWith('data:') ? result.images[0].url : `data:image/png;base64,${result.images[0].url}`}
                          alt="Best Version"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 p-4">
                          <Sparkles className="w-8 h-8 mb-2 text-pink-400" />
                          <p className="text-sm text-center">Preview generated - see your improvement plan below</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Time Estimate */}
                <div className="p-4 bg-black/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <Timer className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-pink-400">
                        {result.reachability.estimatedWeeks.min === result.reachability.estimatedWeeks.max
                          ? `~${result.reachability.estimatedWeeks.min} weeks`
                          : `${result.reachability.estimatedWeeks.min}-${result.reachability.estimatedWeeks.max} weeks`}
                      </div>
                      <div className="text-xs text-zinc-500">to achieve this look</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    result.reachability.confidence >= 0.7 
                      ? 'bg-green-500/20 text-green-400' 
                      : result.reachability.confidence >= 0.5 
                        ? 'bg-yellow-500/20 text-yellow-400' 
                        : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {result.reachability.confidence >= 0.7 ? 'High' : result.reachability.confidence >= 0.5 ? 'Medium' : 'Low'} confidence
                  </div>
                </div>
              </div>

              {/* What Changed */}
              <div className="p-6 bg-gradient-to-br from-zinc-900/80 to-pink-900/20 border border-pink-500/20 rounded-2xl">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-pink-400" />
                  Changes Applied (Modifiable Only)
                </h3>
                <div className="grid gap-3">
                  {result.appliedChanges.map((change, i) => {
                    const [title, description] = change.split(':');
                    const icons: Record<string, string> = {
                      'Hair': '💇',
                      'Hairstyle': '💇',
                      'Skin': '✨',
                      'Grooming': '🪒',
                      'Glasses': '👓',
                      'Lighting': '💡',
                      'Eyebrows': '🪒',
                    };
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-3 bg-zinc-800/50 rounded-xl flex items-center gap-3"
                      >
                        <span className="text-xl">{icons[title] || '✓'}</span>
                        <div className="flex-1">
                          <span className="text-white font-medium">{title}</span>
                          {description && <span className="text-zinc-400 ml-1">- {description.trim()}</span>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Identity Guarantee */}
              <div className="p-4 bg-pink-500/5 border border-pink-500/10 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-zinc-400">
                  <strong className="text-white">Same You, Better Presentation:</strong> No bone structure, face shape, or feature changes. 
                  Only hair, grooming, and lighting - things you can actually change.
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setPageState('customize')}
                  className="px-6 py-3 bg-zinc-800 text-white rounded-xl flex items-center gap-2 hover:bg-zinc-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Different Options
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-zinc-800 text-white rounded-xl flex items-center gap-2 hover:bg-zinc-700"
                >
                  <ImagePlus className="w-4 h-4" />
                  New Photo
                </button>
                {result.images[0]?.url && (
                  <a
                    href={result.images[0].url.startsWith('data:') ? result.images[0].url : `data:image/png;base64,${result.images[0].url}`}
                    download="best-version.png"
                    className="px-6 py-3 bg-pink-500 text-white rounded-xl flex items-center gap-2 hover:bg-pink-600"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
