import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Loader2, HelpCircle } from 'lucide-react';
import type {
  CurrencyCode,
  EventPlanWorkspace,
  EventType,
  VenueSetting,
} from '../types/event';
import { BENGALI_WEDDING_DEMO_EVENT } from '../data/demoEvents';
import { generateEventPlanViaServer } from '../services/gemini/geminiService';
import { formatCurrency } from '../utils/calculations';

const EVENT_TYPES: EventType[] = [
  'Wedding',
  'Engagement',
  'Birthday',
  'Anniversary',
  'Baby shower',
  'Graduation',
  'College festival',
  'Corporate event',
  'Community gathering',
  'Cultural or religious celebration',
  'Fundraiser',
  'Custom event',
];

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (newEvent: EventPlanWorkspace) => void;
}

export const EventWizardModal: React.FC<EventWizardModalProps> = ({
  isOpen,
  onClose,
  onCreateEvent,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [eventType, setEventType] = useState<EventType>('Wedding');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('2026-12-20');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('23:00');
  const [city, setCity] = useState('Kolkata');
  const [venueName, setVenueName] = useState('');
  const [venueType, setVenueType] = useState<VenueSetting>('Indoor');
  const [guestCount, setGuestCount] = useState<number>(200);
  const [totalBudget, setTotalBudget] = useState<number>(450000);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [language, setLanguage] = useState<'English' | 'Bengali' | 'Hindi'>('English');
  const [stylePreference, setStylePreference] = useState('Traditional & Elegant');
  const [culturalTradition, setCulturalTradition] = useState('Bengali');
  const [dietaryRequirements, setDietaryRequirements] = useState('Vegetarian & Non-Vegetarian');
  const [accessibilityRequirements, setAccessibilityRequirements] = useState('Wheelchair ramp & senior seating');
  const [specialRequests, setSpecialRequests] = useState('');
  const [vendorApproach, setVendorApproach] = useState<'Professional Vendors' | 'Hybrid DIY + Vendors'>('Professional Vendors');
  const [priorities, setPriorities] = useState<string[]>(['Catering', 'Decoration', 'Venue Comfort']);
  const [budgetFlexibility, setBudgetFlexibility] = useState<'Strict' | 'Moderate (+10%)' | 'Flexible'>('Moderate (+10%)');
  const [sustainability, setSustainability] = useState('Local seasonal florals & zero plastic');
  const [mustHaveNotes, setMustHaveNotes] = useState('Live photo booth & dedicated pure-veg counter');

  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<EventPlanWorkspace | null>(null);
  const [missingHint, setMissingHint] = useState<string | null>(null);

  if (!isOpen) return null;

  const togglePriority = (item: string) => {
    setPriorities((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
    );
  };

  const handleGenerateStep4 = async () => {
    if (!title.trim()) {
      setMissingHint('Quick check: Please enter a name for your celebration (or we can use a default title) before generating.');
    } else {
      setMissingHint(null);
    }

    setStep(4);
    setGenerating(true);
    try {
      const effectiveTitle = title.trim() || `${culturalTradition ? `${culturalTradition} ` : ''}${eventType} — ${city || 'Celebration'}`;
      const res = await generateEventPlanViaServer({
        prompt: `Plan a ${effectiveTitle} (${eventType}) in ${city || 'India'} for ${guestCount} guests with a budget of ${currency} ${totalBudget}. Style: ${stylePreference}. Approach: ${vendorApproach}. Must-have: ${mustHaveNotes}. Special requests: ${specialRequests}`,
        eventName: effectiveTitle,
        eventType,
        eventDate,
        city: city || 'Kolkata',
        venueType,
        guestCount,
        budget: totalBudget,
        currency,
        style: stylePreference,
        culturalTradition,
        dietaryNotes: dietaryRequirements,
        priorities,
      });

      const plan = res.plan;
      const nowIso = new Date().toISOString();
      const baseEventDate = eventDate || '2026-12-20';
      const eventMs = new Date(baseEventDate).getTime();

      const newWorkspace: EventPlanWorkspace = {
        ...BENGALI_WEDDING_DEMO_EVENT,
        id: `evt_${Date.now()}`,
        isDemo: false,
        title: effectiveTitle,
        eventType,
        status: 'Planning',
        eventDate: baseEventDate,
        startTime,
        endTime,
        city: city || 'TBD',
        venueName: venueName || 'Shortlisted Venue (TBD)',
        venueType,
        guestCount: Number(guestCount) || 150,
        totalBudget: Number(totalBudget) || 300000,
        currency,
        language,
        stylePreference,
        culturalTradition,
        dietaryRequirements,
        accessibilityRequirements,
        specialRequests: `${specialRequests} (${vendorApproach})`.trim(),
        priorities,
        budgetFlexibility,
        sustainabilityPreference: sustainability,
        aiProposal: {
          summary: plan.eventOverview?.summary || `Personalized ${eventType} plan for ${guestCount} guests.`,
          budgetAssumptions: plan.budgetAssumptions || [],
          costSavingAlternatives: plan.costSavingAlternatives || [],
          vendorQuestions: (plan.vendorRequirements || []).map(
            (v: {
              category: string;
              questionsToAsk: string[];
              requirements?: string;
              bookingLeadDays?: number;
              priorityLevel?: 'Critical' | 'High' | 'Standard';
            }) => ({
              category: v.category,
              questions: v.questionsToAsk || [],
              requirements: v.requirements,
              bookingLeadDays: v.bookingLeadDays,
              priorityLevel: v.priorityLevel,
            })
          ),
          eventSpecificRecommendations: plan.eventSpecificRecommendations || [],
          rsvpStrategy: plan.guestPlan?.rsvpStrategy || 'Send save-the-dates 4 weeks prior.',
          cateringEstimateNotes: plan.guestPlan?.cateringEstimateNotes || `${guestCount} plates + 5% safety buffer.`,
          seatingConsiderations: plan.guestPlan?.seatingConsiderations || 'Reserved elder seating near stage.',
          accessibilityNotes: plan.guestPlan?.accessibilityNotes || accessibilityRequirements,
          risks: plan.risks || [],
          nextActions: plan.nextActions || { immediate: [], nextWeek: [], finalDays: [] },
        },
        budgetItems: (plan.budgetCategories || []).map(
          (
            b: {
              id?: string;
              category: string;
              plannedAmount: number;
              notes: string;
              isMustHave?: boolean;
              allocationPercent?: number;
            },
            idx: number
          ) => ({
            id: b.id || `b_wiz_${idx}`,
            category: b.category,
            plannedAmount: Number(b.plannedAmount) || 0,
            quotedAmount: 0,
            actualAmount: 0,
            paidAmount: 0,
            vendorName: 'TBD',
            paymentDueDate: baseEventDate,
            status: 'Estimated',
            notes: b.notes || '',
            isMustHave: b.isMustHave ?? idx < 3,
            allocationPercent: b.allocationPercent,
          })
        ),
        tasks: (plan.timelineTasks || []).map(
          (
            t: {
              id?: string;
              title: string;
              category: string;
              startDate?: string;
              dueDate?: string;
              daysBeforeEvent: number;
              priority: 'High' | 'Medium' | 'Low';
              dependencies?: string[];
              estimatedEffort?: string;
              notes: string;
              isCriticalPath?: boolean;
            },
            idx: number
          ) => {
            const lead = Number(t.daysBeforeEvent) || 14;
            const dueMs = !Number.isNaN(eventMs) ? eventMs - lead * 86400000 : Date.now() + 7 * 86400000;
            return {
              id: t.id || `task_${idx + 1}`,
              title: t.title,
              description: t.notes || '',
              category: t.category || 'Planning',
              startDate: t.startDate || new Date(dueMs - 5 * 86400000).toISOString().slice(0, 10),
              dueDate: t.dueDate || new Date(dueMs).toISOString().slice(0, 10),
              daysBeforeEvent: lead,
              priority: ['High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
              status: 'Not Started',
              assignedUser: 'Event Owner',
              dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
              estimatedCost: 0,
              relatedVendor: '',
              notes: t.notes || `Effort: ${t.estimatedEffort || '3 hours'}`,
              estimatedEffort: t.estimatedEffort || '3 hours',
              isCriticalPath: Boolean(t.isCriticalPath),
            };
          }
        ),
        updatedAt: nowIso,
      };

      setGeneratedDraft(newWorkspace);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold text-[#047857] dark:text-emerald-400">
              Event Creation Wizard · Step {step} of 4
            </p>
            <h2 id="wizard-modal-title" className="text-2xl font-display font-bold">
              {step === 1 && 'Select Celebration or Event Type'}
              {step === 2 && 'Event Details & Guest Capacity'}
              {step === 3 && 'Planning Style & Priorities'}
              {step === 4 && 'Review & Edit AI-Generated Event Plan'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wizard"
            className="p-2 rounded-lg text-[#6B7280] hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Event Type */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280] dark:text-slate-400">
              Choose the occasion you are planning. EventGenie AI adapts its ceremonies, checklists, and budget ratios to your selection.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEventType(type)}
                  className={`p-3.5 rounded-xl border text-left text-sm font-medium transition-colors cursor-pointer ${
                    eventType === type
                      ? 'border-[#047857] bg-[#ECFDF5] text-[#064E3B] dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-[#E5E7EB] dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Event Details */}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="sm:col-span-2">
              <label htmlFor="wiz-title" className="block text-xs font-medium mb-1">
                Event Name (Leave blank if undecided)
              </label>
              <input
                id="wiz-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., ${culturalTradition} ${eventType} in ${city}`}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>

            <div>
              <label htmlFor="wiz-date" className="block text-xs font-medium mb-1">
                Event Date
              </label>
              <input
                id="wiz-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="wiz-start" className="block text-xs font-medium mb-1">
                  Start Time
                </label>
                <input
                  id="wiz-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="wiz-end" className="block text-xs font-medium mb-1">
                  End Time
                </label>
                <input
                  id="wiz-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="wiz-city" className="block text-xs font-medium mb-1">
                City & Location
              </label>
              <input
                id="wiz-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Kolkata, Mumbai, Bengaluru..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>

            <div>
              <label htmlFor="wiz-venue" className="block text-xs font-medium mb-1">
                Venue Name (Optional if unknown)
              </label>
              <input
                id="wiz-venue"
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Leave blank to get AI venue requirements"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>

            <div>
              <label htmlFor="wiz-guests" className="block text-xs font-medium mb-1">
                Expected Guest Count
              </label>
              <input
                id="wiz-guests"
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent font-mono"
              />
            </div>

            <div>
              <label htmlFor="wiz-setting" className="block text-xs font-medium mb-1">
                Venue Setting
              </label>
              <select
                id="wiz-setting"
                value={venueType}
                onChange={(e) => setVenueType(e.target.value as VenueSetting)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="Indoor">Indoor</option>
                <option value="Outdoor">Outdoor</option>
                <option value="Hybrid">Hybrid (Indoor + Lawn)</option>
              </select>
            </div>

            <div>
              <label htmlFor="wiz-budget" className="block text-xs font-medium mb-1">
                Total Budget ({currency})
              </label>
              <input
                id="wiz-budget"
                type="number"
                min={1000}
                step={5000}
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="wiz-currency" className="block text-xs font-medium mb-1">
                  Currency
                </label>
                <select
                  id="wiz-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED</option>
                  <option value="SGD">SGD</option>
                </select>
              </div>
              <div>
                <label htmlFor="wiz-lang" className="block text-xs font-medium mb-1">
                  Language
                </label>
                <select
                  id="wiz-lang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'English' | 'Bengali' | 'Hindi')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="English">English</option>
                  <option value="Bengali">Bengali (বাংলা)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="wiz-culture" className="block text-xs font-medium mb-1">
                Cultural or Regional Preferences
              </label>
              <input
                id="wiz-culture"
                type="text"
                value={culturalTradition}
                onChange={(e) => setCulturalTradition(e.target.value)}
                placeholder="Bengali, Punjabi, South Indian, Cosmopolitan..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>

            <div>
              <label htmlFor="wiz-diet" className="block text-xs font-medium mb-1">
                Dietary Requirements
              </label>
              <input
                id="wiz-diet"
                type="text"
                value={dietaryRequirements}
                onChange={(e) => setDietaryRequirements(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Step 3: Planning Preferences */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="wiz-style" className="block text-xs font-medium mb-1">
                  Aesthetic Style Direction
                </label>
                <select
                  id="wiz-style"
                  value={stylePreference}
                  onChange={(e) => setStylePreference(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="Traditional & Regal">Traditional & Regal</option>
                  <option value="Elegant & Modern">Elegant & Modern</option>
                  <option value="Minimalist Botanical">Minimalist Botanical</option>
                  <option value="Playful & Festive">Playful & Festive</option>
                  <option value="Luxurious Heritage">Luxurious Heritage</option>
                  <option value="Rustic Courtyard">Rustic Courtyard</option>
                </select>
              </div>

              <div>
                <label htmlFor="wiz-diy" className="block text-xs font-medium mb-1">
                  Execution Approach
                </label>
                <select
                  id="wiz-diy"
                  value={vendorApproach}
                  onChange={(e) =>
                    setVendorApproach(e.target.value as 'Professional Vendors' | 'Hybrid DIY + Vendors')
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="Professional Vendors">Full-Service Professional Vendors</option>
                  <option value="Hybrid DIY + Vendors">Hybrid (DIY Decor/Invites + Core Vendors)</option>
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium mb-2">Priority Areas (Protected during budget optimization)</p>
              <div className="flex flex-wrap gap-2">
                {['Catering', 'Decoration', 'Venue Comfort', 'Photography', 'Entertainment', 'Guest Hospitality'].map(
                  (p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePriority(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        priorities.includes(p)
                          ? 'bg-[#047857] text-white border-[#047857]'
                          : 'border-[#E5E7EB] dark:border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="wiz-flex" className="block text-xs font-medium mb-1">
                  Budget Flexibility
                </label>
                <select
                  id="wiz-flex"
                  value={budgetFlexibility}
                  onChange={(e) =>
                    setBudgetFlexibility(e.target.value as 'Strict' | 'Moderate (+10%)' | 'Flexible')
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="Strict">Strict Ceiling</option>
                  <option value="Moderate (+10%)">Moderate (+10% buffer allowed)</option>
                  <option value="Flexible">Flexible for high-priority upgrades</option>
                </select>
              </div>

              <div>
                <label htmlFor="wiz-sustain" className="block text-xs font-medium mb-1">
                  Sustainability & Eco Preferences
                </label>
                <input
                  id="wiz-sustain"
                  type="text"
                  value={sustainability}
                  onChange={(e) => setSustainability(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="wiz-musthave" className="block text-xs font-medium mb-1">
                Must-Have or Must-Avoid Details
              </label>
              <input
                id="wiz-musthave"
                type="text"
                value={mustHaveNotes}
                onChange={(e) => setMustHaveNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Step 4: Generated Plan Review & Edit */}
        {step === 4 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {missingHint && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>{missingHint}</span>
              </div>
            )}

            {generating || !generatedDraft ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#047857]" />
                <p className="text-sm font-semibold">Generating your personalized celebration plan...</p>
                <p className="text-xs text-[#6B7280]">
                  Calculating {currency} category allocations, timeline milestones, and cultural recommendations
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#ECFDF5] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <label htmlFor="draft-edit-title" className="block text-xs font-semibold text-[#064E3B] dark:text-emerald-300">
                    Editable Event Title
                  </label>
                  <input
                    id="draft-edit-title"
                    type="text"
                    value={generatedDraft.title}
                    onChange={(e) =>
                      setGeneratedDraft({ ...generatedDraft, title: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-1.5 text-base font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900"
                  />
                  <p className="text-xs text-[#064E3B] dark:text-emerald-200 mt-2">
                    {generatedDraft.aiProposal.summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-slate-800">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
                      Generated Budget Breakdown ({formatCurrency(generatedDraft.totalBudget, generatedDraft.currency)})
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      {generatedDraft.budgetItems.map((b) => (
                        <div key={b.id} className="flex justify-between font-mono tabular-nums">
                          <span>{b.category}</span>
                          <span className="font-semibold">
                            {formatCurrency(b.plannedAmount, generatedDraft.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-slate-800">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
                      Initial Preparation Milestones ({generatedDraft.tasks.length} Tasks)
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      {generatedDraft.tasks.slice(0, 6).map((t) => (
                        <div key={t.id} className="flex justify-between gap-2">
                          <span className="truncate">{t.title}</span>
                          <span className="font-mono text-[#6B7280] shrink-0">{t.dueDate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB] dark:border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleGenerateStep4}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Structured AI Plan</span>
            </button>
          )}

          {step === 4 && generatedDraft && !generating && (
            <button
              type="button"
              onClick={() => {
                onCreateEvent(generatedDraft);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Event & Open Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
