'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCSRF, addCSRFToken } from '@/lib/hooks/useCSRF';
import {
  Camera,
  Upload,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
  Info,
  Utensils,
  Edit3,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { MealDraft, MealItemDraft, MealType, ConfidenceLevel } from '@/types/tracker';
import { getConfidenceLevel, getConfidenceColor, getConfidenceBgColor } from '@/types/tracker';

// ============================================
// TYPES
// ============================================

type PageState = 'capture' | 'scanning' | 'review';

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
// NOTES PANEL
// ============================================

interface NotesPanelProps {
  notes: string;
  onChange: (notes: string) => void;
  disabled?: boolean;
}

function NotesPanel({ notes, onChange, disabled }: NotesPanelProps) {
  const [expanded, setExpanded] = useState(!!notes);

  const insertChip = (text: string) => {
    const newNotes = notes ? `${notes}, ${text}` : text;
    onChange(newNotes);
    setExpanded(true);
  };

  const chips = [
    { label: '🍳 Cooking method', text: 'cooked in' },
    { label: '🥫 Sauce/oil', text: 'with sauce:' },
    { label: '🍽️ Portions', text: 'portions:' },
    { label: '🏪 Restaurant', text: 'from:' },
    { label: '📝 Ingredients', text: 'ingredients:' },
  ];

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        disabled={disabled}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-300">Add details (optional)</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-xs text-zinc-500">
                List ingredients, cooking method, portions. Example: "2 eggs cooked in butter + 2 slices toast"
              </p>

              <textarea
                value={notes}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder="e.g., grilled chicken breast, steamed rice, stir-fried vegetables with soy sauce..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
                rows={3}
              />

              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => insertChip(chip.text)}
                    disabled={disabled}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-400 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// ITEM CARD
// ============================================

interface ItemCardProps {
  item: MealItemDraft;
  index: number;
  onUpdate: (index: number, updates: Partial<MealItemDraft>) => void;
  onDelete: (index: number) => void;
}

function ItemCard({ item, index, onUpdate, onDelete }: ItemCardProps) {
  const [editing, setEditing] = useState(false);
  const confidence = getConfidenceLevel(item.confidence);

  const avgCalories = (item.caloriesRange.min + item.caloriesRange.max) / 2;
  const avgProtein = (item.proteinRange.min + item.proteinRange.max) / 2;
  const avgCarbs = (item.carbsRange.min + item.carbsRange.max) / 2;
  const avgFats = (item.fatsRange.min + item.fatsRange.max) / 2;

  // Scale macros when portion changes
  const handlePortionChange = (newPortion: number) => {
    if (!item.portionG || item.portionG === 0) return;
    
    const scale = newPortion / item.portionG;
    onUpdate(index, {
      portionG: newPortion,
      caloriesRange: {
        min: Math.round(item.caloriesRange.min * scale),
        max: Math.round(item.caloriesRange.max * scale),
      },
      proteinRange: {
        min: Math.round(item.proteinRange.min * scale * 10) / 10,
        max: Math.round(item.proteinRange.max * scale * 10) / 10,
      },
      carbsRange: {
        min: Math.round(item.carbsRange.min * scale * 10) / 10,
        max: Math.round(item.carbsRange.max * scale * 10) / 10,
      },
      fatsRange: {
        min: Math.round(item.fatsRange.min * scale * 10) / 10,
        max: Math.round(item.fatsRange.max * scale * 10) / 10,
      },
      fiberRange: {
        min: Math.round(item.fiberRange.min * scale * 10) / 10,
        max: Math.round(item.fiberRange.max * scale * 10) / 10,
      },
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {editing ? (
            <input
              type="text"
              value={item.name}
              onChange={(e) => onUpdate(index, { name: e.target.value })}
              onBlur={() => setEditing(false)}
              autoFocus
              className="w-full px-2 py-1 bg-zinc-800 border border-violet-500 rounded text-white text-sm"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-white font-medium hover:text-violet-400 transition-colors text-left"
            >
              {item.name}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs ${getConfidenceColor(confidence)} ${getConfidenceBgColor(confidence)}`}>
            {Math.round(item.confidence * 100)}%
          </span>
          <button
            onClick={() => onDelete(index)}
            className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Portion Control */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-zinc-500">Portion:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePortionChange(Math.max(10, (item.portionG || 100) - 25))}
            className="p-1 bg-zinc-800 rounded hover:bg-zinc-700"
          >
            <Minus className="w-3 h-3 text-zinc-400" />
          </button>
          <input
            type="number"
            value={Math.round(item.portionG || 100)}
            onChange={(e) => handlePortionChange(parseInt(e.target.value) || 100)}
            className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-center text-sm text-white"
          />
          <span className="text-xs text-zinc-500">g</span>
          <button
            onClick={() => handlePortionChange((item.portionG || 100) + 25)}
            className="p-1 bg-zinc-800 rounded hover:bg-zinc-700"
          >
            <Plus className="w-3 h-3 text-zinc-400" />
          </button>
        </div>
        {item.portionUnit && (
          <span className="text-xs text-zinc-500">({item.portionUnit})</span>
        )}
      </div>

      {/* Macros */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 bg-zinc-800/50 rounded">
          <div className="text-sm font-semibold text-violet-400">{Math.round(avgCalories)}</div>
          <div className="text-xs text-zinc-500">cal</div>
        </div>
        <div className="p-2 bg-zinc-800/50 rounded">
          <div className="text-sm font-semibold text-red-400">{Math.round(avgProtein)}g</div>
          <div className="text-xs text-zinc-500">protein</div>
        </div>
        <div className="p-2 bg-zinc-800/50 rounded">
          <div className="text-sm font-semibold text-amber-400">{Math.round(avgCarbs)}g</div>
          <div className="text-xs text-zinc-500">carbs</div>
        </div>
        <div className="p-2 bg-zinc-800/50 rounded">
          <div className="text-sm font-semibold text-blue-400">{Math.round(avgFats)}g</div>
          <div className="text-xs text-zinc-500">fats</div>
        </div>
      </div>

      {/* Assumptions */}
      {item.assumptions && item.assumptions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 text-zinc-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-zinc-500">
              Assumed: {item.assumptions.join(', ')}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// MEAL TYPE SELECTOR
// ============================================

function MealTypeSelector({ value, onChange }: { value: MealType; onChange: (v: MealType) => void }) {
  const types: Array<{ value: MealType; label: string; emoji: string }> = [
    { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { value: 'lunch', label: 'Lunch', emoji: '☀️' },
    { value: 'dinner', label: 'Dinner', emoji: '🌙' },
    { value: 'snack', label: 'Snack', emoji: '🍿' },
  ];

  return (
    <div className="flex gap-2">
      {types.map((type) => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            value === type.value
              ? 'bg-violet-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <span className="mr-1">{type.emoji}</span>
          {type.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// MAIN SCANNER COMPONENT
// ============================================

export default function PhotoMealScanner() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token: csrfToken, loading: csrfLoading, error: csrfError } = useCSRF();

  const [state, setState] = useState<PageState>('capture');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [items, setItems] = useState<MealItemDraft[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [notesChanged, setNotesChanged] = useState(false);

  // Detect current meal time
  useState(() => {
    const hour = new Date().getHours();
    if (hour < 10) setMealType('breakfast');
    else if (hour < 14) setMealType('lunch');
    else if (hour < 18) setMealType('snack');
    else setMealType('dinner');
  });

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!photoPreview) {
      toast.error('Please select a photo first');
      return;
    }

    setState('scanning');
    setScanError(null);

    try {
      // Convert base64 to file
      const response = await fetch(photoPreview);
      const blob = await response.blob();
      const file = new File([blob], 'meal.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('mealType', mealType);
      formData.append('consumedAt', new Date().toISOString());
      if (userNotes) {
        formData.append('userNotes', userNotes);
      }

      const result = await fetch('/api/meals/photo/scan', {
        method: 'POST',
        body: formData,
      });

      const data = await result.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Scan failed');
      }

      setDraft(data.data.draft);
      setItems(data.data.draft.items);
      setNotesChanged(false);
      setState('review');
    } catch (err) {
      console.error('Scan error:', err);
      setScanError(err instanceof Error ? err.message : 'Failed to scan meal');
      setState('capture');
      toast.error(err instanceof Error ? err.message : 'Failed to scan meal');
    }
  };

  const handleRefine = async () => {
    if (!notesChanged || !photoPreview) return;
    await handleScan();
  };

  const handleUpdateItem = (index: number, updates: Partial<MealItemDraft>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmLog = async () => {
    if (!draft || items.length === 0) return;

    if (!csrfToken) {
      toast.error('Security token not ready. Please wait a moment and try again.');
      return;
    }

    try {
      const response = await fetch('/api/meals', addCSRFToken(csrfToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: draft.photoUrl,
          scanHash: draft.scanHash,
          notesHash: draft.notesHash,
          combinedHash: draft.combinedHash,
          mealType: draft.mealType,
          consumedAt: draft.consumedAt,
          source: 'photo',
          userNotes,
          items: items.map(item => ({
            name: item.name,
            portionG: item.portionG,
            portionUnit: item.portionUnit,
            caloriesEstMin: item.caloriesRange.min,
            caloriesEstMax: item.caloriesRange.max,
            proteinEstMin: item.proteinRange.min,
            proteinEstMax: item.proteinRange.max,
            carbsEstMin: item.carbsRange.min,
            carbsEstMax: item.carbsRange.max,
            fatsEstMin: item.fatsRange.min,
            fatsEstMax: item.fatsRange.max,
            fiberEstMin: item.fiberRange.min,
            fiberEstMax: item.fiberRange.max,
            confidence: item.confidence,
            method: 'ai',
            refinementSource: userNotes ? 'photo_plus_notes' : 'photo_only',
          })),
        }),
      }));

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error?.message || 'Failed to save meal');
      }

      toast.success('Meal logged successfully!');
      router.push('/tracker');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save meal');
    }
  };

  // Calculate totals
  const totalCalories = items.reduce((sum, item) => sum + (item.caloriesRange.min + item.caloriesRange.max) / 2, 0);
  const avgConfidence = items.length > 0
    ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
    : 0;

  return (
    <ErrorBoundary>
      <AppShell>
        <BackgroundOrbs />

        <div className="max-w-2xl mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Photo Meal Scanner</h1>
            <p className="text-sm text-zinc-400">AI-powered nutrition analysis</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Capture State */}
          {state === 'capture' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Photo Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-video rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${
                  photoPreview
                    ? 'border-violet-500'
                    : 'border-zinc-700 hover:border-violet-500/50'
                }`}
              >
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="Meal preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mb-4">
                      <Camera className="w-8 h-8 text-violet-400" />
                    </div>
                    <p className="text-zinc-400 font-medium">Tap to take or upload photo</p>
                    <p className="text-sm text-zinc-500 mt-1">JPG, PNG up to 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>

              {/* Meal Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Meal Type</label>
                <MealTypeSelector value={mealType} onChange={setMealType} />
              </div>

              {/* Notes Panel */}
              <NotesPanel
                notes={userNotes}
                onChange={(notes) => {
                  setUserNotes(notes);
                  setNotesChanged(true);
                }}
              />

              {/* Scan Button */}
              <button
                onClick={handleScan}
                disabled={!photoPreview}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  photoPreview
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                Analyze Meal
              </button>

              {scanError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div className="text-sm text-red-400">{scanError}</div>
                </div>
              )}
            </motion.div>
          )}

          {/* Scanning State */}
          {state === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-20 text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
                <Utensils className="absolute inset-0 m-auto w-10 h-10 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Analyzing Your Meal</h3>
              <p className="text-zinc-400 text-sm">Detecting items and estimating portions...</p>
              {userNotes && (
                <p className="text-violet-400 text-xs mt-2">Including your details in analysis</p>
              )}
            </motion.div>
          )}

          {/* Review State */}
          {state === 'review' && draft && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Photo + Summary */}
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative">
                  {photoPreview && (
                    <Image src={photoPreview} alt="Meal" fill className="object-cover" unoptimized />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-violet-400">
                      {Math.round(totalCalories)} cal
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      getConfidenceColor(getConfidenceLevel(avgConfidence))
                    } ${getConfidenceBgColor(getConfidenceLevel(avgConfidence))}`}>
                      {Math.round(avgConfidence * 100)}% confident
                    </span>
                  </div>
                  <div className="text-sm text-zinc-400">
                    {items.length} item{items.length !== 1 ? 's' : ''} detected
                  </div>
                  {draft.warnings.length > 0 && (
                    <div className="mt-2 flex items-start gap-1 text-xs text-amber-400">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {draft.warnings[0]}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Panel (for refinement) */}
              <NotesPanel
                notes={userNotes}
                onChange={(notes) => {
                  setUserNotes(notes);
                  setNotesChanged(true);
                }}
              />

              {notesChanged && (
                <button
                  onClick={handleRefine}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center gap-2 text-violet-400"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refine estimate with new details
                </button>
              )}

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Detected Items</h3>
                  <button className="text-sm text-violet-400 flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    Add item
                  </button>
                </div>

                <AnimatePresence>
                  {items.map((item, index) => (
                    <ItemCard
                      key={`${item.name}-${index}`}
                      item={item}
                      index={index}
                      onUpdate={handleUpdateItem}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </AnimatePresence>

                {items.length === 0 && (
                  <div className="py-8 text-center text-zinc-500">
                    No items detected. Add items manually.
                  </div>
                )}
              </div>

              {/* Photo Quality Warning */}
              {draft.photoQuality.score < 0.6 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-amber-400">Photo quality could be better</div>
                    <div className="text-xs text-amber-400/80 mt-1">
                      {draft.photoQuality.issues.join('. ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 sticky bottom-4">
                <button
                  onClick={() => {
                    setState('capture');
                    setDraft(null);
                    setItems([]);
                  }}
                  className="px-6 py-4 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700"
                >
                  Retake
                </button>
                <button
                  onClick={handleConfirmLog}
                  disabled={items.length === 0}
                  className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
                    items.length > 0
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  Log Meal ({Math.round(totalCalories)} cal)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
    </ErrorBoundary>
  );
}
