'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ScanFace, 
  PersonStanding, 
  Dumbbell,
  UtensilsCrossed,
  Menu,
  X,
  User,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const navItems = [
  { href: '/face', label: 'Face', icon: ScanFace, color: 'purple' },
  { href: '/body', label: 'Body', icon: PersonStanding, color: 'cyan' },
  { href: '/action', label: 'Action', icon: Dumbbell, color: 'orange' },
  { href: '/tracker', label: 'Tracker', icon: UtensilsCrossed, color: 'green' },
];

const colorClasses = {
  purple: {
    active: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    glow: 'shadow-purple-500/20',
  },
  cyan: {
    active: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    glow: 'shadow-cyan-500/20',
  },
  orange: {
    active: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    glow: 'shadow-orange-500/20',
  },
  green: {
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
  },
};

interface NavigationProps {
  user?: { email: string } | null;
  onSignOut?: () => void;
}

export function Navigation({ user, onSignOut }: NavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div 
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
              LifeMAX
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              const colors = colorClasses[item.color as keyof typeof colorClasses];
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
                      isActive
                        ? `${colors.active} shadow-lg ${colors.glow}`
                        : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* User Menu / Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-xl border border-zinc-700">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm text-zinc-300">{user.email}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onSignOut}
                  className="p-2.5 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <Link href="/auth">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all"
                >
                  Sign In
                </motion.button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="md:hidden p-2 text-zinc-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-xl overflow-hidden"
          >
            <nav className="px-4 py-6 space-y-2">
              {navItems.map((item, index) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                const colors = colorClasses[item.color as keyof typeof colorClasses];
                
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-medium transition-all border',
                        isActive
                          ? `${colors.active} shadow-lg ${colors.glow}`
                          : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/50'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
              
              <div className="pt-4 mt-4 border-t border-zinc-800">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-5 py-3 bg-zinc-800/50 rounded-xl">
                      <User className="w-5 h-5 text-zinc-500" />
                      <span className="text-sm text-zinc-300">{user.email}</span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onSignOut}
                      className="flex items-center gap-3 w-full px-5 py-4 text-zinc-400 hover:text-white rounded-2xl hover:bg-zinc-800/50 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </motion.button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <button className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/30">
                        Sign In
                      </button>
                    </Link>
                  </motion.div>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
