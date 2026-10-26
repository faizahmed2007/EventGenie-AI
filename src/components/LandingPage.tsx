import React from 'react';
import {
  Calendar,
  Sparkles,
  Calculator,
  Users,
  Palette,
  Mail,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Compass,
  Clock,
  Store,
  HeartHandshake,
  GraduationCap,
} from 'lucide-react';
import type { EventPlanWorkspace } from '../types/event';
import { formatCurrency } from '../utils/calculations';

interface LandingPageProps {
  onStartPlanning: () => void;
  onOpenWizard: () => void;
  onSelectTemplate: (template: EventPlanWorkspace) => void;
  templates: EventPlanWorkspace[];
  darkMode: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartPlanning,
  onOpenWizard,
  onSelectTemplate,
  templates,
  darkMode,
}) => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#FAF8F2] text-[#1F2937]'}`}>
      {/* Strict 3-Zone Top Bar Contract */}
      <header
        className={`sticky top-0 z-30 flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b transition-colors ${
          darkMode ? 'bg-slate-950/95 border-slate-800' : 'bg-[#FAF8F2]/95 border-[#E5E7EB]'
        } backdrop-blur-sm`}
      >
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`text-2xl font-bold tracking-tight font-display whitespace-nowrap shrink-0 ${
            darkMode ? 'text-emerald-400' : 'text-[#064E3B]'
          }`}
        >
          EventGenie AI
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('features');
            }}
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('how-it-works');
            }}
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            How It Works
          </a>
          <a
            href="#templates"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('templates');
            }}
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Templates
          </a>
          <a
            href="#privacy"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('privacy');
            }}
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Privacy
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartPlanning}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Start Planning
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          {/* Left Column: Narrative & Primary Actions */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className={`text-sm font-medium tracking-wide ${darkMode ? 'text-[#D4AF65]' : 'text-[#047857]'}`}>
              Dream It. Plan It. Celebrate It. · Weddings · Birthdays · Cultural & Campus Events
            </p>
            <h1
              className={`font-display font-bold tracking-tight leading-[1.1] text-balance ${
                darkMode ? 'text-white' : 'text-[#1F2937]'
              }`}
              style={{ fontSize: 'clamp(2.5rem, 4.2vw, 3.85rem)' }}
            >
              Your Vision. Your Event. Perfectly Planned.
            </h1>
            <p className={`text-base lg:text-lg leading-relaxed max-w-xl ${darkMode ? 'text-slate-300' : 'text-[#6B7280]'}`}>
              From dream weddings to unforgettable birthdays and community celebrations, let AI help you plan every detail with confidence. Describe your celebration in natural language and manage your budget, timeline, vendors, themes, and RSVPs in one unified workspace.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onStartPlanning}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Start Planning</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className={`inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  darkMode
                    ? 'border-slate-700 text-slate-200 hover:bg-slate-900'
                    : 'border-[#E5E7EB] bg-white text-[#1F2937] hover:bg-stone-100'
                }`}
              >
                <span>Explore Features</span>
              </button>
              <button
                type="button"
                onClick={onOpenWizard}
                className={`text-sm font-medium underline underline-offset-4 px-2 py-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  darkMode ? 'text-[#D4AF65]' : 'text-[#064E3B]'
                }`}
              >
                Launch 4-Step Event Wizard
              </button>
            </div>

            <div className={`pt-4 border-t text-xs flex flex-wrap items-center gap-3 ${darkMode ? 'border-slate-800 text-slate-400' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
              <span>Deterministic INR & multi-currency math</span>
              <span aria-hidden="true">·</span>
              <span>What-If Scenario Simulator</span>
              <span aria-hidden="true">·</span>
              <span>Bilingual English, Bengali & Hindi invitations</span>
            </div>
          </div>

          {/* Right Column: Visual Showcase & Live Event Preview Card */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div
              className={`relative rounded-2xl border overflow-hidden h-full flex flex-col justify-between ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E5E7EB]'
              } shadow-sm`}
            >
              {/* Illustrated Architectural Event Banner (Zero External URLs) */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-[#064E3B]">
                <svg
                  viewBox="0 0 800 420"
                  className="w-full h-full object-cover"
                  role="img"
                  aria-label="Architectural illustration of a Bengali Rajbari wedding reception with emerald drapery, brass lamps, and floral arches"
                >
                  <defs>
                    <linearGradient id="emeraldBg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#064E3B" />
                      <stop offset="55%" stopColor="#047857" />
                      <stop offset="100%" stopColor="#022C22" />
                    </linearGradient>
                    <linearGradient id="goldGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#D4AF65" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  <rect width="800" height="420" fill="url(#emeraldBg)" />
                  {/* Architectural Rajbari Arches */}
                  <path
                    d="M 80 420 L 80 150 Q 200 50 320 150 L 320 420 Z"
                    fill="#047857"
                    stroke="#D4AF65"
                    strokeWidth="2"
                    opacity="0.55"
                  />
                  <path
                    d="M 260 420 L 260 120 Q 400 20 540 120 L 540 420 Z"
                    fill="#065F46"
                    stroke="#D4AF65"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M 480 420 L 480 150 Q 600 50 720 150 L 720 420 Z"
                    fill="#047857"
                    stroke="#D4AF65"
                    strokeWidth="2"
                    opacity="0.55"
                  />
                  {/* Hanging Tuberose (Rajnigandha) & Chandelier Garlands */}
                  {[140, 200, 310, 355, 400, 445, 490, 600, 660].map((x, idx) => (
                    <g key={x}>
                      <line
                        x1={x}
                        y1="30"
                        x2={x}
                        y2={130 + (idx % 3) * 28}
                        stroke="#FAF8F2"
                        strokeWidth="2"
                        strokeDasharray="4 5"
                        opacity="0.85"
                      />
                      <circle cx={x} cy={135 + (idx % 3) * 28} r="5" fill="#D4AF65" />
                    </g>
                  ))}
                  {/* Center Stage Couch & Floral Mandap */}
                  <rect x="310" y="275" width="180" height="65" rx="14" fill="#FAF8F2" stroke="#D4AF65" strokeWidth="2.5" />
                  <rect x="295" y="340" width="210" height="16" rx="4" fill="#D4AF65" />
                  {/* Warm Ambient Lights */}
                  <circle cx="400" cy="110" r="32" fill="url(#goldGlow)" />
                  <circle cx="200" cy="145" r="20" fill="url(#goldGlow)" />
                  <circle cx="600" cy="145" r="20" fill="url(#goldGlow)" />
                </svg>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
                  <p className="text-xs text-[#D4AF65] font-medium">
                    Live Interactive Sample Workspace · Kolkata, India
                  </p>
                  <h2 className="text-2xl font-display font-bold mt-0.5">
                    Bengali Wedding Reception — Kolkata
                  </h2>
                  <p className="text-xs text-stone-200 mt-1">
                    250 Guests · ₹5,00,000 Budget · Indoor Heritage Venue · Veg & Non-Veg Feast
                  </p>
                </div>
              </div>

              {/* Dashboard Preview Metrics Strip */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-3 gap-4 border-b pb-4 border-[#E5E7EB] dark:border-slate-800">
                  <div>
                    <p className="text-xs text-[#6B7280] dark:text-slate-400">Planned Budget</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-[#047857] dark:text-emerald-400">
                      ₹5,00,000
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] dark:text-slate-400">Confirmed Guests</p>
                    <p className="text-lg font-bold font-mono tabular-nums">188 / 250</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] dark:text-slate-400">Vendors Booked</p>
                    <p className="text-lg font-bold font-mono tabular-nums">4 Confirmed</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-[#6B7280] dark:text-slate-400">
                    Includes ShaadiSmart Cultural Functions, BudgetBloom Optimizer & What-If Simulator
                  </div>
                  <button
                    type="button"
                    onClick={onStartPlanning}
                    className="px-4 py-2 text-xs font-semibold text-[#064E3B] bg-[#ECFDF5] hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Open Workspace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Section (10 Integrated Modules) */}
      <section
        id="features"
        className={`py-16 border-t ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-[#E5E7EB]'}`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold text-[#047857] dark:text-emerald-400">
              One Unified Platform · Ten Specialized Planning Engines
            </p>
            <h2 className="text-3xl font-display font-bold mt-1 text-balance">
              Everything required to take a celebration from initial idea to final toast
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'AI Event Planner',
                desc: 'Describe your celebration in natural language and receive a complete editable proposal with theme, budget, timeline, vendors, and risk mitigation.',
                icon: Sparkles,
              },
              {
                num: '02',
                title: 'Smart Budget Optimizer',
                desc: 'Track Planned, Quoted, Actual, Paid, and Outstanding figures across 15+ categories with deterministic math and automated overrun alerts.',
                icon: Calculator,
              },
              {
                num: '03',
                title: 'What-If Event Simulator',
                desc: 'Test scenarios like "+50 guests", "-₹50,000 budget", "indoor to outdoor", or "catering +15%" side-by-side before modifying your active plan.',
                icon: Sliders,
              },
              {
                num: '04',
                title: 'Dynamic Timeline & Tasks',
                desc: 'Switch seamlessly between List, Kanban, Milestone, and Schedule views. Automatically recalculate task deadlines when your event date shifts.',
                icon: Clock,
              },
              {
                num: '05',
                title: 'Vendor & Quote Manager',
                desc: 'Maintain your event vendor directory, track advances and balances, and compare multiple vendor quotations side by side.',
                icon: Store,
              },
              {
                num: '06',
                title: 'Guest & RSVP Management',
                desc: 'Group guests by household, import/export via CSV, track dietary and accessibility needs, and calculate catering plates with safety buffers.',
                icon: Users,
              },
              {
                num: '07',
                title: 'Visual Theme Studio',
                desc: 'Generate and compare Traditional, Modern, Minimalist, Luxury, Rustic, Floral, and Sustainable moodboards with editable hex color swatches.',
                icon: Palette,
              },
              {
                num: '08',
                title: 'Multi-Language Invitation Creator',
                desc: 'Craft Formal, Casual, WhatsApp, Email, and Printable invitations in English, Bengali, and Hindi with a live visual card preview.',
                icon: Mail,
              },
              {
                num: '09',
                title: 'Indian Wedding & Party Planners',
                desc: 'Configure multi-day regional ceremonies (Bengali Ashirbaad, Gaye Holud, Biye, Boubhat; Punjabi; South Indian) or milestone birthday parties.',
                icon: HeartHandshake,
              },
              {
                num: '10',
                title: 'College & Community Events',
                desc: 'Coordinate volunteer committees, stage & AV checklists, speaker slots, registration counts, and sponsor deliverables in one hub.',
                icon: GraduationCap,
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.num}
                  className={`p-6 rounded-xl border transition-colors ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#FAF8F2] border-[#E5E7EB]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-[#6B7280] dark:text-slate-400">
                      {feat.num}. Capability
                    </span>
                    <Icon className="w-5 h-5 text-[#047857] dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feat.title}</h3>
                  <p className="text-sm text-[#6B7280] dark:text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold text-[#047857] dark:text-emerald-400">Structured 5-Step Workflow</p>
          <h2 className="text-3xl font-display font-bold mt-1">How EventGenie AI Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { step: '01. Describe your event', detail: 'Enter a natural-language prompt or step through our 4-stage wizard.' },
            { step: '02. Personalize your plan', detail: 'Review and edit the generated theme, ceremonies, and priorities.' },
            { step: '03. Manage budget & timeline', detail: 'Track real quotes, expenses, and milestone task dependencies.' },
            { step: '04. Coordinate vendors & guests', detail: 'Compare vendor quotes and track household RSVPs and meal counts.' },
            { step: '05. Celebrate with confidence', detail: 'Export printable checklists, run What-If backups, and review outcomes.' },
          ].map((item) => (
            <div
              key={item.step}
              className={`p-5 rounded-xl border ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E5E7EB]'
              }`}
            >
              <h3 className="text-sm font-semibold text-[#047857] dark:text-emerald-400 mb-2">{item.step}</h3>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example Event Templates Section */}
      <section
        id="templates"
        className={`py-16 border-t ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-[#E5E7EB]'}`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-xs font-semibold text-[#047857] dark:text-emerald-400">
                Curated Celebration Blueprints
              </p>
              <h2 className="text-3xl font-display font-bold mt-1">
                Explore Sample Event Templates
              </h2>
            </div>
            <p className="text-xs text-[#6B7280] dark:text-slate-400 max-w-md">
              All sample vendors, prices, and schedules are clearly labeled as illustrative demo data so you can test the entire workflow safely.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`p-6 rounded-xl border flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#FAF8F2] border-[#E5E7EB]'
                }`}
              >
                <div>
                  <p className="text-xs text-[#047857] dark:text-emerald-400 font-medium">
                    {tpl.eventType} · {tpl.city} · {tpl.venueType}
                  </p>
                  <h3 className="text-xl font-display font-bold mt-1">{tpl.title}</h3>
                  <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-2 leading-relaxed">
                    {tpl.stylePreference} — {tpl.dietaryRequirements}
                  </p>
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums">
                    <span>{tpl.guestCount} Guests</span>
                    <span>·</span>
                    <span className="font-semibold">{formatCurrency(tpl.totalBudget, tpl.currency)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTemplate(tpl)}
                  className="mt-6 w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg transition-colors cursor-pointer"
                >
                  Load Template in Workspace
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & Security Section */}
      <section id="privacy" className="py-16 max-w-7xl mx-auto px-6 lg:px-12">
        <div
          className={`p-8 rounded-2xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E5E7EB]'
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#047857] dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <span>Privacy-Conscious AI & Zero-Trust Firestore Security</span>
              </div>
              <h2 className="text-2xl font-display font-bold">
                Your guest lists, budgets, and family plans stay private
              </h2>
              <p className="text-sm text-[#6B7280] dark:text-slate-400 leading-relaxed">
                EventGenie AI keeps all Gemini API keys strictly on the server, sends only the minimum event context required when you explicitly invoke an AI planning feature, and isolates your private guest contact lists and budgets behind owner-verified Cloud Firestore security rules.
              </p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <button
                type="button"
                onClick={onStartPlanning}
                className="px-6 py-3 text-sm font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Open EventGenie AI Workspace
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer
        className={`py-8 border-t text-xs ${
          darkMode ? 'border-slate-800 text-slate-400' : 'border-[#E5E7EB] text-[#6B7280]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-[#064E3B] dark:text-emerald-400">EventGenie AI</span> — Dream It. Plan It. Celebrate It.
          </div>
          <div className="flex items-center gap-6">
            <button type="button" onClick={onStartPlanning} className="hover:underline cursor-pointer">
              Workspace Dashboard
            </button>
            <button type="button" onClick={onOpenWizard} className="hover:underline cursor-pointer">
              Create Event
            </button>
            <a href="#privacy" className="hover:underline">
              Privacy & Security
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
