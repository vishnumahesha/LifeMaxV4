'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Dumbbell, 
  UtensilsCrossed, 
  Target, 
  ArrowRight, 
  Clock, 
  Flame,
  Activity,
  TrendingUp,
  Check,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronUp,
  Calendar,
  Droplets
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion';
import type { ActionPlan, WorkoutPlan, MacroTargets } from '@/types/body';
import type { ApiResult } from '@/types/api';

type PageState = 'input' | 'generating' | 'results';

interface UserStats {
  height: string;
  weight: string;
  age: string;
  activityLevel: string;
  goal: string;
  targetAreas: string[];
}

// Animated background orbs
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-1/3 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-[150px]" />
    </div>
  );
}

// Glowing stat input
function GlowingInput({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  icon: Icon 
}: { 
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon: any;
}) {
  return (
    <div className="relative">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
        <Icon className="w-4 h-4 text-orange-400" />
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-700 hover:border-orange-500/30 focus:border-orange-500/50 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-all focus:shadow-lg focus:shadow-orange-500/10"
      />
    </div>
  );
}

// Goal selection card
function GoalCard({ 
  title, 
  description, 
  icon: Icon, 
  selected, 
  onClick 
}: { 
  title: string;
  description: string;
  icon: any;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative p-4 rounded-2xl border text-left transition-all ${
        selected 
          ? 'bg-orange-500/10 border-orange-500/50 shadow-lg shadow-orange-500/20' 
          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
        selected ? 'bg-orange-500/20' : 'bg-zinc-800'
      }`}>
        <Icon className={`w-5 h-5 ${selected ? 'text-orange-400' : 'text-zinc-500'}`} />
      </div>
      <h3 className={`font-semibold mb-1 ${selected ? 'text-white' : 'text-zinc-300'}`}>
        {title}
      </h3>
      <p className="text-xs text-zinc-500">{description}</p>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}
    </motion.button>
  );
}

// Macro display card
function MacroCard({ 
  label, 
  value, 
  unit, 
  color, 
  icon: Icon 
}: { 
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: any;
}) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  };
  const c = colors[color] || colors.orange;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`p-4 rounded-2xl ${c.bg} border ${c.border}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${c.text}`} />
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${c.text}`}>{value}</span>
        <span className="text-sm text-zinc-500">{unit}</span>
      </div>
    </motion.div>
  );
}

// Exercise card
function ExerciseCard({ 
  name, 
  sets, 
  reps, 
  notes,
  index
}: { 
  name: string;
  sets: number;
  reps: string;
  notes?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-orange-500/30 transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
        {index + 1}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-white">{name}</h4>
        {notes && <p className="text-xs text-zinc-500">{notes}</p>}
      </div>
      <div className="text-right">
        <span className="text-sm font-medium text-orange-400">{sets} x {reps}</span>
      </div>
    </motion.div>
  );
}

export default function ActionPlanContent() {
  const [pageState, setPageState] = useState<PageState>('input');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [stats, setStats] = useState<UserStats>({
    height: '',
    weight: '',
    age: '',
    activityLevel: 'moderate',
    goal: 'body_recomp',
    targetAreas: [],
  });
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('workout');

  const goals = [
    { id: 'fat_loss', title: 'Fat Loss', description: 'Reduce body fat while maintaining muscle', icon: Flame },
    { id: 'muscle_gain', title: 'Muscle Gain', description: 'Build lean muscle mass', icon: Dumbbell },
    { id: 'body_recomp', title: 'Body Recomp', description: 'Lose fat and gain muscle', icon: TrendingUp },
    { id: 'maintenance', title: 'Maintenance', description: 'Maintain current physique', icon: Activity },
  ];

  const targetAreas = [
    { id: 'chest', label: 'Chest' },
    { id: 'back', label: 'Back' },
    { id: 'shoulders', label: 'Shoulders' },
    { id: 'arms', label: 'Arms' },
    { id: 'core', label: 'Core' },
    { id: 'legs', label: 'Legs' },
    { id: 'glutes', label: 'Glutes' },
  ];

  const handleGenerate = async () => {
    if (!stats.height || !stats.weight || !stats.age) {
      toast.error('Please fill in your stats');
      return;
    }

    setPageState('generating');
    setGenerationProgress(0);

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const response = await fetch('/api/action/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: {
            height: stats.height,
            weight: stats.weight,
            age: parseInt(stats.age),
            activityLevel: stats.activityLevel,
          },
          goal: stats.goal,
          targetAreas: stats.targetAreas,
        }),
      });

      const data: ApiResult<ActionPlan> = await response.json();

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!data.ok) {
        toast.error(data.error.message);
        setPageState('input');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      
      setPlan(data.data);
      setPageState('results');

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Generation error:', error);
      toast.error('Failed to generate plan. Please try again.');
      setPageState('input');
    }
  };

  const handleReset = () => {
    setPageState('input');
    setPlan(null);
    setGenerationProgress(0);
  };

  return (
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
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-b from-orange-500/30 to-orange-500/10 border border-orange-500/30 mb-6"
              animate={{ 
                boxShadow: ['0 0 30px rgba(249,115,22,0.3)', '0 0 50px rgba(249,115,22,0.5)', '0 0 30px rgba(249,115,22,0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Target className="w-10 h-10 text-orange-400" />
            </motion.div>
            <h1 className="text-4xl font-bold text-white mb-3">
              Action Plan
            </h1>
            <p className="text-zinc-400 text-lg">
              {pageState === 'input' && 'Get your personalized workout & nutrition plan'}
              {pageState === 'generating' && 'Generating your custom plan...'}
              {pageState === 'results' && 'Your personalized plan is ready'}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Input State */}
            {pageState === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Stats Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-zinc-900/50 border border-orange-500/20 rounded-3xl"
                >
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-400" />
                    Your Stats
                  </h2>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <GlowingInput
                      label="Height"
                      placeholder="5'10&quot; or 178cm"
                      value={stats.height}
                      onChange={(v) => setStats({ ...stats, height: v })}
                      icon={Target}
                    />
                    <GlowingInput
                      label="Weight"
                      placeholder="170 lbs or 77kg"
                      value={stats.weight}
                      onChange={(v) => setStats({ ...stats, weight: v })}
                      icon={Activity}
                    />
                    <GlowingInput
                      label="Age"
                      placeholder="25"
                      value={stats.age}
                      onChange={(v) => setStats({ ...stats, age: v })}
                      icon={Clock}
                    />
                  </div>

                  {/* Activity Level */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-zinc-400 mb-3">Activity Level</label>
                    <div className="flex gap-2 flex-wrap">
                      {['sedentary', 'light', 'moderate', 'active', 'very_active'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setStats({ ...stats, activityLevel: level })}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            stats.activityLevel === level 
                              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          {level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Goal Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl"
                >
                  <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    Your Goal
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {goals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        title={goal.title}
                        description={goal.description}
                        icon={goal.icon}
                        selected={stats.goal === goal.id}
                        onClick={() => setStats({ ...stats, goal: goal.id })}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Target Areas */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl"
                >
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-orange-400" />
                    Focus Areas
                    <span className="text-xs text-zinc-500 font-normal">(optional)</span>
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {targetAreas.map((area) => (
                      <button
                        key={area.id}
                        onClick={() => {
                          const newAreas = stats.targetAreas.includes(area.id)
                            ? stats.targetAreas.filter(a => a !== area.id)
                            : [...stats.targetAreas, area.id];
                          setStats({ ...stats, targetAreas: newAreas });
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          stats.targetAreas.includes(area.id)
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {area.label}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Generate Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.button
                    onClick={handleGenerate}
                    disabled={!stats.height || !stats.weight || !stats.age}
                    whileHover={{ scale: 1.02, boxShadow: '0 0 50px rgba(249, 115, 22, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-lg font-semibold rounded-2xl shadow-xl shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Zap className="w-6 h-6" />
                    Generate My Plan
                    <ArrowRight className="w-6 h-6" />
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {/* Generating State */}
            {pageState === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="relative p-8 bg-zinc-900/50 border border-orange-500/20 rounded-3xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-orange-500/5 animate-pulse" />
                  
                  <div className="relative flex flex-col items-center text-center">
                    {/* Breathing loader */}
                    <div className="relative w-32 h-32 mb-8">
                      <motion.div
                        className="absolute inset-0 rounded-full bg-orange-500/10"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-orange-500/20"
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{ filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.5))' }}
                      />
                      <motion.div
                        className="absolute inset-2 rounded-full border-4 border-transparent border-t-amber-500"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        style={{ filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.5))' }}
                      />
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Target className="w-10 h-10 text-orange-400" />
                      </motion.div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Creating Your Plan
                    </h3>
                    
                    <div className="w-full max-w-md mb-6">
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${generationProgress}%` }}
                          transition={{ duration: 0.3 }}
                          style={{ boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)' }}
                        />
                      </div>
                      <p className="text-sm text-zinc-500 mt-2">
                        {Math.round(generationProgress)}% complete
                      </p>
                    </div>

                    <div className="space-y-3 text-left w-full max-w-sm">
                      {[
                        { label: 'Calculating calorie needs', threshold: 20 },
                        { label: 'Determining macro split', threshold: 40 },
                        { label: 'Building workout routine', threshold: 60 },
                        { label: 'Selecting exercises', threshold: 80 },
                        { label: 'Finalizing plan', threshold: 95 },
                      ].map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center gap-3 ${generationProgress > step.threshold ? 'text-orange-400' : 'text-zinc-500'}`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${generationProgress > step.threshold ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800'}`}>
                            {generationProgress > step.threshold ? '✓' : '○'}
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
            {pageState === 'results' && plan && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Nutrition Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-zinc-900/50 border border-orange-500/20 rounded-3xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <UtensilsCrossed className="w-6 h-6 text-orange-400" />
                      Daily Nutrition
                    </h2>
                    <span className="px-3 py-1 bg-orange-500/20 text-orange-400 text-sm rounded-full">
                      {stats.goal.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MacroCard
                      label="Calories"
                      value={plan.nutrition?.calories || 2400}
                      unit="kcal"
                      color="orange"
                      icon={Flame}
                    />
                    <MacroCard
                      label="Protein"
                      value={plan.nutrition?.protein || 180}
                      unit="g"
                      color="blue"
                      icon={Dumbbell}
                    />
                    <MacroCard
                      label="Carbs"
                      value={plan.nutrition?.carbs || 240}
                      unit="g"
                      color="green"
                      icon={Zap}
                    />
                    <MacroCard
                      label="Fat"
                      value={plan.nutrition?.fats || 80}
                      unit="g"
                      color="purple"
                      icon={Droplets}
                    />
                  </div>

                  {plan.nutrition?.fiber && (
                    <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl">
                      <p className="text-sm text-zinc-400">Daily fiber target: {plan.nutrition.fiber}g</p>
                    </div>
                  )}
                </motion.div>

                {/* Workout Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Dumbbell className="w-6 h-6 text-orange-400" />
                      Workout Plan
                    </h2>
                    <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-sm rounded-full flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {plan.workout?.daysPerWeek || 4}x/week
                    </span>
                  </div>

                  {plan.workout?.days && plan.workout.days.length > 0 ? (
                    <div className="space-y-4">
                      {plan.workout.days.map((day, dayIndex) => (
                        <div key={dayIndex} className="p-4 bg-zinc-800/50 rounded-xl">
                          <h3 className="font-semibold text-white mb-3">{day.name} - {day.focus}</h3>
                          <div className="space-y-2">
                            {day.exercises.map((exercise, index) => (
                              <ExerciseCard
                                key={index}
                                name={exercise.name}
                                sets={exercise.sets}
                                reps={exercise.reps}
                                notes={exercise.notes}
                                index={index}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No workout data available</p>
                    </div>
                  )}

                  {plan.workout?.notes && plan.workout.notes.length > 0 && (
                    <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-1">
                      {plan.workout.notes.map((note, i) => (
                        <p key={i} className="text-sm text-orange-200">{note}</p>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Priority Areas & Timeline */}
                {(plan.priorityAreas?.length > 0 || plan.timeline) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 bg-gradient-to-b from-orange-500/10 to-zinc-900/50 border border-orange-500/20 rounded-3xl"
                  >
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-orange-400" />
                      Plan Focus
                    </h3>
                    {plan.priorityAreas && plan.priorityAreas.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {plan.priorityAreas.map((area, i) => (
                          <span key={i} className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm">
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                    {plan.timeline && (
                      <p className="text-zinc-400 leading-relaxed">Timeline: {plan.timeline}</p>
                    )}
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-4"
                >
                  <motion.button
                    onClick={handleReset}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl border border-zinc-700 transition-all"
                  >
                    <RefreshCw className="w-5 h-5" />
                    New Plan
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(249, 115, 22, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
                  >
                    <Check className="w-5 h-5" />
                    Save Plan
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
