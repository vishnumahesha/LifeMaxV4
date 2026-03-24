'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useCountUp } from '@/hooks/useCountUp';
import { 
  TrendingUp, 
  Sparkles,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Eye,
  Smile,
  Gem,
  Heart
} from 'lucide-react';
import { formatScore, formatRange, getConfidenceLabel } from '@/lib/utils';
import type { FaceAnalysisResult } from '@/types/face';

interface FaceResultsUIProps {
  result: FaceAnalysisResult;
  photoPreview?: string;
}

// Score Circle Component
function ScoreCircle({
  score,
  label,
  sublabel,
  size = 'lg',
  color = 'green'
}: {
  score: number;
  label: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'green' | 'purple' | 'yellow';
}) {
  const animatedScore = useCountUp(score, 400, 0, 1);

  const sizes = {
    sm: { width: 100, stroke: 6, textSize: 'text-2xl' },
    md: { width: 140, stroke: 8, textSize: 'text-4xl' },
    lg: { width: 160, stroke: 10, textSize: 'text-5xl' },
  };

  const colors = {
    green: { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', text: 'text-emerald-400' },
    purple: { stroke: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)', text: 'text-purple-400' },
    yellow: { stroke: '#eab308', glow: 'rgba(234, 179, 8, 0.5)', text: 'text-yellow-400' },
  };

  const config = sizes[size];
  const colorConfig = colors[color];
  const radius = (config.width - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 10) * circumference;

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="relative" style={{ width: config.width, height: config.width }}>
        <svg className="transform -rotate-90" width={config.width} height={config.width}>
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="rgba(39, 39, 42, 0.8)"
            strokeWidth={config.stroke}
          />
          <motion.circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={colorConfig.stroke}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 10px ${colorConfig.glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.textSize} font-bold ${colorConfig.text}`} style={{ textShadow: `0 0 20px ${colorConfig.glow}` }}>
            {animatedScore.toFixed(1)}
          </span>
          <span className="text-sm text-zinc-500">/10</span>
        </div>
      </div>
      {sublabel && <p className="text-xs text-zinc-500 mt-2">{sublabel}</p>}
    </div>
  );
}

// Potential Badge
function PotentialBadge({ value }: { value: number }) {
  const animatedValue = useCountUp(value, 400, 0, 1);

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">&nbsp;</p>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
        className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex flex-col items-center justify-center"
        style={{ boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}
      >
        <span className="text-2xl font-bold text-emerald-400">+{animatedValue.toFixed(1)}</span>
        <span className="text-xs text-emerald-400/80">possible</span>
      </motion.div>
    </div>
  );
}

// Tab Button
function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl font-medium transition-all ${
        active 
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
          : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// Progress Bar with label
function ImprovementBar({ label, value, maxValue = 1 }: { label: string; value: number; maxValue?: number }) {
  const percentage = (value / maxValue) * 100;
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-zinc-400 w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}
        />
      </div>
      <span className="text-sm font-semibold text-emerald-400 w-12 text-right">+{value.toFixed(1)}</span>
    </div>
  );
}

// Lever Card
function LeverCard({ index, name, delta, timeline, isExpanded, onToggle }: {
  index: number;
  name: string;
  delta: number;
  timeline: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const colors = ['bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-zinc-800/30 rounded-xl overflow-hidden"
    >
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-4">
        <div className={`w-10 h-10 ${colors[index]} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
          #{index + 1}
        </div>
        <div className="flex-1 text-left">
          <h4 className="font-semibold text-white">{name}</h4>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-emerald-400 font-semibold">+{delta.toFixed(1)}</span>
            <span className="text-zinc-500">{timeline}</span>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
      </button>
      <div className="px-4 pb-0">
        <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${colors[index]}`}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, delay: index * 0.2 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Category Score Card
function CategoryScoreCard({ icon: Icon, label, score, priority, index = 0 }: {
  icon: any;
  label: string;
  score: number;
  priority: 'high' | 'medium' | 'low';
  index?: number;
}) {
  const priorityColors = {
    high: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };

  const scoreColor = score >= 7 ? 'text-emerald-400' : score >= 5 ? 'text-yellow-400' : 'text-orange-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3, ease: "easeOut" }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-white font-medium">{label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[priority]}`}>
            {priority}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-lg font-bold ${scoreColor}`}>{formatScore(score)}/10</span>
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </div>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${score >= 7 ? 'bg-emerald-500' : score >= 5 ? 'bg-yellow-500' : 'bg-orange-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          transition={{ duration: 1 }}
        />
      </div>
    </motion.div>
  );
}

// Opportunity Card
function OpportunityCard({ name, description, delta, timeline, difficulty, steps }: {
  name: string;
  description: string;
  delta: number;
  timeline: string;
  difficulty: string;
  steps: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start justify-between text-left"
      >
        <div className="flex-1">
          <h4 className="font-semibold text-white mb-1">{name}</h4>
          <p className="text-sm text-zinc-500">{description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeline}
            </span>
            <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
              {difficulty}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-semibold rounded-full">
            +{delta.toFixed(1)}
          </span>
          {expanded ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
        </div>
      </button>
      
      {expanded && steps.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 pb-4"
        >
          <ul className="space-y-2 border-t border-zinc-800 pt-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {step}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}

export function FaceResultsUI({ result, photoPreview }: FaceResultsUIProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedLever, setExpandedLever] = useState<number | null>(null);
  
  const { 
    overall, 
    topLevers, 
    featureScores,
    photoQuality
  } = result;

  const potentialGain = overall.potentialRange.max - overall.currentScore10;
  const totalLeverGain = topLevers.reduce((sum, l) => sum + (l.deltaRange.max + l.deltaRange.min) / 2, 0);

  // Map feature scores to display
  const categoryScores = [
    { icon: Sparkles, label: 'Skin Quality', score: featureScores.skin?.score || 5.5, priority: 'high' as const },
    { icon: Eye, label: 'Eye Area', score: featureScores.eyes?.score || 6.0, priority: 'high' as const },
    { icon: Heart, label: 'Facial Harmony', score: featureScores.cheekbones?.score || 5.5, priority: 'medium' as const },
    { icon: Gem, label: 'Jawline', score: featureScores.jawChin?.score || 5.5, priority: 'medium' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          🏆 Overview
        </TabButton>
        <TabButton active={activeTab === 'plan'} onClick={() => setActiveTab('plan')}>
          📋 14-Day Plan
        </TabButton>
        <TabButton active={activeTab === 'style'} onClick={() => setActiveTab('style')}>
          💅 Style Guide
        </TabButton>
        <TabButton active={activeTab === 'progress'} onClick={() => setActiveTab('progress')}>
          📊 Progress
        </TabButton>
      </div>

      {/* Photo Quality Warning */}
      {photoQuality.score < 0.7 && photoQuality.issues.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-400 font-medium">Photo Quality Issues</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {photoQuality.issues.map((issue, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'overview' && (
        <>
          {/* Main Scores */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl"
          >
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              <ScoreCircle 
                score={overall.currentScore10} 
                label="Current" 
                sublabel={overall.currentScore10 >= 6 ? "Above average" : overall.currentScore10 >= 5 ? "Slightly above avg" : "Room to grow"}
                color="green"
              />
              <PotentialBadge value={potentialGain} />
              <ScoreCircle 
                score={overall.potentialRange.max} 
                label="Potential" 
                sublabel={overall.potentialRange.max >= 7 ? "Above average" : "Achievable"}
                color="purple"
              />
            </div>

            {/* Confidence Badge */}
            <div className="flex justify-center mt-6">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                overall.confidence >= 0.7 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                ✨ {getConfidenceLabel(overall.confidence)} Confidence
              </span>
            </div>

            {/* Summary */}
            <p className="text-center text-zinc-400 mt-6 max-w-xl mx-auto">
              {overall.summary}
            </p>
          </motion.div>

          {/* See Your Best Version CTA */}
          <Link href="/face/preview">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className="p-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl cursor-pointer group"
              style={{ boxShadow: '0 0 40px rgba(168, 85, 247, 0.15)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-yellow-400" style={{ filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.7))' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">See Your Best Version!</h3>
                    <p className="text-sm text-zinc-400">AI-enhanced photo with optimized lighting, skin & styling</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </Link>

          {/* Improvement Potential Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📊 Your Improvement Potential Breakdown
            </h3>
            <div className="space-y-4">
              {topLevers.map((lever, i) => (
                <ImprovementBar 
                  key={i}
                  label={lever.name}
                  value={(lever.deltaRange.min + lever.deltaRange.max) / 2}
                />
              ))}
            </div>
          </motion.div>

          {/* Top 3 Levers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  🎯 Your Top 3 Levers
                </h3>
                <p className="text-sm text-zinc-500">Highest-impact improvements</p>
              </div>
              <div className="text-right px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <span className="text-2xl font-bold text-emerald-400">+{totalLeverGain.toFixed(1)}</span>
                <p className="text-xs text-emerald-400/70">total</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {topLevers.map((lever, index) => (
                <LeverCard
                  key={index}
                  index={index}
                  name={lever.name}
                  delta={(lever.deltaRange.min + lever.deltaRange.max) / 2}
                  timeline={lever.timeline}
                  isExpanded={expandedLever === index}
                  onToggle={() => setExpandedLever(expandedLever === index ? null : index)}
                />
              ))}
            </div>

            <p className="text-center text-sm text-zinc-500 mt-4">
              ⏱️ Full potential in <span className="text-emerald-400 font-medium">10-14 weeks</span>
            </p>
          </motion.div>

          {/* Category Scores Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {categoryScores.map((cat, i) => (
              <CategoryScoreCard key={i} {...cat} index={i} />
            ))}
          </div>

          {/* All Improvement Opportunities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              🚀 All Improvement Opportunities
            </h3>
            <div className="space-y-3">
              {topLevers.map((lever, i) => (
                <OpportunityCard
                  key={i}
                  name={lever.name}
                  description={lever.explanation}
                  delta={(lever.deltaRange.min + lever.deltaRange.max) / 2}
                  timeline={lever.timeline}
                  difficulty={i === 0 ? 'easy' : i === 1 ? 'medium' : 'committed'}
                  steps={lever.steps}
                />
              ))}
            </div>
          </motion.div>
        </>
      )}

      {activeTab === 'plan' && (
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">14-Day Action Plan</h3>
          <p className="text-zinc-400 mb-6">Coming soon! A day-by-day guide to reach your potential.</p>
          <Link href="/action">
            <button className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-500 transition-colors">
              View Action Plan →
            </button>
          </Link>
        </div>
      )}

      {activeTab === 'style' && (
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-pink-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💅</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Style Guide</h3>
          <p className="text-zinc-400 mb-6">Personalized haircut, grooming, and styling recommendations.</p>
          <Link href="/face/preview">
            <button className="px-6 py-3 bg-pink-600 text-white font-semibold rounded-xl hover:bg-pink-500 transition-colors">
              See Best Version →
            </button>
          </Link>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Track Your Progress</h3>
          <p className="text-zinc-400 mb-6">Upload new photos to see your improvements over time.</p>
          <button className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-colors">
            Coming Soon
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-zinc-500 p-4"
      >
        <p>
          ✨ This analysis is for informational purposes only. Beauty is subjective.
          Consider consulting a dermatologist or stylist for personalized advice.
        </p>
      </motion.div>
    </div>
  );
}
