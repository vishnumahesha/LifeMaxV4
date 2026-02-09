'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Camera,
  Barcode,
  Search,
  Plus,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Leaf,
  ChevronRight,
  Calendar,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import type { DailyMealsResponse, Meal, MealType, ConfidenceLevel, NutritionTargets } from '@/types/tracker';
import { getConfidenceLevel, getConfidenceColor, getConfidenceBgColor } from '@/types/tracker';

// ============================================
// ANIMATED BACKGROUND
// ============================================

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}

// ============================================
// MACRO PROGRESS RING
// ============================================

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor: string;
  children?: React.ReactNode;
}

function ProgressRing({ value, max, size = 80, strokeWidth = 8, color, bgColor, children }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - progress * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ============================================
// CONFIDENCE BADGE
// ============================================

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const labels: Record<ConfidenceLevel, string> = {
    high: 'High',
    medium: 'Med',
    low: 'Low',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(level)} ${getConfidenceBgColor(level)}`}>
      {labels[level]}
    </span>
  );
}

// ============================================
// MACRO CARD
// ============================================

interface MacroCardProps {
  icon: React.ReactNode;
  label: string;
  current: { min: number; max: number };
  target?: number;
  unit?: string;
  color: string;
  bgColor: string;
}

function MacroCard({ icon, label, current, target, unit = 'g', color, bgColor }: MacroCardProps) {
  const avg = (current.min + current.max) / 2;
  const displayValue = current.min === current.max 
    ? Math.round(current.min)
    : `${Math.round(current.min)}-${Math.round(current.max)}`;
  
  const remaining = target ? Math.max(0, target - avg) : null;

  return (
    <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-zinc-400">{label}</span>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className={`text-2xl font-bold ${color}`}>
            {displayValue}
            <span className="text-sm text-zinc-500 ml-1">{unit}</span>
          </div>
          {target && (
            <div className="text-xs text-zinc-500 mt-1">
              {remaining ? `${Math.round(remaining)}${unit} remaining` : 'Target reached!'}
            </div>
          )}
        </div>
        {target && (
          <ProgressRing
            value={avg}
            max={target}
            size={48}
            strokeWidth={4}
            color={color.replace('text-', 'rgb(var(--').replace('400', '400))').replace('rgb(var(--', '#')}
            bgColor="rgba(255,255,255,0.1)"
          >
            <span className="text-xs text-zinc-400">{Math.round((avg / target) * 100)}%</span>
          </ProgressRing>
        )}
      </div>
    </div>
  );
}

// ============================================
// MEAL CARD
// ============================================

function MealCard({ meal }: { meal: Meal }) {
  const totalCals = meal.items.reduce((sum, item) => sum + (item.caloriesEstMin + item.caloriesEstMax) / 2, 0);
  const confidence = getConfidenceLevel(meal.aiConfidence || 0.5);
  const time = new Date(meal.consumedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const mealTypeIcons: Record<MealType, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍿',
  };

  return (
    <Link href={`/tracker/meal/${meal.id}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 hover:border-violet-500/30 transition-colors cursor-pointer"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{mealTypeIcons[meal.mealType]}</span>
            <div>
              <div className="font-medium text-white capitalize">{meal.mealType}</div>
              <div className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {time}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-violet-400">{Math.round(totalCals)} cal</div>
            <ConfidenceBadge level={confidence} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {meal.items.slice(0, 3).map((item, idx) => (
            <span key={idx} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
              {item.name}
            </span>
          ))}
          {meal.items.length > 3 && (
            <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500">
              +{meal.items.length - 3} more
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ============================================
// ADD MEAL BUTTONS
// ============================================

function AddMealButtons() {
  const buttons = [
    { href: '/tracker/add/photo', icon: Camera, label: 'Photo', color: 'from-violet-500 to-fuchsia-500' },
    { href: '/tracker/add/barcode', icon: Barcode, label: 'Scan', color: 'from-blue-500 to-cyan-500' },
    { href: '/tracker/add/search', icon: Search, label: 'Search', color: 'from-emerald-500 to-teal-500' },
    { href: '/tracker/add/quick', icon: Plus, label: 'Quick', color: 'from-orange-500 to-amber-500' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {buttons.map((btn) => (
        <Link key={btn.href} href={btn.href}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-4 rounded-xl bg-gradient-to-br ${btn.color} flex flex-col items-center gap-2 cursor-pointer`}
          >
            <btn.icon className="w-6 h-6 text-white" />
            <span className="text-xs font-medium text-white">{btn.label}</span>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}

// ============================================
// DATE SELECTOR
// ============================================

function DateSelector({ date, onChange }: { date: Date; onChange: (date: Date) => void }) {
  const isToday = date.toDateString() === new Date().toDateString();
  
  const goToPrevious = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    onChange(prev);
  };

  const goToNext = () => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    if (next <= new Date()) {
      onChange(next);
    }
  };

  const formatDate = (d: Date) => {
    if (isToday) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={goToPrevious}
        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-zinc-400" />
      </button>
      
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-violet-400" />
        <span className="text-lg font-semibold text-white">{formatDate(date)}</span>
      </div>
      
      <button
        onClick={goToNext}
        disabled={isToday}
        className={`p-2 rounded-lg transition-colors ${
          isToday 
            ? 'bg-zinc-800/50 cursor-not-allowed' 
            : 'bg-zinc-800 hover:bg-zinc-700'
        }`}
      >
        <ChevronRight className={`w-5 h-5 ${isToday ? 'text-zinc-600' : 'text-zinc-400'}`} />
      </button>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function TrackerDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [data, setData] = useState<DailyMealsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(`/api/meals?date=${dateStr}`);
      const result = await response.json();
      
      if (!result.ok) {
        // Handle authentication errors gracefully
        if (result.error?.code === 'UNAUTHORIZED' || result.error?.message?.includes('sign in')) {
          setError('auth_required');
          setData(null);
          return;
        }
        throw new Error(result.error?.message || 'Failed to fetch meals');
      }
      
      setData(result.data);
    } catch (err) {
      console.error('Fetch meals error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to load meals';
      if (errorMsg.includes('sign in') || errorMsg.includes('unauthorized')) {
        setError('auth_required');
      } else {
        setError(errorMsg);
        toast.error('Failed to load meals');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const totals = data?.totals || {
    calories: { min: 0, max: 0 },
    protein: { min: 0, max: 0 },
    carbs: { min: 0, max: 0 },
    fats: { min: 0, max: 0 },
    fiber: { min: 0, max: 0 },
  };

  const targets: NutritionTargets = data?.targets || {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fats: 65,
    fiber: 30,
    source: 'user_set',
  };

  const dayConfidence = getConfidenceLevel(data?.dayConfidence || 1);

  // Group meals by type
  const mealsByType: Record<MealType, Meal[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  
  (data?.meals || []).forEach(meal => {
    mealsByType[meal.mealType].push(meal);
  });

  return (
    <AppShell>
      <BackgroundOrbs />

      <div className="max-w-2xl mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <div className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-4"
          >
            <Flame className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-violet-400">Calorie Tracker</span>
          </motion.div>
          
          <DateSelector date={selectedDate} onChange={setSelectedDate} />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="h-32 bg-zinc-800/50 rounded-xl animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-zinc-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className={`p-6 rounded-xl text-center ${
            error === 'auth_required' 
              ? 'bg-violet-500/10 border border-violet-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {error === 'auth_required' ? (
              <>
                <Lock className="w-10 h-10 text-violet-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Sign In Required</h3>
                <p className="text-zinc-400 mb-4">
                  Please sign in to track your meals and view your nutrition data.
                </p>
                <Link href="/auth">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30"
                  >
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </>
            ) : (
              <>
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-red-400">{error}</p>
                <button
                  onClick={fetchMeals}
                  className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate.toDateString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Calories Summary */}
              <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Daily Progress</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Confidence:</span>
                    <ConfidenceBadge level={dayConfidence} />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <ProgressRing
                    value={(totals.calories.min + totals.calories.max) / 2}
                    max={targets.calories}
                    size={120}
                    strokeWidth={10}
                    color="#a78bfa"
                    bgColor="rgba(167, 139, 250, 0.2)"
                  >
                    <div className="text-center">
                      <Flame className="w-5 h-5 text-violet-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-white">
                        {Math.round((totals.calories.min + totals.calories.max) / 2)}
                      </div>
                      <div className="text-xs text-zinc-500">of {targets.calories}</div>
                    </div>
                  </ProgressRing>

                  <div className="flex-1">
                    <div className="text-sm text-zinc-400 mb-2">
                      {totals.calories.min !== totals.calories.max && (
                        <span className="text-violet-400">
                          {Math.round(totals.calories.min)}-{Math.round(totals.calories.max)} cal
                        </span>
                      )}
                    </div>
                    
                    <div className="text-2xl font-bold text-white mb-1">
                      {Math.max(0, Math.round(targets.calories - (totals.calories.min + totals.calories.max) / 2))}
                      <span className="text-sm text-zinc-500 ml-1">remaining</span>
                    </div>

                    {targets.source === 'ai_generated' && (
                      <div className="flex items-center gap-1 text-xs text-emerald-400">
                        <Target className="w-3 h-3" />
                        AI-optimized targets
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Macro Cards */}
              <div className="grid grid-cols-2 gap-3">
                <MacroCard
                  icon={<Beef className="w-4 h-4 text-red-400" />}
                  label="Protein"
                  current={totals.protein}
                  target={targets.protein}
                  color="text-red-400"
                  bgColor="bg-red-500/20"
                />
                <MacroCard
                  icon={<Wheat className="w-4 h-4 text-amber-400" />}
                  label="Carbs"
                  current={totals.carbs}
                  target={targets.carbs}
                  color="text-amber-400"
                  bgColor="bg-amber-500/20"
                />
                <MacroCard
                  icon={<Droplets className="w-4 h-4 text-blue-400" />}
                  label="Fats"
                  current={totals.fats}
                  target={targets.fats}
                  color="text-blue-400"
                  bgColor="bg-blue-500/20"
                />
                <MacroCard
                  icon={<Leaf className="w-4 h-4 text-emerald-400" />}
                  label="Fiber"
                  current={totals.fiber}
                  target={targets.fiber}
                  color="text-emerald-400"
                  bgColor="bg-emerald-500/20"
                />
              </div>

              {/* Add Meal Buttons */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-400">Log a Meal</h3>
                <AddMealButtons />
              </div>

              {/* Meals Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Meals</h3>
                  <Link href="/tracker/insights" className="text-sm text-violet-400 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Weekly
                  </Link>
                </div>

                {Object.entries(mealsByType).map(([type, meals]) => (
                  <div key={type}>
                    {meals.length > 0 && (
                      <div className="space-y-2">
                        {meals.map(meal => (
                          <MealCard key={meal.id} meal={meal} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {data?.meals.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Camera className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 mb-2">No meals logged yet</p>
                    <p className="text-sm text-zinc-500">Tap a button above to start tracking</p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </AppShell>
  );
}
