import React, { useState } from 'react';
import {
  Palette,
  Sparkles,
  Mail,
  Copy,
  Check,
  Printer,
  HeartHandshake,
  Cake,
  GraduationCap,
  Plus,
} from 'lucide-react';
import type {
  EventPlanWorkspace,
  ThemeBoardItem,
  ThemeStyleCategory,
  CulturalCeremonyFunction,
} from '../types/event';
import {
  generateInvitationViaServer,
  generateThemeBoardViaServer,
} from '../services/gemini/geminiService';
import { formatCurrency } from '../utils/calculations';

const THEME_STYLES: ThemeStyleCategory[] = [
  'Traditional',
  'Modern',
  'Minimalist',
  'Luxury',
  'Rustic',
  'Floral',
  'Sustainable',
  'Custom',
];

// ============================================================================
// 1. VISUAL THEME STUDIO (DreamBoard AI) — Section 16
// ============================================================================
interface ThemeStudioProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const ThemeStudioView: React.FC<ThemeStudioProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<ThemeStyleCategory>('Traditional');
  const [colorPref, setColorPref] = useState('Emerald Green, Champagne Gold, and Warm Ivory');
  const [season, setSeason] = useState('Winter Evening');
  const [mood, setMood] = useState('Regal, Warm & Celebratory');
  const [generating, setGenerating] = useState(false);
  const [themeFeedback, setThemeFeedback] = useState<string | null>(null);

  const activeTheme =
    event.themes.find((t) => t.id === event.activeThemeId) || event.themes[0];

  const handleGenerateTheme = async () => {
    setGenerating(true);
    setThemeFeedback(null);
    try {
      const res = await generateThemeBoardViaServer({
        eventType: event.eventType,
        styleCategory: selectedStyle,
        colorPreferences: colorPref,
        venueType: event.venueType,
        season,
        budget: event.totalBudget,
        culturalStyle: event.culturalTradition,
        mood,
      });

      const newTheme: ThemeBoardItem = {
        id: `th_${Date.now()}`,
        ...res.themeBoard,
        styleCategory: selectedStyle,
      };

      onUpdateEvent({
        ...event,
        themes: [newTheme, ...event.themes],
        activeThemeId: newTheme.id,
        updatedAt: new Date().toISOString(),
      });
      setThemeFeedback(
        `Generated "${newTheme.title}" (${res.source === 'gemini' ? 'Live Gemini AI' : 'Validated Fallback'}).`
      );
    } catch (err) {
      setThemeFeedback(
        err instanceof Error ? err.message : 'Unable to generate theme board right now.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateSwatchHex = (swatchIndex: number, newHex: string) => {
    if (!activeTheme) return;
    const updatedPalette = activeTheme.colorPalette.map((s, idx) =>
      idx === swatchIndex ? { ...s, hex: newHex } : s
    );
    const updatedThemes = event.themes.map((t) =>
      t.id === activeTheme.id ? { ...t, colorPalette: updatedPalette } : t
    );
    onUpdateEvent({ ...event, themes: updatedThemes });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
            <Palette className="w-6 h-6 text-[#047857]" />
            <span>Visual Theme Studio & Moodboard Architect</span>
          </h1>
          <p className="text-xs text-[#6B7280]">
            Generate and compare Traditional, Modern, Minimalist, Luxury, Rustic, Floral, and Sustainable design boards. Note: Concept visuals are inspiration boards, not confirmed vendor deliverables.
          </p>
        </div>
      </div>

      {/* Style Comparison Selector & Generator Bar */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap gap-2">
          {THEME_STYLES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStyle(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                selectedStyle === st
                  ? 'bg-[#047857] text-white border-[#047857]'
                  : 'border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="th-colors" className="block text-xs font-medium mb-1">
              Preferred Color Direction
            </label>
            <input
              id="th-colors"
              type="text"
              value={colorPref}
              onChange={(e) => setColorPref(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>
          <div>
            <label htmlFor="th-season" className="block text-xs font-medium mb-1">
              Season & Lighting Window
            </label>
            <input
              id="th-season"
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>
          <div>
            <label htmlFor="th-mood" className="block text-xs font-medium mb-1">
              Preferred Atmosphere / Mood
            </label>
            <input
              id="th-mood"
              type="text"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#6B7280]">Saved Theme Boards:</span>
            {event.themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onUpdateEvent({ ...event, activeThemeId: t.id })}
                className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  t.id === activeTheme?.id
                    ? 'bg-[#ECFDF5] text-[#064E3B] border border-[#047857]'
                    : 'bg-stone-100 dark:bg-slate-800 text-[#6B7280]'
                }`}
              >
                {t.title} ({t.styleCategory})
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={generating}
            onClick={handleGenerateTheme}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generating ? 'Designing Theme Board...' : `Generate ${selectedStyle} Theme Board`}</span>
          </button>
        </div>

        {themeFeedback && (
          <p className="text-xs font-medium text-[#047857] dark:text-emerald-400">{themeFeedback}</p>
        )}
      </div>

      {/* Active Theme Board Showcase */}
      {activeTheme && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Dynamic SVG Concept Canvas & Editable Color Swatches */}
          <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#047857]">
                {activeTheme.styleCategory} Concept Visual (Illustrative Inspiration)
              </p>
              <h2 className="text-2xl font-display font-bold mt-0.5">{activeTheme.title}</h2>
              <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                {activeTheme.description}
              </p>
            </div>

            {/* Dynamic Live-Colored Architectural Stage Preview SVG */}
            <div className="rounded-xl overflow-hidden border border-[#E5E7EB] dark:border-slate-800">
              <svg
                viewBox="0 0 500 280"
                className="w-full h-48 object-cover"
                role="img"
                aria-label={`Concept visualization for ${activeTheme.title}`}
              >
                <rect
                  width="500"
                  height="280"
                  fill={activeTheme.colorPalette[0]?.hex || '#047857'}
                />
                <path
                  d="M 70 280 L 70 90 Q 250 10 430 90 L 430 280 Z"
                  fill={activeTheme.colorPalette[2]?.hex || '#FAF8F2'}
                  opacity="0.92"
                />
                <path
                  d="M 130 280 L 130 120 Q 250 55 370 120 L 370 280 Z"
                  fill={activeTheme.colorPalette[3]?.hex || '#991B1B'}
                  opacity="0.18"
                />
                <rect
                  x="175"
                  y="195"
                  width="150"
                  height="48"
                  rx="10"
                  fill={activeTheme.colorPalette[1]?.hex || '#D4AF65'}
                />
                <circle
                  cx="250"
                  cy="95"
                  r="22"
                  fill={activeTheme.colorPalette[1]?.hex || '#D4AF65'}
                  opacity="0.8"
                />
              </svg>
            </div>

            {/* Editable Color Swatches */}
            <div>
              <p className="text-xs font-semibold mb-2">
                Editable Color Swatches (Click swatch to customize hex)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {activeTheme.colorPalette.map((sw, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg border border-[#E5E7EB] dark:border-slate-800 flex items-center gap-2"
                  >
                    <input
                      type="color"
                      aria-label={`Edit ${sw.name} color`}
                      value={sw.hex}
                      onChange={(e) => handleUpdateSwatchHex(idx, e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <div className="text-xs truncate">
                      <p className="font-medium truncate">{sw.name}</p>
                      <p className="font-mono text-[10px] text-[#6B7280]">{sw.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 7 Cols: 10 Detailed Design Specifications */}
          <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {[
              { label: 'Typography Pairing', val: activeTheme.typography },
              { label: 'Decoration Ideas', val: activeTheme.decorationIdeas },
              { label: 'Floral Arrangements', val: activeTheme.floralArrangements },
              { label: 'Lighting Design', val: activeTheme.lightingIdeas },
              { label: 'Table Settings', val: activeTheme.tableSettings },
              { label: 'Entrance Concept', val: activeTheme.entranceDesign },
              { label: 'Stage / Backdrop Concept', val: activeTheme.stageConcept },
              { label: 'Photo Booth Concept', val: activeTheme.photoBoothConcept },
              { label: 'Invitation Stationery Direction', val: activeTheme.invitationDirection },
              { label: 'Budget-Conscious Alternatives', val: activeTheme.budgetAlternatives },
            ].map((spec) => (
              <div
                key={spec.label}
                className="p-3.5 rounded-xl bg-[#FAF8F2] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 space-y-1"
              >
                <p className="font-semibold text-[#047857] dark:text-emerald-400">{spec.label}</p>
                <p className="text-[#1F2937] dark:text-slate-300 leading-relaxed">{spec.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. INVITATION CREATOR (English, Bengali & Hindi) — Section 17
// ============================================================================
interface InvitationCreatorProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const InvitationCreatorView: React.FC<InvitationCreatorProps> = ({
  event,
  onUpdateEvent,
}) => {
  const inv = event.invitation;
  const [activeTab, setActiveTab] = useState<
    'formalCard' | 'casualVersion' | 'whatsappMessage' | 'emailBody' | 'socialAnnouncement'
  >('formalCard');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invFeedback, setInvFeedback] = useState<string | null>(null);

  const updateInvField = (field: keyof typeof inv, val: string) => {
    onUpdateEvent({
      ...event,
      invitation: { ...inv, [field]: val },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleGenerateWording = async () => {
    setGenerating(true);
    setInvFeedback(null);
    try {
      const res = await generateInvitationViaServer({
        eventName: inv.eventName,
        hostNames: inv.hostNames,
        date: inv.date,
        time: inv.time,
        venue: inv.venue,
        rsvpContact: inv.rsvpContact,
        language: inv.language,
        formality: inv.formality,
        theme: inv.theme,
        dressCode: inv.dressCode,
        specialInstructions: inv.specialInstructions,
      });
      if (res.invitation) {
        onUpdateEvent({
          ...event,
          invitation: { ...inv, ...res.invitation },
          updatedAt: new Date().toISOString(),
        });
        setInvFeedback(
          `Updated invitation suite in ${inv.language} (${res.source === 'gemini' ? 'Live Gemini AI' : 'Validated Fallback'}).`
        );
      }
    } catch (err) {
      setInvFeedback(
        err instanceof Error ? err.message : 'Unable to generate invitation wording right now.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard?.writeText(inv[activeTab] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
          <Mail className="w-6 h-6 text-[#047857]" />
          <span>Multi-Language Invitation Creator</span>
        </h1>
        <p className="text-xs text-[#6B7280]">
          Generate Formal, Casual, WhatsApp, Email, and Printable invitation suites in English, Bengali (বাংলা), and Hindi (हिन्दी) using strictly your verified event dates and venue details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Invitation Details Form */}
        <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3 text-xs">
          <h2 className="text-base font-display font-bold">Invitation Parameters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="inv-event-name" className="block font-medium mb-1">
                Event Title on Card
              </label>
              <input
                id="inv-event-name"
                type="text"
                value={inv.eventName}
                onChange={(e) => updateInvField('eventName', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="inv-hosts" className="block font-medium mb-1">
                Host Names
              </label>
              <input
                id="inv-hosts"
                type="text"
                value={inv.hostNames}
                onChange={(e) => updateInvField('hostNames', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="inv-date" className="block font-medium mb-1">
                Date
              </label>
              <input
                id="inv-date"
                type="text"
                value={inv.date}
                onChange={(e) => updateInvField('date', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="inv-time" className="block font-medium mb-1">
                Time
              </label>
              <input
                id="inv-time"
                type="text"
                value={inv.time}
                onChange={(e) => updateInvField('time', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="inv-venue" className="block font-medium mb-1">
                Venue Address
              </label>
              <input
                id="inv-venue"
                type="text"
                value={inv.venue}
                onChange={(e) => updateInvField('venue', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="inv-lang" className="block font-medium mb-1">
                Language
              </label>
              <select
                id="inv-lang"
                value={inv.language}
                onChange={(e) =>
                  updateInvField('language', e.target.value as 'English' | 'Bengali' | 'Hindi')
                }
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="Bengali">Bengali + English (বাংলা)</option>
                <option value="Hindi">Hindi + English (हिन्दी)</option>
                <option value="English">English</option>
              </select>
            </div>
            <div>
              <label htmlFor="inv-dress" className="block font-medium mb-1">
                Dress Code
              </label>
              <input
                id="inv-dress"
                type="text"
                value={inv.dressCode}
                onChange={(e) => updateInvField('dressCode', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="inv-rsvp" className="block font-medium mb-1">
                RSVP Contact
              </label>
              <input
                id="inv-rsvp"
                type="text"
                value={inv.rsvpContact}
                onChange={(e) => updateInvField('rsvpContact', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={generating}
            onClick={handleGenerateWording}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#047857] hover:bg-[#064E3B] text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? 'Generating Wording...' : 'Regenerate Multi-Format Suite with AI'}</span>
          </button>
          {invFeedback && (
            <p className="text-xs font-medium text-[#047857] dark:text-emerald-400">{invFeedback}</p>
          )}
        </div>

        {/* Right 6 Cols: Visual Printable Card Preview & Format Tabs */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-stone-200/70 dark:bg-slate-800 text-xs">
            {(
              [
                { id: 'formalCard', label: 'Printable Card' },
                { id: 'whatsappMessage', label: 'WhatsApp' },
                { id: 'emailBody', label: 'Email' },
                { id: 'casualVersion', label: 'Casual' },
                { id: 'socialAnnouncement', label: 'Social Post' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                    : 'text-[#6B7280]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Printable Visual Invitation Card Frame */}
          <div
            className="p-8 rounded-2xl border-2 text-center space-y-4 shadow-sm"
            style={{
              borderColor: '#D4AF65',
              backgroundColor: '#FAF8F2',
              color: '#1F2937',
            }}
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[#047857]">
              {inv.regionalScriptNote}
            </p>
            <h3 className="text-2xl font-display font-bold text-[#064E3B]">{inv.eventName}</h3>
            <textarea
              aria-label="Editable invitation wording preview"
              rows={9}
              value={inv[activeTab]}
              onChange={(e) => updateInvField(activeTab, e.target.value)}
              className="w-full p-3 text-xs leading-relaxed text-center bg-white/80 rounded-xl border border-[#D4AF65]/50 text-[#1F2937]"
            />
            <div className="flex items-center justify-center gap-3 pt-2 no-print">
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Wording'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-[#064E3B] text-[#064E3B] cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. SPECIALIZED CELEBRATION MODES (Indian Wedding, Birthday, College/Community)
//    Sections 13, 14, 15
// ============================================================================
interface SpecializedPlannersProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const SpecializedPlannersView: React.FC<SpecializedPlannersProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [mode, setMode] = useState<'wedding' | 'birthday' | 'community'>('wedding');
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorPledged, setNewSponsorPledged] = useState(50000);
  const [newCeremonyName, setNewCeremonyName] = useState('');
  const [newCeremonyBudget, setNewCeremonyBudget] = useState(50000);
  const [newBdayItem, setNewBdayItem] = useState('');

  const toggleCeremonyEnabled = (fnId: string) => {
    const updated = event.culturalFunctions.map((fn) =>
      fn.id === fnId ? { ...fn, enabled: !fn.enabled } : fn
    );
    onUpdateEvent({ ...event, culturalFunctions: updated });
  };

  const handleAddCeremony = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCeremonyName.trim()) return;
    const newFn: CulturalCeremonyFunction = {
      id: `cf_${Date.now()}`,
      name: newCeremonyName.trim(),
      enabled: true,
      date: event.eventDate,
      timeSlot: '6:00 PM – 10:00 PM',
      venueRequirement: `${event.venueType} Ceremony Space`,
      guestCount: event.guestCount,
      budgetAllocation: Math.max(0, Number(newCeremonyBudget) || 25000),
      decorationConcept: 'Seasonal floral arches and warm brass ambient lighting',
      cateringNotes: 'Regional festive menu with live chaat & sweet counters',
      attireChecklist: ['Festive traditional attire', 'Welcome floral garlands'],
      vendorRequirements: ['Ceremony Decorator', 'Priest/Officiant', 'Sound Setup'],
      familyTasks: ['Host welcome duties', 'Arranging ritual samagri'],
    };
    onUpdateEvent({
      ...event,
      culturalFunctions: [...event.culturalFunctions, newFn],
    });
    setNewCeremonyName('');
  };

  const handleAddBdayChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBdayItem.trim()) return;
    onUpdateEvent({
      ...event,
      birthdayConfig: {
        ...event.birthdayConfig,
        decorShoppingChecklist: [
          ...event.birthdayConfig.decorShoppingChecklist,
          { item: newBdayItem.trim(), checked: false },
        ],
      },
    });
    setNewBdayItem('');
  };

  const handleAddSponsor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponsorName.trim()) return;
    const sp = {
      id: `sp_${Date.now()}`,
      sponsorName: newSponsorName.trim(),
      contactDetails: 'Manual Sponsor Entry',
      tierPackage: 'Gold' as const,
      amountPledged: Number(newSponsorPledged) || 25000,
      amountReceived: 0,
      deliverables: 'Stage backdrop logo & social media mention',
      logoPromotionStatus: 'Pending' as const,
      followUpStatus: 'Pledged' as const,
    };
    onUpdateEvent({
      ...event,
      communityConfig: {
        ...event.communityConfig,
        sponsors: [...event.communityConfig.sponsors, sp],
      },
    });
    setNewSponsorName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            Specialized Celebration Modes
          </h1>
          <p className="text-xs text-[#6B7280]">
            Switch between ShaadiSmart Cultural Wedding Functions, PartyPilot Birthday Planner, and CommunitySpark Campus & NGO Coordinator.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-stone-200/70 dark:bg-slate-800 self-start">
          <button
            type="button"
            onClick={() => setMode('wedding')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
              mode === 'wedding'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                : 'text-[#6B7280]'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Indian Wedding & Cultural</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('birthday')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
              mode === 'birthday'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                : 'text-[#6B7280]'
            }`}
          >
            <Cake className="w-3.5 h-3.5" />
            <span>Birthday & Party</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('community')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
              mode === 'community'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                : 'text-[#6B7280]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>College & Community</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Indian Wedding & Cultural Planner (ShaadiSmart AI) */}
      {mode === 'wedding' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-display font-bold">
                  Regional Tradition & Multi-Day Function Selector
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Select your regional tradition, toggle active ceremonies, or add custom family functions.
                </p>
              </div>
              <select
                aria-label="Select Regional Wedding Tradition"
                value={event.culturalTraditionType}
                onChange={(e) =>
                  onUpdateEvent({
                    ...event,
                    culturalTraditionType: e.target.value as EventPlanWorkspace['culturalTraditionType'],
                  })
                }
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="Bengali">Bengali Wedding (Biye & Boubhat)</option>
                <option value="Punjabi">Punjabi Wedding (Roka, Sangeet, Anand Karaj)</option>
                <option value="South Indian">South Indian Wedding (Muhurtham & Sadhya)</option>
                <option value="Gujarati">Gujarati Wedding (Garba, Mandap Mahurat)</option>
                <option value="Marathi">Marathi Wedding (Sakhar Puda, Saptapadi)</option>
                <option value="Intercultural">Intercultural Fusion Celebration</option>
                <option value="Custom">User-Defined Ceremonies</option>
              </select>
            </div>

            <form onSubmit={handleAddCeremony} className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E7EB] dark:border-slate-800 text-xs">
              <input
                type="text"
                aria-label="Custom ceremony name"
                value={newCeremonyName}
                onChange={(e) => setNewCeremonyName(e.target.value)}
                placeholder="Add ceremony (e.g., Mehendi Night, Cocktail Sangeet)..."
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
              <input
                type="number"
                aria-label="Ceremony budget allocation"
                value={newCeremonyBudget}
                onChange={(e) => setNewCeremonyBudget(Number(e.target.value))}
                className="w-32 px-3 py-1.5 font-mono rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#047857] text-white font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ceremony</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {event.culturalFunctions.map((fn) => (
              <div
                key={fn.id}
                className={`p-5 rounded-xl border transition-opacity ${
                  fn.enabled
                    ? 'bg-white dark:bg-slate-900 border-[#E5E7EB] dark:border-slate-800'
                    : 'bg-stone-100/50 dark:bg-slate-900/30 border-[#E5E7EB] opacity-60'
                } space-y-3 text-xs`}
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-display font-bold text-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fn.enabled}
                      onChange={() => toggleCeremonyEnabled(fn.id)}
                      className="accent-[#047857] h-4 w-4"
                    />
                    <span>{fn.name}</span>
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-[#047857]">
                    {formatCurrency(fn.budgetAllocation, event.currency)}
                  </span>
                </div>
                <p className="text-[#6B7280] font-mono">
                  {fn.date} · {fn.timeSlot} · {fn.guestCount} Guests
                </p>
                <p>
                  <strong>Venue & Decor:</strong> {fn.venueRequirement} — {fn.decorationConcept}
                </p>
                <p>
                  <strong>Regional Cuisine:</strong> {fn.cateringNotes}
                </p>
                <div>
                  <strong>Attire & Ritual Checklist:</strong>
                  <ul className="list-disc pl-4 text-[#6B7280] mt-1">
                    {fn.attireChecklist.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode 2: Party & Birthday Planner (PartyPilot AI) */}
      {mode === 'birthday' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
            <h2 className="text-lg font-display font-bold">
              Birthday & Private Party Configuration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="bday-name" className="block font-medium mb-1">
                  Honoree Name
                </label>
                <input
                  id="bday-name"
                  type="text"
                  value={event.birthdayConfig.honoreeName}
                  onChange={(e) =>
                    onUpdateEvent({
                      ...event,
                      birthdayConfig: { ...event.birthdayConfig, honoreeName: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="bday-age" className="block font-medium mb-1">
                  Age Group
                </label>
                <select
                  id="bday-age"
                  value={event.birthdayConfig.ageGroup}
                  onChange={(e) =>
                    onUpdateEvent({
                      ...event,
                      birthdayConfig: {
                        ...event.birthdayConfig,
                        ageGroup: e.target.value as typeof event.birthdayConfig.ageGroup,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="Kids (1-12)">Kids (1-12)</option>
                  <option value="Teen (13-19)">Teen (13-19)</option>
                  <option value="Young Adult (20-35)">Young Adult (20-35)</option>
                  <option value="Milestone (40/50/60+)">Milestone (40/50/60+)</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="bday-cake" className="block font-medium mb-1">
                Cake & Dessert Concept
              </label>
              <input
                id="bday-cake"
                type="text"
                value={event.birthdayConfig.cakeFlavorAndDesign}
                onChange={(e) =>
                  onUpdateEvent({
                    ...event,
                    birthdayConfig: {
                      ...event.birthdayConfig,
                      cakeFlavorAndDesign: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="bday-music" className="block font-medium mb-1">
                Music & Entertainment
              </label>
              <input
                id="bday-music"
                type="text"
                value={event.birthdayConfig.musicAndEntertainment}
                onChange={(e) =>
                  onUpdateEvent({
                    ...event,
                    birthdayConfig: {
                      ...event.birthdayConfig,
                      musicAndEntertainment: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="bday-favors" className="block font-medium mb-1">
                Party Favors & Return Gifts
              </label>
              <input
                id="bday-favors"
                type="text"
                value={event.birthdayConfig.partyFavors}
                onChange={(e) =>
                  onUpdateEvent({
                    ...event,
                    birthdayConfig: {
                      ...event.birthdayConfig,
                      partyFavors: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="bday-backup" className="block font-medium mb-1">
                Indoor Weather Backup Plan
              </label>
              <input
                id="bday-backup"
                type="text"
                value={event.birthdayConfig.indoorBackupPlan}
                onChange={(e) =>
                  onUpdateEvent({
                    ...event,
                    birthdayConfig: {
                      ...event.birthdayConfig,
                      indoorBackupPlan: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
          </div>

          <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
            <h2 className="text-lg font-display font-bold">
              Decoration Shopping Checklist & Activities
            </h2>
            <form onSubmit={handleAddBdayChecklistItem} className="flex gap-2">
              <input
                type="text"
                aria-label="New party shopping item"
                value={newBdayItem}
                onChange={(e) => setNewBdayItem(e.target.value)}
                placeholder="Add shopping item (e.g., LED number marquee)..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#047857] text-white font-semibold cursor-pointer"
              >
                Add
              </button>
            </form>
            <div className="space-y-2">
              {event.birthdayConfig.decorShoppingChecklist.map((chk, idx) => (
                <label key={idx} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chk.checked}
                    onChange={() => {
                      const nextList = event.birthdayConfig.decorShoppingChecklist.map((c, i) =>
                        i === idx ? { ...c, checked: !c.checked } : c
                      );
                      onUpdateEvent({
                        ...event,
                        birthdayConfig: {
                          ...event.birthdayConfig,
                          decorShoppingChecklist: nextList,
                        },
                      });
                    }}
                    className="accent-[#047857]"
                  />
                  <span className={chk.checked ? 'line-through text-[#6B7280]' : ''}>
                    {chk.item}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: College & Community Event Planner (CommunitySpark AI) */}
      {mode === 'community' && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800">
              <p className="text-[#6B7280]">Event Sub-Type</p>
              <p className="text-lg font-display font-bold mt-1">
                {event.communityConfig.subType}
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800">
              <p className="text-[#6B7280]">Delegate Registrations</p>
              <p className="text-lg font-mono font-bold mt-1">
                {event.communityConfig.confirmedRegistrations} /{' '}
                {event.communityConfig.expectedRegistrations} Confirmed
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800">
              <p className="text-[#6B7280]">Total Sponsorship Pledged</p>
              <p className="text-lg font-mono font-bold text-[#047857] mt-1">
                {formatCurrency(
                  event.communityConfig.sponsors.reduce((s, sp) => s + sp.amountPledged, 0),
                  event.currency
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Committees & Stage/Safety Checklists */}
            <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
              <h2 className="text-base font-display font-bold">
                Volunteer Committees & Stage/Safety Checklists
              </h2>
              <div className="space-y-2">
                {event.communityConfig.committees.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-[#FAF8F2] dark:bg-slate-950 flex justify-between"
                  >
                    <span>
                      <strong>{c.role}</strong> · Lead: {c.leadName}
                    </span>
                    <span className="font-mono">{c.volunteersCount} Volunteers</span>
                  </div>
                ))}
              </div>
              <p className="font-semibold pt-2">Safety & Accessibility Checklist:</p>
              <div className="space-y-1.5">
                {event.communityConfig.safetyAndAccessibilityChecklist.map((item, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => {
                        const updatedList =
                          event.communityConfig.safetyAndAccessibilityChecklist.map((chk, idx) =>
                            idx === i ? { ...chk, checked: !chk.checked } : chk
                          );
                        onUpdateEvent({
                          ...event,
                          communityConfig: {
                            ...event.communityConfig,
                            safetyAndAccessibilityChecklist: updatedList,
                          },
                        });
                      }}
                      className="accent-[#047857]"
                    />
                    <span className={item.checked ? 'line-through text-[#6B7280]' : ''}>
                      {item.item}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sponsorship CRM */}
            <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
              <h2 className="text-base font-display font-bold">
                Sponsorship Tracker (Offline Manual CRM)
              </h2>
              <form onSubmit={handleAddSponsor} className="flex gap-2">
                <input
                  type="text"
                  aria-label="Sponsor Name"
                  value={newSponsorName}
                  onChange={(e) => setNewSponsorName(e.target.value)}
                  placeholder="Add sponsor name..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                />
                <input
                  type="number"
                  aria-label="Amount Pledged"
                  value={newSponsorPledged}
                  onChange={(e) => setNewSponsorPledged(Number(e.target.value))}
                  className="w-28 px-3 py-1.5 font-mono rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#047857] text-white font-semibold cursor-pointer"
                >
                  Add
                </button>
              </form>
              <div className="space-y-2">
                {event.communityConfig.sponsors.map((sp) => (
                  <div
                    key={sp.id}
                    className="p-3 rounded-lg border border-[#E5E7EB] dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                      <span>
                        {sp.sponsorName} ({sp.tierPackage})
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[#047857]">
                        <span>Received:</span>
                        <input
                          type="number"
                          aria-label={`Received amount from ${sp.sponsorName}`}
                          value={sp.amountReceived}
                          onChange={(e) => {
                            const rec = Math.max(0, Number(e.target.value) || 0);
                            onUpdateEvent({
                              ...event,
                              communityConfig: {
                                ...event.communityConfig,
                                sponsors: event.communityConfig.sponsors.map((s) =>
                                  s.id === sp.id ? { ...s, amountReceived: rec } : s
                                ),
                              },
                            });
                          }}
                          className="w-24 px-2 py-0.5 text-right rounded border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                        />
                        <span>/ {formatCurrency(sp.amountPledged, event.currency)}</span>
                      </div>
                    </div>
                    <p className="text-[#6B7280]">Deliverables: {sp.deliverables}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
