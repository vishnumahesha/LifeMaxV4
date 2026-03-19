'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  Dumbbell,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  ImagePlus,
  Timer,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  Shirt,
  Activity,
  Target,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { PhotoUpload } from '@/components/PhotoUpload';
import type { ApiResult } from '@/types/api';

type PageState = 'upload' | 'customize' | 'generating' | 'results';
type EnhancementLevel = 1 | 2 | 3;

interface BodyPreviewOptions {
  level: EnhancementLevel;
  goal: 'get_leaner' | 'build_muscle' | 'balanced';
  outfit: 'fitted_basics' | 'athleisure' | 'smart_casual' | 'formal';
  postureFocus?: 'neutral' | 'improve_posture';
  variations?: 1 | 2 | 3;
}

interface OutfitChip {
  label: string;
  preset: { outfit: 'fitted_basics' | 'athleisure' | 'smart_casual' | 'formal' };
  reason: string;
}

interface BodyPreviewResult {
  images: Array<{ url: string; seed: number }>;
  disclaimers: string[];
  appliedChanges: string[];
  recommendedOutfits: OutfitChip[];
  silhouetteTips: string[];
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
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]" />
    </div>
  );
}

// Enhancement Level Selector
function LevelSelector({ value, onChange }: { value: EnhancementLevel; onChange: (v: EnhancementLevel) => void }) {
  const levels = [
    { value: 1 as const, label: 'Presentation', desc: 'Posture + outfit + lighting', time: '0-2 weeks' },
    { value: 2 as const, label: 'Moderate', desc: 'Light recomposition preview', time: '8-16 weeks' },
    { value: 3 as const, label: 'Significant', desc: 'Realistic transformation', time: '12-40 weeks' },
  ];

  return (
    <div className="mb-6">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        Enhancement Level
      </label>
      <div className="grid grid-cols-3 gap-3">
        {levels.map((level) => (
          <button
            key={level.value}
            onClick={() => onChange(level.value)}
            className={`p-4 rounded-xl border transition-all text-left ${
              value === level.value
                ? 'bg-cyan-500/20 border-cyan-500 text-white'
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

// Goal Selector
function GoalSelector({ value, onChange }: { value: string; onChange: (v: 'get_leaner' | 'build_muscle' | 'balanced') => void }) {
  const goals = [
    { value: 'get_leaner' as const, label: 'Get Leaner', desc: 'Focus on fat loss', icon: Activity },
    { value: 'build_muscle' as const, label: 'Build Muscle', desc: 'Focus on muscle gain', icon: Dumbbell },
    { value: 'balanced' as const, label: 'Balanced', desc: 'Recomposition', icon: Target },
  ];

  return (
    <div className="mb-6">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
        <Target className="w-4 h-4 text-cyan-400" />
        Composition Goal
      </label>
      <div className="grid grid-cols-3 gap-3">
        {goals.map((goal) => {
          const Icon = goal.icon;
          return (
            <button
              key={goal.value}
              onClick={() => onChange(goal.value)}
              className={`p-4 rounded-xl border transition-all ${
                value === goal.value
                  ? 'bg-cyan-500/20 border-cyan-500 text-white'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${value === goal.value ? 'text-cyan-400' : ''}`} />
              <div className="font-semibold text-sm">{goal.label}</div>
              <div className="text-xs opacity-70 mt-1">{goal.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Outfit Selector
function OutfitSelector({
  value,
  onChange,
  recommendedChips,
}: {
  value: string;
  onChange: (v: 'fitted_basics' | 'athleisure' | 'smart_casual' | 'formal') => void;
  recommendedChips: OutfitChip[];
}) {
  const outfits = [
    { value: 'fitted_basics' as const, label: 'Fitted Basics' },
    { value: 'athleisure' as const, label: 'Athleisure' },
    { value: 'smart_casual' as const, label: 'Smart Casual' },
    { value: 'formal' as const, label: 'Formal' },
  ];

  return (
    <div className="mb-6">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-3">
        <Shirt className="w-4 h-4 text-cyan-400" />
        Outfit Style
      </label>

      {/* Recommended based on Kibbe */}
      {recommendedChips.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-zinc-500 mb-2">Recommended for your body type:</div>
          <div className="flex flex-wrap gap-2">
            {recommendedChips.map((chip, i) => (
              <button
                key={i}
                onClick={() => onChange(chip.preset.outfit)}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  value === chip.preset.outfit
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
                title={chip.reason}
              >
                {chip.label}
                {value === chip.preset.outfit && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {outfits.map((outfit) => (
          <button
            key={outfit.value}
            onClick={() => onChange(outfit.value)}
            className={`px-4 py-2 rounded-lg text-sm ${
              value === outfit.value
                ? 'bg-cyan-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {outfit.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Reachability Display
function ReachabilityCard({ reachability }: { reachability: BodyPreviewResult['reachability'] }) {
  const [expanded, setExpanded] = useState(false);
  const confidenceLabel =
    reachability.confidence >= 0.7 ? 'High' : reachability.confidence >= 0.5 ? 'Medium' : 'Low';
  const confidenceColor =
    reachability.confidence >= 0.7 ? 'text-green-400' : reachability.confidence >= 0.5 ? 'text-yellow-400' : 'text-orange-400';

  return (
    <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-white flex items-center gap-2">
          <Timer className="w-4 h-4 text-cyan-400" />
          Time to Reach This Look
        </h4>
        <span className={`text-sm ${confidenceColor}`}>{confidenceLabel} confidence</span>
      </div>

      <div className="text-2xl font-bold text-cyan-400 mb-2">
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
export default function BodyPreviewContent() {
  const [pageState, setPageState] = useState<PageState>('upload');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sidePhotoPreview, setSidePhotoPreview] = useState<string | null>(null);
  const [bodyScanData, setBodyScanData] = useState<{ kibbeType?: string; kibbeConfidence?: number } | null>(null);

  const [options, setOptions] = useState<BodyPreviewOptions>({
    level: 2,
    goal: 'balanced',
    outfit: 'fitted_basics',
    postureFocus: 'improve_posture',
    variations: 1,
  });

  const [result, setResult] = useState<BodyPreviewResult | null>(null);
  const [recommendedOutfits, setRecommendedOutfits] = useState<OutfitChip[]>([]);

  // Load body scan data from localStorage if available
  useEffect(() => {
    const savedScan = localStorage.getItem('lastBodyScan');
    if (savedScan) {
      try {
        const data = JSON.parse(savedScan);
        setBodyScanData({
          kibbeType: data.kibbe?.primaryType,
          kibbeConfidence: data.kibbe?.probabilities?.[0]?.probability,
        });
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

  const handleSidePhotoChange = (base64: string | null) => {
    setSidePhotoPreview(base64);
  };

  const handleGenerate = async () => {
    if (!photoPreview) {
      toast.error('Please upload a photo first');
      return;
    }

    setPageState('generating');

    try {
      const response = await fetch('/api/body/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontPhotoBase64: photoPreview,
          sidePhotoBase64: sidePhotoPreview,
          kibbeType: bodyScanData?.kibbeType,
          kibbeConfidence: bodyScanData?.kibbeConfidence,
          options,
        }),
      });

      const data: ApiResult<BodyPreviewResult> = await response.json();

      if (!data.ok) {
        throw new Error(data.error.message);
      }

      setResult(data.data);
      setRecommendedOutfits(data.data.recommendedOutfits);
      setPageState('results');
      toast.success('Preview generated!');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate preview');
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4"
          >
            <Dumbbell className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-400">Body Best Version</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Best Physique</h1>
          <p className="text-zinc-400">See a realistic preview of achievable body improvements</p>
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
                label="Upload Full Body Photo"
                description="Front-facing, head-to-feet photo"
                onPhotoChange={handlePhotoChange}
                required
                guidelines={[
                  'Full body visible (head to feet)',
                  'Stand facing camera directly',
                  'Well-fitted clothing works best',
                  'Good lighting, neutral background',
                ]}
              />

              {/* Optional Side Photo */}
              <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Optional: Add Side Photo</h3>
                <p className="text-xs text-zinc-500 mb-3">
                  A side view helps with posture analysis and more accurate recommendations.
                </p>
                <PhotoUpload
                  label="Side View (Optional)"
                  description="Profile view for posture analysis"
                  onPhotoChange={handleSidePhotoChange}
                  guidelines={['True side profile', 'Arms relaxed at sides']}
                />
              </div>
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
              <div className="flex justify-center gap-4 mb-6">
                <div className="w-24 h-32 rounded-xl overflow-hidden border-2 border-cyan-500/30 relative">
                  {photoPreview && (
                    <Image src={photoPreview} alt="Front" fill className="object-cover" unoptimized />
                  )}
                </div>
                {sidePhotoPreview && (
                  <div className="w-24 h-32 rounded-xl overflow-hidden border-2 border-zinc-700 relative">
                    <Image src={sidePhotoPreview} alt="Side" fill className="object-cover" unoptimized />
                  </div>
                )}
              </div>

              <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-6">Customize Your Preview</h2>

                {/* Enhancement Level */}
                <LevelSelector value={options.level} onChange={(v) => setOptions({ ...options, level: v })} />

                {/* Goal */}
                <GoalSelector value={options.goal} onChange={(v) => setOptions({ ...options, goal: v })} />

                {/* Outfit */}
                <OutfitSelector
                  value={options.outfit}
                  onChange={(v) => setOptions({ ...options, outfit: v })}
                  recommendedChips={recommendedOutfits}
                />

                {/* Posture Focus */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-zinc-400 mb-3 block">Posture Focus</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOptions({ ...options, postureFocus: 'neutral' })}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        options.postureFocus === 'neutral'
                          ? 'bg-cyan-500 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Keep Current
                    </button>
                    <button
                      onClick={() => setOptions({ ...options, postureFocus: 'improve_posture' })}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        options.postureFocus === 'improve_posture'
                          ? 'bg-cyan-500 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      Improve Posture
                    </button>
                  </div>
                </div>

                {/* Identity Disclaimer */}
                <div className="p-4 bg-zinc-800/50 rounded-xl mb-6 flex items-start gap-3">
                  <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-zinc-400">
                    <strong className="text-white">Identity-preserving:</strong> This preview will NOT change
                    your bone structure or frame. Only realistic improvements through training, nutrition, and styling.
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
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90"
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
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-cyan-500 animate-spin" />
                <Dumbbell className="absolute inset-0 m-auto w-10 h-10 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Generating Your Best Physique</h3>
              <p className="text-zinc-400 text-sm">Creating a realistic, achievable preview...</p>
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
                  <Dumbbell className="w-5 h-5 text-cyan-400" />
                  Your Best Physique Preview
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-sm text-zinc-500 mb-2">Current</div>
                    <div className="aspect-[3/4] rounded-xl overflow-hidden border border-zinc-700 relative">
                      {photoPreview && (
                        <Image src={photoPreview} alt="Current" fill className="object-cover" unoptimized />
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-cyan-400 mb-2">Best Version</div>
                    <div className="aspect-[3/4] rounded-xl overflow-hidden border border-cyan-500/30 bg-zinc-800 relative">
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
                          <Dumbbell className="w-8 h-8 mb-2 text-cyan-400" />
                          <p className="text-sm text-center">Preview generated - see your plan below</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Time Estimate */}
                <div className="p-4 bg-black/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Timer className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-cyan-400">
                        {result.reachability.estimatedWeeks.min === result.reachability.estimatedWeeks.max
                          ? `~${result.reachability.estimatedWeeks.min} weeks`
                          : `${result.reachability.estimatedWeeks.min}-${result.reachability.estimatedWeeks.max} weeks`}
                      </div>
                      <div className="text-xs text-zinc-500">to reach this physique</div>
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
              <div className="p-6 bg-gradient-to-br from-zinc-900/80 to-cyan-900/20 border border-cyan-500/20 rounded-2xl">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-cyan-400" />
                  Changes Applied
                </h3>
                <div className="grid gap-3">
                  {result.appliedChanges.map((change, i) => {
                    const [title, description] = change.split(':');
                    const icons: Record<string, string> = {
                      'Body': '💪',
                      'Posture': '🧘',
                      'Outfit': '👔',
                      'Lighting': '💡',
                      'Leanness': '🔥',
                      'Muscle': '💪',
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

              {/* Silhouette Tips */}
              {result.silhouetteTips.length > 0 && (
                <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                  <h3 className="font-semibold text-white mb-4">Style Tips for Your Body Type</h3>
                  <div className="grid gap-2">
                    {result.silhouetteTips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                        <span className="text-cyan-400">👕</span>
                        <span className="text-sm text-zinc-300">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Identity Note */}
              <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-zinc-400">
                  <strong className="text-white">Same You, Better Presentation:</strong> No frame or bone structure changes. 
                  Only posture, outfit, and realistic progress shown.
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setPageState('customize')}
                  className="px-6 py-3 bg-zinc-800 text-white rounded-xl flex items-center gap-2 hover:bg-zinc-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Different Goals
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
                    download="best-physique.png"
                    className="px-6 py-3 bg-cyan-500 text-white rounded-xl flex items-center gap-2 hover:bg-cyan-600"
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
