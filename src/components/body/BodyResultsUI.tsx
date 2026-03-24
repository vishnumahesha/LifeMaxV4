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
  Dumbbell,
  Ruler,
  Activity,
  Heart
} from 'lucide-react';
import { formatScore, formatRange, getConfidenceLabel } from '@/lib/utils';
import type { BodyAnalysisResult } from '@/types/body';

interface BodyResultsUIProps {
  result: BodyAnalysisResult;
  photoPreview?: string;
}

// Score Circle Component
function ScoreCircle({
  score,
  label,
  sublabel,
  size = 'lg',
  color = 'cyan'
}: {
  score: number;
  label: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'teal' | 'orange';
}) {
  const animatedScore = useCountUp(score, 400, 0, 1);

  const sizes = {
    sm: { width: 100, stroke: 6, textSize: 'text-2xl' },
    md: { width: 140, stroke: 8, textSize: 'text-4xl' },
    lg: { width: 160, stroke: 10, textSize: 'text-5xl' },
  };

  const colors = {
    cyan: { stroke: '#06b6d4', glow: 'rgba(6, 182, 212, 0.5)', text: 'text-cyan-400' },
    teal: { stroke: '#14b8a6', glow: 'rgba(20, 184, 166, 0.5)', text: 'text-teal-400' },
    orange: { stroke: '#f97316', glow: 'rgba(249, 115, 22, 0.5)', text: 'text-orange-400' },
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
        className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40 flex flex-col items-center justify-center"
        style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)' }}
      >
        <span className="text-2xl font-bold text-cyan-400">+{animatedValue.toFixed(1)}</span>
        <span className="text-xs text-cyan-400/80">possible</span>
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
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30' 
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
          className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.5)' }}
        />
      </div>
      <span className="text-sm font-semibold text-cyan-400 w-12 text-right">+{value.toFixed(1)}</span>
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
  const colors = ['bg-cyan-500', 'bg-teal-500', 'bg-orange-500'];
  
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
            <span className="text-cyan-400 font-semibold">+{delta.toFixed(1)}</span>
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
    high: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };

  const scoreColor = score >= 7 ? 'text-cyan-400' : score >= 5 ? 'text-yellow-400' : 'text-orange-400';

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
          className={`h-full rounded-full ${score >= 7 ? 'bg-cyan-500' : score >= 5 ? 'bg-yellow-500' : 'bg-orange-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          transition={{ duration: 1 }}
        />
      </div>
    </motion.div>
  );
}

// Kibbe Type Card
function KibbeTypeCard({ type, probability, isTop }: { type: string; probability: number; isTop: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-4 p-3 rounded-xl ${isTop ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-zinc-800/30'}`}
    >
      <div className="flex-1">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-medium ${isTop ? 'text-teal-400' : 'text-zinc-300'}`}>{type}</span>
          <span className={`text-sm font-bold ${isTop ? 'text-teal-400' : 'text-zinc-400'}`}>
            {Math.round(probability * 100)}%
          </span>
        </div>
        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isTop ? 'bg-teal-500' : 'bg-zinc-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${probability * 100}%` }}
            transition={{ duration: 1 }}
            style={isTop ? { boxShadow: '0 0 10px rgba(20, 184, 166, 0.5)' } : {}}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function BodyResultsUI({ result, photoPreview }: BodyResultsUIProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedLever, setExpandedLever] = useState<number | null>(null);
  
  const { 
    overall, 
    topLevers, 
    kibbe,
    composition,
    proportions,
    photoQuality
  } = result;

  const potentialGain = overall.potentialRange.max - overall.currentScore10;
  const totalLeverGain = topLevers.reduce((sum, l) => sum + (l.deltaRange.max + l.deltaRange.min) / 2, 0);

  // Category scores based on body data
  const categoryScores = [
    { icon: Ruler, label: 'Proportions', score: composition.leannessPresentationScore || 5.5, priority: 'high' as const },
    { icon: Activity, label: 'Posture', score: 6.0, priority: 'high' as const },
    { icon: Dumbbell, label: 'Muscle Balance', score: 5.5, priority: 'medium' as const },
    { icon: Heart, label: 'Overall Frame', score: 5.5, priority: 'medium' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          💪 Overview
        </TabButton>
        <TabButton active={activeTab === 'kibbe'} onClick={() => setActiveTab('kibbe')}>
          👔 Kibbe Type
        </TabButton>
        <TabButton active={activeTab === 'workout'} onClick={() => setActiveTab('workout')}>
          🏋️ Workout Plan
        </TabButton>
        <TabButton active={activeTab === 'nutrition'} onClick={() => setActiveTab('nutrition')}>
          🥗 Nutrition
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
                color="cyan"
              />
              <PotentialBadge value={potentialGain} />
              <ScoreCircle 
                score={overall.potentialRange.max} 
                label="Potential" 
                sublabel={overall.potentialRange.max >= 7 ? "Above average" : "Achievable"}
                color="teal"
              />
            </div>

            {/* Confidence Badge */}
            <div className="flex justify-center mt-6">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                overall.confidence >= 0.7 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                💪 {getConfidenceLabel(overall.confidence)} Confidence
              </span>
            </div>

            {/* Summary */}
            <p className="text-center text-zinc-400 mt-6 max-w-xl mx-auto">
              {overall.summary}
            </p>
          </motion.div>

          {/* Get Action Plan CTA */}
          <Link href="/action">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className="p-6 bg-gradient-to-r from-cyan-600/20 to-teal-600/20 border border-cyan-500/30 rounded-2xl cursor-pointer group"
              style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.15)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Get Your Action Plan!</h3>
                    <p className="text-sm text-zinc-400">Custom workout & nutrition to reach your potential</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-cyan-400 group-hover:translate-x-1 transition-transform" />
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
              <div className="text-right px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                <span className="text-2xl font-bold text-cyan-400">+{totalLeverGain.toFixed(1)}</span>
                <p className="text-xs text-cyan-400/70">total</p>
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
              ⏱️ Full potential in <span className="text-cyan-400 font-medium">12-16 weeks</span>
            </p>
          </motion.div>

          {/* Category Scores Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {categoryScores.map((cat, i) => (
              <CategoryScoreCard key={i} {...cat} index={i} />
            ))}
          </div>
        </>
      )}

      {activeTab === 'kibbe' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👔</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Your Kibbe Body Type</h3>
            <p className="text-zinc-400">Based on your proportions and bone structure</p>
          </div>

          {kibbe.primaryType && (
            <div className="text-center mb-6 p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
              <p className="text-sm text-teal-400 mb-1">Primary Type</p>
              <p className="text-2xl font-bold text-white">{kibbe.primaryType}</p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {kibbe.probabilities
              .sort((a, b) => b.probability - a.probability)
              .slice(0, 5)
              .map((item, i) => (
                <KibbeTypeCard key={item.type} type={item.type} probability={item.probability} isTop={i === 0} />
              ))}
          </div>

          {kibbe.stylingNotes.length > 0 && (
            <div className="p-4 bg-zinc-800/30 rounded-xl">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                Styling Tips for Your Type
              </h4>
              <ul className="space-y-2">
                {kibbe.stylingNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                    <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'workout' && (
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏋️</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Personalized Workout Plan</h3>
          <p className="text-zinc-400 mb-6">Custom exercises tailored to your body type and goals.</p>
          <Link href="/action">
            <button className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-500 transition-colors">
              Generate Workout Plan →
            </button>
          </Link>
        </div>
      )}

      {activeTab === 'nutrition' && (
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🥗</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Nutrition Targets</h3>
          <p className="text-zinc-400 mb-6">Personalized macros and calorie targets for your goals.</p>
          <Link href="/action">
            <button className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-colors">
              Get Nutrition Plan →
            </button>
          </Link>
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
          💪 This analysis is for informational purposes only.
          Consider consulting a fitness professional for personalized advice.
        </p>
      </motion.div>
    </div>
  );
}
