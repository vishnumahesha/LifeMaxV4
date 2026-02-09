'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ScanFace, 
  PersonStanding, 
  ArrowRight,
  Shield,
  Target,
  TrendingUp,
  BarChart3,
  CheckCircle,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { AppShell } from '@/components/AppShell';

// Animated counter hook - optimized with requestAnimationFrame
function useAnimatedCounter(end: number, duration: number = 2000, delay: number = 0) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setStarted(true);
      let start = 0;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        start = end * progress;
        setCount(start);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };
      
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [end, duration, delay]);
  
  return { count, started };
}

// Animated Progress Bar
function AnimatedProgressBar({ 
  value, 
  icon, 
  delay,
  color = 'accent'
}: { 
  value: number; 
  icon: string; 
  delay: number;
  color?: 'accent' | 'green' | 'yellow' | 'orange';
}) {
  const { count, started } = useAnimatedCounter(value, 1500, delay);
  const percentage = (count / 10) * 100;
  
  const colors = {
    accent: 'from-purple-500 to-purple-400',
    green: 'from-emerald-500 to-emerald-400',
    yellow: 'from-yellow-500 to-yellow-400',
    orange: 'from-orange-500 to-orange-400',
  };
  
  const glowColors = {
    accent: 'shadow-purple-500/50',
    green: 'shadow-emerald-500/50',
    yellow: 'shadow-yellow-500/50',
    orange: 'shadow-orange-500/50',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 1000, duration: 0.5 }}
      className="flex items-center gap-3"
    >
      <span className="text-lg w-6">{icon}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${colors[color]} rounded-full shadow-lg ${glowColors[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay: delay / 1000 + 0.3, duration: 1, ease: "easeOut" }}
          style={{ 
            boxShadow: started ? `0 0 20px ${color === 'accent' ? 'rgba(168,85,247,0.5)' : color === 'green' ? 'rgba(16,185,129,0.5)' : color === 'yellow' ? 'rgba(234,179,8,0.5)' : 'rgba(249,115,22,0.5)'}` : 'none'
          }}
        />
      </div>
      <span className="text-sm font-semibold text-white w-8">{count.toFixed(1)}</span>
    </motion.div>
  );
}

// Big Spinning Score Circle
function SpinningScoreCircle() {
  const [isVisible, setIsVisible] = useState(false);
  const currentScore = useAnimatedCounter(5.4, 2000, 800);
  const potentialScore = useAnimatedCounter(6.8, 2000, 1200);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const circumference = 2 * Math.PI * 85;
  const currentOffset = circumference - (currentScore.count / 10) * circumference;
  const potentialOffset = circumference - (potentialScore.count / 10) * circumference;

  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
      
      {/* Background circle */}
      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
        {/* Track */}
        <circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="rgba(39, 39, 42, 0.8)"
          strokeWidth="12"
        />
        
        {/* Potential score arc (outer glow) */}
        <motion.circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="url(#potentialGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference, opacity: 0 }}
          animate={{ 
            strokeDashoffset: potentialOffset,
            opacity: 1 
          }}
          transition={{ 
            strokeDashoffset: { delay: 1.2, duration: 2, ease: "easeOut" },
            opacity: { delay: 0.5, duration: 0.5 }
          }}
          style={{ 
            filter: 'drop-shadow(0 0 15px rgba(16, 185, 129, 0.7))'
          }}
        />
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="potentialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-zinc-400 uppercase tracking-wider mb-1"
        >
          Current → Potential
        </motion.p>
        
        <div className="flex items-center gap-2">
          <motion.span 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-4xl font-bold text-white"
            style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}
          >
            {currentScore.count.toFixed(1)}
          </motion.span>
          
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xl text-zinc-500"
          >
            →
          </motion.span>
          
          <motion.span 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="text-4xl font-bold text-emerald-400"
            style={{ textShadow: '0 0 30px rgba(16, 185, 129, 0.7)' }}
          >
            {potentialScore.count.toFixed(1)}
          </motion.span>
        </div>
      </div>
      
      {/* Spinning ring animation */}
      <motion.div
        className="absolute inset-0"
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, ease: "easeOut" }}
      >
        <svg className="w-48 h-48" viewBox="0 0 200 200">
          <motion.circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="url(#spinGradient)"
            strokeWidth="2"
            strokeDasharray="20 40"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 2, duration: 1 }}
          />
          <defs>
            <linearGradient id="spinGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    </div>
  );
}

// Phone Mockup Component
function PhoneMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
      className="relative mx-auto"
    >
      {/* Phone glow - reduced blur for performance */}
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-purple-500/20 to-emerald-500/20 rounded-[50px] blur-xl opacity-60 animate-pulse" style={{ willChange: 'opacity' }} />
      
      {/* Phone Frame */}
      <div className="relative w-[300px] h-[600px] bg-gradient-to-b from-zinc-700 to-zinc-900 rounded-[45px] p-2 shadow-2xl border border-zinc-600">
        {/* Inner glow */}
        <div className="absolute inset-2 rounded-[38px] bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
        
        {/* Screen */}
        <div className="w-full h-full bg-zinc-950 rounded-[38px] overflow-hidden relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-zinc-900 rounded-b-2xl z-10" />
          
          {/* Screen Content */}
          <div className="p-5 pt-12 h-full flex flex-col">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              <Sparkles className="w-5 h-5 text-yellow-400" style={{ filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.7))' }} />
              <span className="text-lg font-bold text-white">LifeMAX</span>
            </motion.div>
            
            {/* Main Score Circle */}
            <SpinningScoreCircle />
            
            {/* +1.4 possible badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2, duration: 0.5, type: "spring" }}
              className="mx-auto mt-4 px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full"
              style={{ boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}
            >
              <span className="text-sm font-semibold text-emerald-400">+1.4 possible</span>
            </motion.div>
            
            {/* Score Bars - staggered for better performance */}
            <div className="mt-6 space-y-3">
              <AnimatedProgressBar icon="✨" value={5.2} delay={1800} color="yellow" />
              <AnimatedProgressBar icon="👁️" value={5.8} delay={2000} color="orange" />
              <AnimatedProgressBar icon="💎" value={6.4} delay={2200} color="green" />
              <AnimatedProgressBar icon="💪" value={6.1} delay={2400} color="green" />
              <AnimatedProgressBar icon="🏆" value={5.0} delay={2600} color="orange" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating badges */}
      <motion.div
        initial={{ opacity: 0, x: 30, scale: 0 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 2.5, duration: 0.5, type: "spring" }}
        className="absolute -right-6 top-24 bg-zinc-900/90 backdrop-blur border border-emerald-500/30 rounded-xl px-4 py-2 shadow-lg"
        style={{ boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)' }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">+1.4 potential</span>
        </div>
      </motion.div>
      
    </motion.div>
  );
}

// Glowing Feature Card
function FeatureCard({ 
  icon, 
  title, 
  description, 
  features, 
  href, 
  delay,
  glowColor = 'purple'
}: { 
  icon: string; 
  title: string; 
  description: string; 
  features: string[];
  href: string;
  delay: number;
  glowColor?: 'purple' | 'green';
}) {
  const colors = {
    purple: {
      bg: 'from-purple-500/10 to-purple-500/5',
      border: 'border-purple-500/20 hover:border-purple-500/40',
      glow: 'hover:shadow-purple-500/20',
      iconBg: 'bg-purple-500/20',
    },
    green: {
      bg: 'from-emerald-500/10 to-emerald-500/5',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      glow: 'hover:shadow-emerald-500/20',
      iconBg: 'bg-emerald-500/20',
    }
  };
  
  const c = colors[glowColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
    >
      <Link href={href}>
        <div className={`relative h-full p-6 rounded-2xl bg-gradient-to-b ${c.bg} border ${c.border} transition-all duration-300 hover:shadow-2xl ${c.glow} group`}>
          {/* Glow effect on hover */}
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${c.bg} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300`} />
          
          <div className="relative">
            <div className={`w-16 h-16 ${c.iconBg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <span className="text-3xl">{icon}</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-zinc-400 text-sm mb-4">{description}</p>
            <ul className="space-y-2">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                  <CheckCircle className={`w-4 h-4 ${glowColor === 'purple' ? 'text-purple-400' : 'text-emerald-400'} flex-shrink-0`} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Glowing Benefit Card
function BenefitCard({ icon: Icon, title, description, delay }: { icon: any; title: string; description: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="relative p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-purple-500/30 transition-all duration-300 group hover:shadow-lg hover:shadow-purple-500/10"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-shadow">
          <Icon className="w-6 h-6 text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm">{description}</p>
      </div>
    </motion.div>
  );
}

// Glowing Step Card
function StepCard({ number, title, description, delay }: { number: number; title: string; description: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="text-center group"
    >
      <motion.div 
        className="w-20 h-20 rounded-2xl bg-gradient-to-b from-purple-500/20 to-purple-500/5 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 group-hover:shadow-xl group-hover:shadow-purple-500/30 transition-all duration-300"
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        <span className="text-3xl font-bold text-purple-400" style={{ textShadow: '0 0 20px rgba(168, 85, 247, 0.5)' }}>{number}</span>
      </motion.div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm">{description}</p>
    </motion.div>
  );
}

export default function HomeContent() {
  return (
    <AppShell>
      <div className="min-h-screen bg-zinc-950">
        {/* Hero Section */}
        <section className="relative px-4 pt-16 pb-24 overflow-hidden">
          {/* Animated background gradients - reduced blur for performance */}
          <div className="absolute inset-0 will-change-transform">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse" style={{ willChange: 'opacity' }} />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s', willChange: 'opacity' }} />
          </div>
          
          <div className="relative max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-purple-500/10 rounded-full border border-purple-500/20"
                  style={{ boxShadow: '0 0 30px rgba(168, 85, 247, 0.15)' }}
                >
                  <Sparkles className="w-4 h-4 text-yellow-400" style={{ filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.7))' }} />
                  <span className="text-sm font-medium text-purple-300">AI-Powered Analysis</span>
                </motion.div>
                
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
                >
                  Discover Your{' '}
                  <span 
                    className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300"
                    style={{ textShadow: '0 0 60px rgba(16, 185, 129, 0.5)' }}
                  >
                    True
                  </span>
                  <br />
                  <span 
                    className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"
                    style={{ textShadow: '0 0 60px rgba(168, 85, 247, 0.5)' }}
                  >
                    Potential
                  </span>
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg text-zinc-400 mb-10 max-w-lg mx-auto lg:mx-0"
                >
                  See your current self. Unlock your potential. Get AI-powered insights 
                  to become your best version.
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                >
                  <Link href="/face">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(168, 85, 247, 0.4)' }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold rounded-full shadow-lg shadow-purple-500/30 transition-all"
                    >
                      <span>😊</span> Face Scan
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  <Link href="/body">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(16, 185, 129, 0.4)' }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-full shadow-lg shadow-emerald-500/30 transition-all"
                    >
                      <span>🏋️</span> Body Scan
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  <Link href="/tracker">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(34, 197, 94, 0.4)' }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-full shadow-lg shadow-green-500/30 transition-all"
                    >
                      <span>🍎</span> Calorie Tracker
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  <Link href="#features">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-full border border-zinc-700 transition-all"
                    >
                      Learn More
                    </motion.button>
                  </Link>
                </motion.div>
              </div>
              
              {/* Right Content - Phone Mockup */}
              <div className="hidden lg:flex justify-center">
                <PhoneMockup />
              </div>
            </div>
            
            {/* Mobile phone mockup */}
            <div className="lg:hidden mt-12">
              <PhoneMockup />
            </div>
          </div>
        </section>

        {/* Choose Your Analysis Section */}
        <section id="features" className="px-4 py-24 bg-zinc-900/30">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-white mb-4">
                Choose Your Analysis
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Get personalized insights and actionable improvement plans
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon="😊"
                title="Face Analyzer"
                description="Detailed facial aesthetics analysis with feature breakdowns and grooming tips."
                features={[
                  "Overall rating /10",
                  "Feature breakdown (eyes, jaw, skin...)",
                  "Top 3 improvement levers",
                  "Actionable fixes with timelines"
                ]}
                href="/face"
                delay={0.1}
                glowColor="purple"
              />
              <FeatureCard
                icon="🏋️"
                title="Body Analyzer"
                description="Physique analysis with posture assessment and workout recommendations."
                features={[
                  "Overall physique rating /10",
                  "Proportions & posture analysis",
                  "Kibbe body type assessment",
                  "Workout & nutrition plan"
                ]}
                href="/body"
                delay={0.2}
                glowColor="green"
              />
              <FeatureCard
                icon="🍎"
                title="Calorie Tracker"
                description="AI-powered meal logging with photo recognition and macro tracking."
                features={[
                  "Photo-based meal logging",
                  "Barcode scanning",
                  "Daily macro tracking",
                  "Recipe builder & favorites"
                ]}
                href="/tracker"
                delay={0.3}
                glowColor="green"
              />
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-4 py-24">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <p className="text-purple-400 text-sm font-medium mb-2">Features</p>
              <h2 className="text-4xl font-bold text-white mb-4">
                Complete Aesthetics Analysis
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Powered by advanced AI to give you accurate, actionable insights.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <BenefitCard
                icon={BarChart3}
                title="Honest Scoring"
                description="Realistic calibration where 5.5 is average. No score inflation."
                delay={0.1}
              />
              <BenefitCard
                icon={Target}
                title="Current vs Potential"
                description="See where you are AND your realistic full potential."
                delay={0.15}
              />
              <BenefitCard
                icon={TrendingUp}
                title="Top 3 Levers"
                description="Highest-impact improvements with realistic timelines."
                delay={0.2}
              />
              <BenefitCard
                icon={ScanFace}
                title="Face Analysis"
                description="Eyes, nose, lips, jawline, skin, and facial harmony."
                delay={0.25}
              />
              <BenefitCard
                icon={PersonStanding}
                title="Body Analysis"
                description="Proportions, posture, and Kibbe body typing."
                delay={0.3}
              />
              <BenefitCard
                icon={Shield}
                title="Privacy First"
                description="Photos analyzed securely and never stored."
                delay={0.35}
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="px-4 py-24 bg-zinc-900/30">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <p className="text-purple-400 text-sm font-medium mb-2">How It Works</p>
              <h2 className="text-4xl font-bold text-white mb-4">
                Three Simple Steps
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Get your personalized analysis in under 60 seconds.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-12">
              <StepCard
                number={1}
                title="Upload Your Photos"
                description="Front-facing photo and optional side profile for best accuracy."
                delay={0.1}
              />
              <StepCard
                number={2}
                title="AI Analysis"
                description="Advanced AI analyzes features and proportions in seconds."
                delay={0.2}
              />
              <StepCard
                number={3}
                title="Get Results"
                description="Detailed ratings, insights, and personalized action plan."
                delay={0.3}
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-24 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[150px]" />
          </div>
          <div className="relative max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <motion.div 
                className="w-20 h-20 rounded-2xl bg-gradient-to-b from-purple-500/30 to-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-8"
                animate={{ 
                  boxShadow: ['0 0 30px rgba(168,85,247,0.3)', '0 0 60px rgba(168,85,247,0.5)', '0 0 30px rgba(168,85,247,0.3)']
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-10 h-10 text-purple-400" />
              </motion.div>
              <h2 className="text-4xl font-bold text-white mb-4">
                Ready to See Your Potential?
              </h2>
              <p className="text-zinc-400 mb-10 text-lg">
                Get your personalized analysis in under 2 minutes. Free to try.
              </p>
              <Link href="/face">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(168, 85, 247, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-lg font-semibold rounded-full shadow-xl shadow-purple-500/30"
                >
                  Start Free Analysis
                  <ArrowRight className="w-6 h-6" />
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 py-8 border-t border-zinc-800">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-yellow-400" style={{ filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.7))' }} />
              </div>
              <span className="text-sm font-bold text-white">LifeMAX</span>
            </div>
            <p className="text-xs text-zinc-500 text-center">
              AI-powered analysis. Results are estimates. © 2026 LifeMAX
            </p>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
