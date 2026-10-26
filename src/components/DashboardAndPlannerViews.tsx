import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Wallet,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Copy,
  Archive,
  Trash2,
  Plus,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  Download,
  Save,
  ArrowUpRight,
  Clock,
  Store,
  Palette,
  Mail,
  Sliders,
  FileBarChart,
  Check,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type {
  BudgetCategoryItem,
  EventPlanWorkspace,
  EventStatus,
  GuestItem,
  RsvpStatus,
  TaskPriority,
  TimelineTaskItem,
  VendorBookingStatus,
} from '../types/event';
import {
  calculateBudgetSummary,
  calculateGuestSummary,
  formatCurrency,
  rebalanceBudgetToTarget,
  recalculateTimelineDeadlines,
} from '../utils/calculations';
import {
  analyzeTimelineDependencies,
  buildDependencyAwareTimeline,
  updateBudgetCategoryDeterministic,
  validateEventPlanInput,
} from '../utils/planningEngine';
import { generateEventPlanViaServer } from '../services/gemini/geminiService';

const CHART_PALETTE = ['#047857', '#D4AF65', '#065F46', '#10B981', '#B45309', '#0D9488', '#6B7280'];

export function getEventArtworkPath(eventType: string): string {
  const normalized = eventType.toLowerCase();
  if (
    normalized.includes('wedding') ||
    normalized.includes('engagement') ||
    normalized.includes('cultural')
  ) {
    return '/assets/events/royal-bengali-wedding.svg';
  }
  if (
    normalized.includes('birthday') ||
    normalized.includes('anniversary') ||
    normalized.includes('baby')
  ) {
    return '/assets/events/luxury-garden-soiree.svg';
  }
  if (
    normalized.includes('college') ||
    normalized.includes('graduation') ||
    normalized.includes('community') ||
    normalized.includes('fundraiser')
  ) {
    return '/assets/events/campus-symposium-fest.svg';
  }
  return '/assets/events/corporate-gala-ballroom.svg';
}

// ============================================================================
// 1. EVENT DASHBOARD (OVERVIEW) — Section 21
// ============================================================================
interface OverviewDashboardProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewDashboardView: React.FC<OverviewDashboardProps> = ({
  event,
  onUpdateEvent,
  onNavigateTab,
}) => {
  const [editingHeader, setEditingHeader] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title);
  const [editDate, setEditDate] = useState(event.eventDate);
  const [editCity, setEditCity] = useState(event.city);
  const [editGuests, setEditGuests] = useState(event.guestCount);
  const [editBudget, setEditBudget] = useState(event.totalBudget);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  // Quick Action Drawer State
  const [activeQuickDrawer, setActiveQuickDrawer] = useState<
    null | 'task' | 'expense' | 'guest'
  >(null);
  const [quickActionToast, setQuickActionToast] = useState<string | null>(null);

  // Quick Task Form
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskCategory, setQuickTaskCategory] = useState('Venue');
  const [quickTaskDue, setQuickTaskDue] = useState('2026-11-25');
  const [quickTaskPriority, setQuickTaskPriority] = useState<TaskPriority>('High');

  // Quick Expense Form
  const [quickExpenseCategoryId, setQuickExpenseCategoryId] = useState(
    event.budgetItems[0]?.id || ''
  );
  const [quickExpenseActual, setQuickExpenseActual] = useState('');
  const [quickExpensePaid, setQuickExpensePaid] = useState('');

  // Quick Guest Form
  const [quickGuestName, setQuickGuestName] = useState('');
  const [quickGuestHousehold, setQuickGuestHousehold] = useState('');
  const [quickGuestAttendees, setQuickGuestAttendees] = useState(2);
  const [quickGuestRsvp, setQuickGuestRsvp] = useState<RsvpStatus>('Accepted');
  const [quickGuestMeal, setQuickGuestMeal] = useState<GuestItem['mealPreference']>('Non-Vegetarian');

  // Task Filter in Upcoming Deadlines Card
  const [deadlineFilter, setDeadlineFilter] = useState<'upcoming' | 'high' | 'completed'>('upcoming');

  const todayStr = '2026-10-20';
  const budgetSummary = calculateBudgetSummary(
    event.totalBudget,
    event.budgetItems,
    event.currency,
    todayStr
  );
  const guestSummary = calculateGuestSummary(event.guests);
  const dependencyAnalysis = analyzeTimelineDependencies(event.tasks);

  const totalTasks = event.tasks.length;
  const completedTasks = event.tasks.filter((t) => t.status === 'Completed').length;
  const remainingTasks = event.tasks.filter(
    (t) => t.status !== 'Completed' && t.status !== 'Cancelled'
  ).length;
  const highPriorityRemaining = event.tasks.filter(
    (t) => t.status !== 'Completed' && t.status !== 'Cancelled' && t.priority === 'High'
  ).length;
  const overdueTasks = event.tasks.filter(
    (t) => t.status !== 'Completed' && t.status !== 'Cancelled' && t.dueDate < todayStr
  ).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Workstream Readiness Breakdown
  const workstreams = [
    {
      label: 'Venue & Catering',
      match: (cat: string) => /venue|cater|food|menu|hall/i.test(cat),
    },
    {
      label: 'Decor, Photo & Music',
      match: (cat: string) => /decor|photo|video|music|entertain|theme|floral|stage/i.test(cat),
    },
    {
      label: 'Guests & Invitations',
      match: (cat: string) => /guest|rsvp|invit|hospitality|accommodat|transport/i.test(cat),
    },
    {
      label: 'Logistics & Operations',
      match: (cat: string) =>
        !/venue|cater|food|menu|hall|decor|photo|video|music|entertain|theme|floral|stage|guest|rsvp|invit|hospitality|accommodat|transport/i.test(
          cat
        ),
    },
  ].map((ws) => {
    const matched = event.tasks.filter((t) => ws.match(t.category));
    const done = matched.filter((t) => t.status === 'Completed').length;
    const total = matched.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { label: ws.label, done, total, pct };
  });

  // Vendor Pipeline Counts
  const bookedVendors = event.vendors.filter(
    (v) => v.bookingStatus === 'Booked' || v.bookingStatus === 'Completed'
  ).length;
  const shortlistedVendors = event.vendors.filter(
    (v) => v.bookingStatus === 'Shortlisted' || v.bookingStatus === 'Negotiating'
  ).length;
  const quotedVendors = event.vendors.filter(
    (v) => v.bookingStatus === 'Quote Received' || v.bookingStatus === 'Contacted'
  ).length;
  const totalVendorAgreed = event.vendors.reduce(
    (sum, v) => sum + (v.finalPrice || v.quotedAmount),
    0
  );
  const totalVendorBalance = event.vendors.reduce(
    (sum, v) => sum + Math.max(0, (v.finalPrice || v.quotedAmount) - v.advancePaid),
    0
  );

  const upcomingPaymentsCount = event.budgetItems.filter(
    (b) => (b.actualAmount || b.quotedAmount) > b.paidAmount
  ).length;
  const budgetUsedPercent =
    event.totalBudget > 0
      ? Math.min(100, Math.round((budgetSummary.totalActual / event.totalBudget) * 100))
      : 0;

  // Countdown Calculation (Days, Hours, Mins)
  const eventDateTimeStr = `${event.eventDate}T${event.startTime || '18:30'}:00`;
  const eventTime = new Date(eventDateTimeStr).getTime();
  const nowTime = new Date(`${todayStr}T09:00:00`).getTime();
  const diffMs = !Number.isNaN(eventTime) ? Math.max(0, eventTime - nowTime) : 0;
  const daysCountdown = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursCountdown = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minsCountdown = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const countdownMilestoneStage =
    daysCountdown > 90
      ? 'Early Foundation & Venue Lock'
      : daysCountdown > 45
      ? '60-Day Vendor & Theme Confirmation Window'
      : daysCountdown > 14
      ? '30-Day RSVP & Catering Finalization Sprint'
      : daysCountdown > 0
      ? 'Final Event Week Execution'
      : 'Celebration Day';

  const activeTheme =
    event.themes.find((th) => th.id === event.activeThemeId) || event.themes[0];
  const artworkUrl = getEventArtworkPath(event.eventType);

  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    const { updatedItems } =
      editBudget !== event.totalBudget
        ? rebalanceBudgetToTarget(event.budgetItems, editBudget)
        : { updatedItems: event.budgetItems };
    const { updatedTasks } =
      editDate !== event.eventDate
        ? recalculateTimelineDeadlines(event.tasks, editDate, todayStr)
        : { updatedTasks: event.tasks };

    onUpdateEvent({
      ...event,
      title: editTitle.trim() || event.title,
      eventDate: editDate,
      city: editCity,
      guestCount: Number(editGuests) || event.guestCount,
      totalBudget: Number(editBudget) || event.totalBudget,
      budgetItems: updatedItems,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
    setEditingHeader(false);
    setQuickActionToast('Event details saved and budget/timeline recalculated.');
  };

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    const dueTime = new Date(quickTaskDue).getTime();
    const evTime = new Date(event.eventDate).getTime();
    const daysBefore = !Number.isNaN(dueTime) && !Number.isNaN(evTime)
      ? Math.max(1, Math.round((evTime - dueTime) / (1000 * 60 * 60 * 24)))
      : 14;

    const newTask: TimelineTaskItem = {
      id: `tsk_q_${Date.now()}`,
      title: quickTaskTitle.trim(),
      description: `Added from dashboard quick action for ${quickTaskCategory}.`,
      category: quickTaskCategory,
      startDate: todayStr,
      dueDate: quickTaskDue,
      daysBeforeEvent: daysBefore,
      priority: quickTaskPriority,
      status: 'Not Started',
      assignedUser: 'Event Owner',
      dependencies: [],
      estimatedCost: 0,
      relatedVendor: '',
      notes: '',
    };

    onUpdateEvent({
      ...event,
      tasks: [newTask, ...event.tasks],
      activityLog: [
        {
          id: `act_${Date.now()}`,
          actorName: 'Event Owner',
          action: `Added priority task "${newTask.title}" due ${newTask.dueDate}`,
          timestamp: todayStr,
        },
        ...event.activityLog,
      ],
      updatedAt: new Date().toISOString(),
    });
    setQuickTaskTitle('');
    setActiveQuickDrawer(null);
    setQuickActionToast(`Added task "${newTask.title}" to timeline.`);
  };

  const handleQuickLogExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = quickExpenseCategoryId || event.budgetItems[0]?.id;
    if (!targetId) return;
    const actualNum = Number(quickExpenseActual);
    const paidNum = Number(quickExpensePaid);
    if (Number.isNaN(actualNum) || actualNum < 0) return;

    const targetItem = event.budgetItems.find((b) => b.id === targetId);
    const updatedBudgetItems = event.budgetItems.map((b) =>
      b.id === targetId
        ? {
            ...b,
            actualAmount: actualNum > 0 ? actualNum : b.actualAmount,
            paidAmount: !Number.isNaN(paidNum) && paidNum >= 0 ? paidNum : b.paidAmount,
            status: (paidNum >= actualNum && actualNum > 0 ? 'Paid' : 'Confirmed') as BudgetCategoryItem['status'],
          }
        : b
    );

    onUpdateEvent({
      ...event,
      budgetItems: updatedBudgetItems,
      activityLog: [
        {
          id: `act_${Date.now()}`,
          actorName: 'Event Owner',
          action: `Logged ${formatCurrency(actualNum, event.currency)} expense for ${targetItem?.category || 'Budget'}`,
          timestamp: todayStr,
        },
        ...event.activityLog,
      ],
      updatedAt: new Date().toISOString(),
    });
    setQuickExpenseActual('');
    setQuickExpensePaid('');
    setActiveQuickDrawer(null);
    setQuickActionToast(`Updated expense for ${targetItem?.category || 'category'}.`);
  };

  const handleQuickAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGuestName.trim()) return;
    const newGuest: GuestItem = {
      id: `gst_q_${Date.now()}`,
      fullName: quickGuestName.trim(),
      household: quickGuestHousehold.trim() || `${quickGuestName.trim().split(' ').pop()} Family`,
      contact: 'Manual dashboard entry',
      invitationStatus: 'Sent',
      rsvpStatus: quickGuestRsvp,
      attendeeCount: Math.max(1, Number(quickGuestAttendees) || 1),
      mealPreference: quickGuestMeal,
      dietaryRestrictions: 'None',
      accessibilityRequirements: 'None',
      seatingGroup: 'Main Hall',
      source: 'Manual Entry',
      notes: '',
    };

    onUpdateEvent({
      ...event,
      guests: [newGuest, ...event.guests],
      activityLog: [
        {
          id: `act_${Date.now()}`,
          actorName: 'Event Owner',
          action: `Added guest RSVP for ${newGuest.fullName} (${newGuest.attendeeCount} attendees, ${newGuest.rsvpStatus})`,
          timestamp: todayStr,
        },
        ...event.activityLog,
      ],
      updatedAt: new Date().toISOString(),
    });
    setQuickGuestName('');
    setQuickGuestHousehold('');
    setActiveQuickDrawer(null);
    setQuickActionToast(`Added ${newGuest.fullName} (${newGuest.attendeeCount} guests) to RSVP list.`);
  };

  // Charts Data
  const barChartData = event.budgetItems.slice(0, 7).map((b) => ({
    name: b.category.length > 13 ? `${b.category.slice(0, 11)}…` : b.category,
    Planned: b.plannedAmount,
    Actual: b.actualAmount || b.quotedAmount,
    Paid: b.paidAmount,
  }));

  const pieChartData = event.budgetItems
    .filter((b) => b.plannedAmount > 0)
    .slice(0, 6)
    .map((b) => ({
      name: b.category,
      value: b.plannedAmount,
      pct:
        event.totalBudget > 0 ? Math.round((b.plannedAmount / event.totalBudget) * 100) : 0,
    }));

  // Filtered Tasks for Upcoming Deadlines Card
  const sortedTasks = [...event.tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const displayedDeadlines = sortedTasks
    .filter((t) => {
      if (deadlineFilter === 'completed') return t.status === 'Completed';
      if (deadlineFilter === 'high')
        return t.status !== 'Completed' && t.status !== 'Cancelled' && t.priority === 'High';
      return t.status !== 'Completed' && t.status !== 'Cancelled';
    })
    .slice(0, 6);

  // Guest Dietary Counts
  const vegGuests = event.guests
    .filter((g) => g.rsvpStatus !== 'Declined' && (g.mealPreference === 'Vegetarian' || g.mealPreference === 'Jain' || g.mealPreference === 'Vegan'))
    .reduce((sum, g) => sum + g.attendeeCount, 0);
  const nonVegGuests = event.guests
    .filter((g) => g.rsvpStatus !== 'Declined' && (g.mealPreference === 'Non-Vegetarian' || g.mealPreference === 'Kids'))
    .reduce((sum, g) => sum + g.attendeeCount, 0);

  return (
    <div className="space-y-6">
      {/* Demo Illustrative Notice when viewing demo event */}
      {event.isDemo && (
        <div className="p-3.5 rounded-xl bg-[#ECFDF5] dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#064E3B] dark:text-emerald-200">
          <div>
            <span className="font-semibold">Interactive Demo Workspace:</span> Sample vendors, quotations, and household RSVPs in “{event.title}” are illustrative demo data. Every control below updates real workspace state immediately.
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('planner')}
            className="underline font-semibold whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Generate Custom AI Event Plan →
          </button>
        </div>
      )}

      {/* Executive Event Hero & Live Countdown Split Card */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 overflow-hidden">
        {!editingHeader ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Left 7 Columns: Event Identity, Core Specs & Primary Controls */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                {/* Zero-Pill Metadata Line */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280] dark:text-slate-400">
                  <span className="font-semibold text-[#047857] dark:text-emerald-400">
                    {event.eventType}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Status: {event.status}</span>
                  <span aria-hidden="true">·</span>
                  <span>{event.venueType} Setting</span>
                  <span aria-hidden="true">·</span>
                  <span>{event.culturalTradition}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold tracking-tight text-balance text-[#1F2937] dark:text-white">
                  {event.title}
                </h1>

                <p className="text-xs sm:text-sm text-[#6B7280] dark:text-slate-300 leading-relaxed max-w-2xl">
                  {event.aiProposal.summary}
                </p>
              </div>

              {/* Structured Event Specifications Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#E5E7EB] dark:border-slate-800">
                <div>
                  <p className="text-[11px] text-[#6B7280] dark:text-slate-400">Venue & City</p>
                  <p className="text-xs font-semibold mt-0.5 leading-snug" title={`${event.venueName}, ${event.city}`}>
                    {event.venueName}, {event.city}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280] dark:text-slate-400">Celebration Date</p>
                  <p className="text-xs font-mono tabular-nums font-semibold mt-0.5">
                    {event.eventDate} · {event.startTime}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280] dark:text-slate-400">Expected Guests</p>
                  <p className="text-xs font-mono tabular-nums font-semibold mt-0.5">
                    {event.guestCount} Guests ({guestSummary.confirmedAttendees} RSVP’d)
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280] dark:text-slate-400">Total Target Budget</p>
                  <p className="text-xs font-mono tabular-nums font-semibold text-[#047857] dark:text-emerald-400 mt-0.5">
                    {formatCurrency(event.totalBudget, event.currency)}
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateTab('planner')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open AI Event Planner</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('simulator')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg border border-[#D4AF65] bg-[#FAF8F2] dark:bg-slate-800 text-[#1F2937] dark:text-slate-100 hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#047857]" />
                  <span>What-If Simulator</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditTitle(event.title);
                    setEditDate(event.eventDate);
                    setEditCity(event.city);
                    setEditGuests(event.guestCount);
                    setEditBudget(event.totalBudget);
                    setEditingHeader(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Event</span>
                </button>
              </div>
            </div>

            {/* Right 5 Columns: Architectural Event Imagery + Live Countdown Overlay */}
            <div className="lg:col-span-5 relative min-h-[250px] lg:min-h-full bg-[#064E3B] overflow-hidden flex flex-col justify-between p-6 text-white">
              {!heroImgFailed && (
                <img
                  src={artworkUrl}
                  alt={`${event.eventType} architectural celebration preview for ${event.title}`}
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {/* Measured Contrast Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#022C22]/95 via-[#064E3B]/60 to-[#022C22]/35" />

              {/* Top Overlay Row: Milestone Window */}
              <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-[#FDE68A] tracking-wide">
                  {countdownMilestoneStage}
                </span>
                <span className="font-mono tabular-nums text-emerald-100">
                  {progressPercent}% Ready
                </span>
              </div>

              {/* Bottom Overlay Row: Precision Tabular Countdown */}
              <div className="relative z-10 space-y-3 pt-12">
                <p className="text-xs uppercase tracking-wider text-emerald-100/90 font-medium">
                  Celebration Countdown
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-black/35 backdrop-blur-xs border border-white/15">
                    <p className="text-2xl sm:text-3xl font-display font-bold font-mono tabular-nums text-white">
                      {daysCountdown}
                    </p>
                    <p className="text-[11px] text-emerald-100">Days</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/35 backdrop-blur-xs border border-white/15">
                    <p className="text-2xl sm:text-3xl font-display font-bold font-mono tabular-nums text-[#FDE68A]">
                      {hoursCountdown}
                    </p>
                    <p className="text-[11px] text-emerald-100">Hours</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/35 backdrop-blur-xs border border-white/15">
                    <p className="text-2xl sm:text-3xl font-display font-bold font-mono tabular-nums text-white">
                      {minsCountdown}
                    </p>
                    <p className="text-[11px] text-emerald-100">Minutes</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-100/90 pt-1">
                  <span>Target: {event.eventDate} ({event.startTime}–{event.endTime})</span>
                  <span>{remainingTasks} open milestones</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveHeader} className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Edit Core Event Configuration</h2>
              <span className="text-xs text-[#6B7280]">
                Saving new budget or date deterministically rebalances allocations & task deadlines
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="dash-edit-title" className="block text-xs font-medium mb-1">
                  Event Title
                </label>
                <input
                  id="dash-edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                />
              </div>
              <div>
                <label htmlFor="dash-edit-date" className="block text-xs font-medium mb-1">
                  Event Date
                </label>
                <input
                  id="dash-edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent font-mono"
                />
              </div>
              <div>
                <label htmlFor="dash-edit-guests" className="block text-xs font-medium mb-1">
                  Guest Count
                </label>
                <input
                  id="dash-edit-guests"
                  type="number"
                  value={editGuests}
                  onChange={(e) => setEditGuests(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent font-mono"
                />
              </div>
              <div>
                <label htmlFor="dash-edit-budget" className="block text-xs font-medium mb-1">
                  Total Budget ({event.currency})
                </label>
                <input
                  id="dash-edit-budget"
                  type="number"
                  value={editBudget}
                  onChange={(e) => setEditBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingHeader(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
              >
                Save & Recalculate
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Quick Actions Bar + Inline Action Drawer */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#1F2937] dark:text-slate-200 whitespace-nowrap">
              Quick Actions:
            </span>
            <span className="text-xs text-[#6B7280] hidden sm:inline">
              Log tasks, expenses, and RSVPs directly or jump to a specialized studio
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveQuickDrawer(activeQuickDrawer === 'task' ? null : 'task')
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeQuickDrawer === 'task'
                  ? 'bg-[#047857] text-white border-[#047857]'
                  : 'border-[#E5E7EB] dark:border-slate-700 hover:border-[#047857]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add Task</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveQuickDrawer(activeQuickDrawer === 'expense' ? null : 'expense')
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeQuickDrawer === 'expense'
                  ? 'bg-[#047857] text-white border-[#047857]'
                  : 'border-[#E5E7EB] dark:border-slate-700 hover:border-[#047857]'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Log Expense</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveQuickDrawer(activeQuickDrawer === 'guest' ? null : 'guest')
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeQuickDrawer === 'guest'
                  ? 'bg-[#047857] text-white border-[#047857]'
                  : 'border-[#E5E7EB] dark:border-slate-700 hover:border-[#047857]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Add Guest RSVP</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('themes')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-[#047857]" />
              <span>Theme Studio</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('invitations')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-[#047857]" />
              <span>Create Invitation</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileBarChart className="w-3.5 h-3.5 text-[#047857]" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Toast confirmation inside Quick Actions */}
        {quickActionToast && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#064E3B] dark:text-emerald-200 text-xs">
            <span>{quickActionToast}</span>
            <button
              type="button"
              onClick={() => setQuickActionToast(null)}
              aria-label="Dismiss notification"
              className="p-0.5 hover:opacity-75 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Inline Quick-Add Task Drawer */}
        {activeQuickDrawer === 'task' && (
          <form
            onSubmit={handleQuickAddTask}
            className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label htmlFor="qa-task-title" className="block text-[11px] font-medium mb-1">
                Task Title
              </label>
              <input
                id="qa-task-title"
                type="text"
                required
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder="e.g., Confirm bridal makeup trial timing"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="qa-task-cat" className="block text-[11px] font-medium mb-1">
                Category
              </label>
              <select
                id="qa-task-cat"
                value={quickTaskCategory}
                onChange={(e) => setQuickTaskCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="Venue">Venue</option>
                <option value="Catering">Catering</option>
                <option value="Decoration">Decoration</option>
                <option value="Photography">Photography</option>
                <option value="Guests">Guests & Invitations</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
            <div>
              <label htmlFor="qa-task-due" className="block text-[11px] font-medium mb-1">
                Due Date & Priority
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="qa-task-due"
                  type="date"
                  value={quickTaskDue}
                  onChange={(e) => setQuickTaskDue(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent font-mono"
                />
                <select
                  aria-label="Task priority"
                  value={quickTaskPriority}
                  onChange={(e) => setQuickTaskPriority(e.target.value as TaskPriority)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="High">High</option>
                  <option value="Medium">Med</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
              >
                Add Task
              </button>
            </div>
          </form>
        )}

        {/* Inline Quick-Log Expense Drawer */}
        {activeQuickDrawer === 'expense' && (
          <form
            onSubmit={handleQuickLogExpense}
            className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label htmlFor="qa-exp-cat" className="block text-[11px] font-medium mb-1">
                Budget Category
              </label>
              <select
                id="qa-exp-cat"
                value={quickExpenseCategoryId}
                onChange={(e) => setQuickExpenseCategoryId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                {event.budgetItems.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.category} (Planned: {formatCurrency(b.plannedAmount, event.currency)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="qa-exp-actual" className="block text-[11px] font-medium mb-1">
                Updated Actual Spend ({event.currency})
              </label>
              <input
                id="qa-exp-actual"
                type="number"
                required
                min={0}
                value={quickExpenseActual}
                onChange={(e) => setQuickExpenseActual(e.target.value)}
                placeholder="e.g., 125000"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent font-mono"
              />
            </div>
            <div>
              <label htmlFor="qa-exp-paid" className="block text-[11px] font-medium mb-1">
                Amount Paid So Far ({event.currency})
              </label>
              <input
                id="qa-exp-paid"
                type="number"
                min={0}
                value={quickExpensePaid}
                onChange={(e) => setQuickExpensePaid(e.target.value)}
                placeholder="e.g., 60000"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent font-mono"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
              >
                Save Expense
              </button>
            </div>
          </form>
        )}

        {/* Inline Quick-Add Guest RSVP Drawer */}
        {activeQuickDrawer === 'guest' && (
          <form
            onSubmit={handleQuickAddGuest}
            className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label htmlFor="qa-guest-name" className="block text-[11px] font-medium mb-1">
                Guest Full Name
              </label>
              <input
                id="qa-guest-name"
                type="text"
                required
                value={quickGuestName}
                onChange={(e) => setQuickGuestName(e.target.value)}
                placeholder="e.g., Dr. Subir Mukherjee"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="qa-guest-group" className="block text-[11px] font-medium mb-1">
                Household Group
              </label>
              <input
                id="qa-guest-group"
                type="text"
                value={quickGuestHousehold}
                onChange={(e) => setQuickGuestHousehold(e.target.value)}
                placeholder="Mukherjee Family"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="qa-guest-count" className="block text-[11px] font-medium mb-1">
                Attendees & RSVP
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="qa-guest-count"
                  type="number"
                  min={1}
                  max={25}
                  value={quickGuestAttendees}
                  onChange={(e) => setQuickGuestAttendees(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent font-mono"
                />
                <select
                  aria-label="RSVP Status"
                  value={quickGuestRsvp}
                  onChange={(e) => setQuickGuestRsvp(e.target.value as RsvpStatus)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="Accepted">Accepted</option>
                  <option value="Pending">Pending</option>
                  <option value="Invited">Invited</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="qa-guest-meal" className="block text-[11px] font-medium mb-1">
                Meal Preference
              </label>
              <select
                id="qa-guest-meal"
                value={quickGuestMeal}
                onChange={(e) =>
                  setQuickGuestMeal(e.target.value as GuestItem['mealPreference'])
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Jain">Jain</option>
                <option value="Kids">Kids</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
              >
                Save Guest RSVP
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 8 Deterministic Dashboard KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Planning Progress',
            value: `${progressPercent}%`,
            sub: `${completedTasks}/${totalTasks} milestones complete`,
            barPct: progressPercent,
            barColor: 'bg-[#047857]',
            tab: 'timeline',
          },
          {
            label: 'Budget Used (Actual)',
            value: formatCurrency(budgetSummary.totalActual, event.currency),
            sub: `${budgetUsedPercent}% of ${formatCurrency(event.totalBudget, event.currency)}`,
            barPct: budgetUsedPercent,
            barColor: budgetUsedPercent > 95 ? 'bg-[#DC2626]' : 'bg-[#D4AF65]',
            tab: 'budget',
          },
          {
            label: 'Confirmed Guests',
            value: `${guestSummary.confirmedAttendees}`,
            sub: `${guestSummary.recommendedCateringPlates} catering plates est.`,
            barPct:
              event.guestCount > 0
                ? Math.min(100, Math.round((guestSummary.confirmedAttendees / event.guestCount) * 100))
                : 0,
            barColor: 'bg-[#047857]',
            tab: 'guests',
          },
          {
            label: 'Pending RSVPs',
            value: `${guestSummary.pendingAttendees}`,
            sub: `Across ${guestSummary.householdsCount} households`,
            barPct:
              guestSummary.totalInvitedHeadcount > 0
                ? Math.min(100, Math.round((guestSummary.pendingAttendees / guestSummary.totalInvitedHeadcount) * 100))
                : 0,
            barColor: 'bg-[#D4AF65]',
            tab: 'guests',
          },
          {
            label: 'Tasks Remaining',
            value: `${remainingTasks}`,
            sub: `${highPriorityRemaining} high-priority open`,
            barPct: totalTasks > 0 ? Math.round((remainingTasks / totalTasks) * 100) : 0,
            barColor: 'bg-[#047857]',
            tab: 'timeline',
          },
          {
            label: 'Overdue Tasks',
            value: `${overdueTasks}`,
            sub: overdueTasks === 0 ? 'All milestones on schedule' : 'Requires attention',
            barPct: overdueTasks === 0 ? 100 : 40,
            barColor: overdueTasks === 0 ? 'bg-[#047857]' : 'bg-[#DC2626]',
            tab: 'timeline',
          },
          {
            label: 'Vendors Booked',
            value: `${bookedVendors}/${event.vendors.length}`,
            sub: `${shortlistedVendors} shortlisted / negotiating`,
            barPct:
              event.vendors.length > 0
                ? Math.round((bookedVendors / event.vendors.length) * 100)
                : 0,
            barColor: 'bg-[#047857]',
            tab: 'vendors',
          },
          {
            label: 'Upcoming Payments',
            value: `${upcomingPaymentsCount}`,
            sub: `${formatCurrency(budgetSummary.totalOutstanding, event.currency)} due`,
            barPct:
              budgetSummary.totalActual > 0
                ? Math.round((budgetSummary.totalPaid / budgetSummary.totalActual) * 100)
                : 0,
            barColor: 'bg-[#D4AF65]',
            tab: 'budget',
          },
        ].map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => onNavigateTab(kpi.tab)}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 text-left hover:border-[#047857] transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div>
              <p className="text-[11px] text-[#6B7280] dark:text-slate-400 truncate">{kpi.label}</p>
              <p className="text-xl font-bold font-mono tabular-nums mt-1 truncate">{kpi.value}</p>
              <p className="text-[11px] text-[#047857] dark:text-emerald-400 mt-0.5 truncate">
                {kpi.sub}
              </p>
            </div>
            <div className="w-full h-1.5 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full ${kpi.barColor}`}
                style={{ width: `${Math.max(4, kpi.barPct)}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* Planning Progress & Workstream Readiness Strip */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-display font-bold">
              Planning Progress & Workstream Readiness
            </h2>
            <p className="text-xs text-[#6B7280]">
              {completedTasks} of {totalTasks} tasks completed ({progressPercent}%) ·{' '}
              {dependencyAnalysis.criticalPathTaskIds.length} critical-path milestones tracked ·{' '}
              {dependencyAnalysis.blockedTaskIds.length === 0
                ? 'Zero dependency bottlenecks'
                : `${dependencyAnalysis.blockedTaskIds.length} tasks awaiting prerequisites`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('timeline')}
            className="text-xs font-semibold text-[#047857] hover:underline whitespace-nowrap cursor-pointer self-start sm:self-auto"
          >
            Open Dynamic Timeline →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workstreams.map((ws) => (
            <div
              key={ws.label}
              className="p-3.5 rounded-lg bg-[#FAF8F2] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold truncate">{ws.label}</span>
                <span className="font-mono tabular-nums text-[#047857] dark:text-emerald-400 font-bold">
                  {ws.pct}%
                </span>
              </div>
              <div className="w-full h-2 bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#047857]"
                  style={{ width: `${Math.max(5, ws.pct)}%` }}
                />
              </div>
              <p className="text-[11px] text-[#6B7280] font-mono tabular-nums">
                {ws.done}/{ws.total} tasks completed
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Budget Overview & Dual Clean Charts Section */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-display font-bold">
              Budget Overview & Category Allocation Charts
            </h2>
            <p className="text-xs text-[#6B7280]">
              Deterministic financial tracking across {event.budgetItems.length} categories · All figures in {event.currency}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('simulator')}
              className="text-xs font-medium text-[#6B7280] hover:text-[#1F2937] dark:hover:text-white cursor-pointer"
            >
              Simulate Budget Cut
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('budget')}
              className="text-xs font-semibold text-[#047857] hover:underline cursor-pointer"
            >
              Open Smart Budget Optimizer →
            </button>
          </div>
        </div>

        {/* Deterministic Financial Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {[
            {
              label: 'Total Target Budget',
              val: formatCurrency(budgetSummary.totalBudget, event.currency),
              tone: 'text-[#1F2937] dark:text-white',
            },
            {
              label: 'Planned Allocation',
              val: formatCurrency(budgetSummary.totalPlanned, event.currency),
              tone: 'text-[#047857] dark:text-emerald-400',
            },
            {
              label: 'Actual / Contracted',
              val: formatCurrency(budgetSummary.totalActual, event.currency),
              tone: 'text-[#1F2937] dark:text-white',
            },
            {
              label: 'Paid to Date',
              val: formatCurrency(budgetSummary.totalPaid, event.currency),
              tone: 'text-[#047857] dark:text-emerald-400',
            },
            {
              label: 'Outstanding Balance',
              val: formatCurrency(budgetSummary.totalOutstanding, event.currency),
              tone: 'text-amber-700 dark:text-amber-400',
            },
            {
              label: 'Contingency Reserve',
              val: formatCurrency(budgetSummary.contingencyPlanned, event.currency),
              tone: 'text-[#6B7280] dark:text-slate-300',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-lg bg-[#FAF8F2] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800"
            >
              <p className="text-[11px] text-[#6B7280] truncate">{stat.label}</p>
              <p className={`text-sm font-bold font-mono tabular-nums mt-0.5 truncate ${stat.tone}`}>
                {stat.val}
              </p>
            </div>
          ))}
        </div>

        {/* Over-budget or payment alerts if present */}
        {(budgetSummary.overBudgetCategories.length > 0 ||
          budgetSummary.alerts.length > 0) && (
          <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {budgetSummary.overBudgetCategories.length > 0
                  ? `${budgetSummary.overBudgetCategories.length} ${
                      budgetSummary.overBudgetCategories.length === 1 ? 'category' : 'categories'
                    } exceeding planned allocation (${budgetSummary.overBudgetCategories
                      .map((c) => `${c.category}: +${formatCurrency(c.excess, event.currency)}`)
                      .join(', ')}). `
                  : budgetSummary.alerts[0]?.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('budget')}
              className="font-semibold underline whitespace-nowrap cursor-pointer"
            >
              Rebalance Budget →
            </button>
          </div>
        )}

        {/* Dual Clean Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 items-center">
          {/* Bar Chart: Planned vs Actual vs Paid */}
          <div className="lg:col-span-7 space-y-2">
            <p className="text-xs font-semibold text-[#1F2937] dark:text-slate-200">
              Planned vs. Actual & Paid Expenditure
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: unknown) => formatCurrency(Number(val) || 0, event.currency)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Planned" fill="#047857" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#D4AF65" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Paid" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart + Category Legend */}
          <div className="lg:col-span-5 space-y-2">
            <p className="text-xs font-semibold text-[#1F2937] dark:text-slate-200">
              Category Share Breakdown
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {pieChartData.map((_, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => formatCurrency(Number(val) || 0, event.currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-xs">
                {pieChartData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                      />
                      <span className="truncate text-[#1F2937] dark:text-slate-300">
                        {entry.name}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-[#6B7280] shrink-0">
                      {entry.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle 12-Column Grid: Upcoming Deadlines (7 Cols) + Guest RSVPs & Catering (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Upcoming Deadlines & Priority Tasks */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-bold">
                  Upcoming Deadlines & Priority Checklist
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Check off tasks to update planning readiness in real time
                </p>
              </div>

              {/* Interactive Segmented Filter */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#FAF8F2] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 self-start">
                {(
                  [
                    { id: 'upcoming', label: `Upcoming (${remainingTasks})` },
                    { id: 'high', label: `High Priority (${highPriorityRemaining})` },
                    { id: 'completed', label: `Done (${completedTasks})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDeadlineFilter(tab.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      deadlineFilter === tab.id
                        ? 'bg-[#047857] text-white font-semibold'
                        : 'text-[#6B7280] hover:text-[#1F2937] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {displayedDeadlines.length === 0 ? (
              <div className="p-8 text-center rounded-lg bg-[#FAF8F2] dark:bg-slate-800/40 border border-dashed border-[#E5E7EB] dark:border-slate-700 space-y-2">
                <p className="text-xs text-[#6B7280]">
                  No tasks match this filter view.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveQuickDrawer('task')}
                  className="text-xs font-semibold text-[#047857] underline cursor-pointer"
                >
                  + Add a new milestone task
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
                {displayedDeadlines.map((task) => {
                  const dueMs = new Date(task.dueDate).getTime();
                  const daysUntilDue = !Number.isNaN(dueMs)
                    ? Math.ceil((dueMs - nowTime) / (1000 * 60 * 60 * 24))
                    : 0;
                  const isOverdue =
                    task.status !== 'Completed' &&
                    task.status !== 'Cancelled' &&
                    task.dueDate < todayStr;
                  const isCrit = dependencyAnalysis.criticalPathTaskIds.includes(task.id);

                  return (
                    <div
                      key={task.id}
                      className="py-3 flex items-start justify-between gap-4 hover:bg-stone-50/60 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          aria-label={`Mark "${task.title}" completed`}
                          checked={task.status === 'Completed'}
                          onChange={() => {
                            const updatedTasks = event.tasks.map((t) =>
                              t.id === task.id
                                ? {
                                    ...t,
                                    status: (t.status === 'Completed'
                                      ? 'In Progress'
                                      : 'Completed') as typeof t.status,
                                  }
                                : t
                            );
                            onUpdateEvent({ ...event, tasks: updatedTasks });
                          }}
                          className="mt-1 h-4 w-4 accent-[#047857] cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              task.status === 'Completed'
                                ? 'line-through text-[#6B7280]'
                                : 'text-[#1F2937] dark:text-slate-100'
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="text-xs text-[#6B7280] mt-0.5">
                            <span>{task.category}</span>
                            <span aria-hidden="true"> · </span>
                            <span
                              className={
                                task.priority === 'High'
                                  ? 'font-semibold text-[#047857] dark:text-emerald-400'
                                  : ''
                              }
                            >
                              {task.priority} Priority
                            </span>
                            <span aria-hidden="true"> · </span>
                            <span>Owner: {task.assignedUser}</span>
                            {isCrit && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="text-[#B45309] dark:text-[#FDE68A] font-medium">
                                  Critical Path
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono tabular-nums">
                        <p
                          className={`text-xs font-semibold ${
                            isOverdue
                              ? 'text-[#DC2626]'
                              : daysUntilDue <= 14 && task.status !== 'Completed'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-[#1F2937] dark:text-slate-200'
                          }`}
                        >
                          {task.dueDate}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          {task.status === 'Completed'
                            ? 'Completed'
                            : isOverdue
                            ? 'Overdue'
                            : `In ${daysUntilDue}d`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setActiveQuickDrawer('task')}
              className="font-semibold text-[#047857] hover:underline cursor-pointer"
            >
              + Quick Add Task
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('timeline')}
              className="font-semibold text-[#047857] hover:underline cursor-pointer"
            >
              View All {event.tasks.length} Tasks & Kanban →
            </button>
          </div>
        </div>

        {/* Right 5 Columns: Guest RSVPs & Catering Readiness */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold">Guest RSVPs & Catering</h2>
                <p className="text-xs text-[#6B7280]">
                  {guestSummary.householdsCount} households · {guestSummary.totalInvitedHeadcount} invited
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('guests')}
                className="text-xs font-semibold text-[#047857] hover:underline cursor-pointer"
              >
                Manage Guest List →
              </button>
            </div>

            {/* RSVP Breakdown Metrics */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-lg bg-[#ECFDF5] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <p className="text-[11px] text-[#064E3B] dark:text-emerald-300">Confirmed</p>
                <p className="text-lg font-bold font-mono tabular-nums text-[#047857] dark:text-emerald-400">
                  {guestSummary.confirmedAttendees}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF8F2] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700">
                <p className="text-[11px] text-[#6B7280]">Pending RSVP</p>
                <p className="text-lg font-bold font-mono tabular-nums">
                  {guestSummary.pendingAttendees}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF8F2] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700">
                <p className="text-[11px] text-[#6B7280]">Est. Plates (+10%)</p>
                <p className="text-lg font-bold font-mono tabular-nums text-[#B45309] dark:text-[#FDE68A]">
                  {guestSummary.recommendedCateringPlates}
                </p>
              </div>
            </div>

            {/* Dietary Split Strip */}
            <div className="p-3 rounded-lg bg-[#FAF8F2] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between text-xs">
              <span>Dietary Split (Active RSVPs):</span>
              <span className="font-mono tabular-nums font-semibold">
                {vegGuests} Veg / Jain · {nonVegGuests} Non-Veg
              </span>
            </div>

            {/* Interactive Household RSVP List */}
            <div className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
              {event.guests.slice(0, 4).map((guest) => (
                <div
                  key={guest.id}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{guest.fullName}</p>
                    <p className="text-[11px] text-[#6B7280] truncate">
                      {guest.household} · {guest.attendeeCount} guests · {guest.mealPreference}
                    </p>
                  </div>
                  <select
                    aria-label={`RSVP status for ${guest.fullName}`}
                    value={guest.rsvpStatus}
                    onChange={(e) => {
                      const nextStatus = e.target.value as RsvpStatus;
                      const updatedGuests = event.guests.map((g) =>
                        g.id === guest.id ? { ...g, rsvpStatus: nextStatus } : g
                      );
                      onUpdateEvent({ ...event, guests: updatedGuests });
                    }}
                    className="px-2 py-1 text-xs rounded-md border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 font-medium shrink-0 cursor-pointer"
                  >
                    <option value="Accepted">Accepted</option>
                    <option value="Pending">Pending</option>
                    <option value="Invited">Invited</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setActiveQuickDrawer('guest')}
              className="font-semibold text-[#047857] hover:underline cursor-pointer"
            >
              + Add Household RSVP
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('guests')}
              className="font-semibold text-[#047857] hover:underline cursor-pointer"
            >
              Import / Export CSV →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom 12-Column Grid: Vendor Status Pipeline (7 Cols) + Active Theme & AI Recommendations (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Vendor Status & Quotation Pipeline */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-display font-bold">
                  Vendor Status & Contract Pipeline
                </h2>
                <p className="text-xs text-[#6B7280]">
                  {bookedVendors} booked · {shortlistedVendors} shortlisted · {quotedVendors} quotes received · Total contracted:{' '}
                  <span className="font-mono tabular-nums font-semibold">
                    {formatCurrency(totalVendorAgreed, event.currency)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('vendors')}
                className="text-xs font-semibold text-[#047857] hover:underline whitespace-nowrap cursor-pointer self-start sm:self-auto"
              >
                Compare Vendor Quotes →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] dark:border-slate-800 text-[11px] text-[#6B7280]">
                    <th className="py-2 pr-3 font-medium">Vendor & Category</th>
                    <th className="py-2 px-3 font-medium text-right">Quoted / Agreed</th>
                    <th className="py-2 px-3 font-medium text-right">Balance Due</th>
                    <th className="py-2 pl-3 font-medium text-right">Booking Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
                  {event.vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-stone-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-[#1F2937] dark:text-slate-100">
                          {vendor.businessName}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          {vendor.category} · Follow-up: {vendor.followUpDate}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        <p className="font-semibold">
                          {formatCurrency(
                            vendor.finalPrice || vendor.quotedAmount,
                            event.currency
                          )}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">
                          Paid: {formatCurrency(vendor.advancePaid, event.currency)}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium">
                        {formatCurrency(
                          Math.max(0, (vendor.finalPrice || vendor.quotedAmount) - vendor.advancePaid),
                          event.currency
                        )}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <select
                          aria-label={`Booking status for ${vendor.businessName}`}
                          value={vendor.bookingStatus}
                          onChange={(e) => {
                            const nextStatus = e.target.value as VendorBookingStatus;
                            const updatedVendors = event.vendors.map((v) =>
                              v.id === vendor.id ? { ...v, bookingStatus: nextStatus } : v
                            );
                            onUpdateEvent({ ...event, vendors: updatedVendors });
                          }}
                          className="px-2 py-1 text-xs rounded-md border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 font-medium cursor-pointer"
                        >
                          <option value="Researching">Researching</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Quote Received">Quote Received</option>
                          <option value="Negotiating">Negotiating</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Booked">Booked</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between text-xs text-[#6B7280]">
            <span>
              Total Vendor Balance Due:{' '}
              <strong className="font-mono tabular-nums text-[#1F2937] dark:text-white">
                {formatCurrency(totalVendorBalance, event.currency)}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('vendors')}
              className="font-semibold text-[#047857] hover:underline cursor-pointer"
            >
              Add / Manage Vendors →
            </button>
          </div>
        </div>

        {/* Right 5 Columns: Active Visual Theme Studio Preview + AI Recommendations */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Theme Preview Card */}
          {activeTheme && (
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6B7280]">
                    Active Visual Direction · {activeTheme.styleCategory}
                  </p>
                  <h2 className="text-lg font-display font-bold">{activeTheme.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('themes')}
                  className="text-xs font-semibold text-[#047857] hover:underline cursor-pointer"
                >
                  Theme Studio →
                </button>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed">{activeTheme.description}</p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {activeTheme.colorPalette.map((sw) => (
                  <div key={sw.name} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="w-5 h-5 rounded-md border border-black/15 inline-block shrink-0"
                      style={{ backgroundColor: sw.hex }}
                      title={`${sw.name}: ${sw.hex}`}
                    />
                    <span className="text-[11px] text-[#6B7280]">{sw.name}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[#E5E7EB] dark:border-slate-800 text-[11px] text-[#6B7280] space-y-1">
                <p>
                  <strong className="text-[#1F2937] dark:text-slate-200">Lighting:</strong>{' '}
                  {activeTheme.lightingIdeas}
                </p>
                <p>
                  <strong className="text-[#1F2937] dark:text-slate-200">Stage & Backdrop:</strong>{' '}
                  {activeTheme.stageConcept}
                </p>
              </div>
            </div>
          )}

          {/* AI Action Plan & Cost-Saving Recommendations */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#047857]" />
                <span>AI Executive Recommendations</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('planner')}
                className="text-xs font-semibold text-[#047857] hover:underline cursor-pointer"
              >
                Full AI Plan →
              </button>
            </div>
            <ul className="space-y-2 text-xs text-[#1F2937] dark:text-slate-300">
              {event.aiProposal.nextActions.immediate.slice(0, 3).map((act, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                  <span>{act}</span>
                </li>
              ))}
              {event.aiProposal.costSavingAlternatives.slice(0, 2).map((alt, i) => (
                <li
                  key={`alt-${i}`}
                  className="flex items-start gap-2 text-[#6B7280] dark:text-slate-400"
                >
                  <ArrowUpRight className="w-4 h-4 text-[#D4AF65] shrink-0 mt-0.5" />
                  <span>Cost-Saving Idea: {alt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. MY EVENTS (MULTI-EVENT MANAGEMENT) — Section 22
// ============================================================================
interface MyEventsViewProps {
  events: EventPlanWorkspace[];
  activeEventId: string;
  onSelectEvent: (id: string) => void;
  onOpenWizard: () => void;
  onDuplicateEvent: (id: string, includePrivateGuestsAndPayments: boolean) => void;
  onUpdateStatus: (id: string, status: EventStatus) => void;
  onDeleteEvent: (id: string) => void;
}

export const MyEventsView: React.FC<MyEventsViewProps> = ({
  events,
  activeEventId,
  onSelectEvent,
  onOpenWizard,
  onDuplicateEvent,
  onUpdateStatus,
  onDeleteEvent,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'budget' | 'title'>('date');
  const [copyPrivateOnDuplicate, setCopyPrivateOnDuplicate] = useState(false);

  const filtered = events
    .filter((ev) => {
      if (statusFilter !== 'ALL' && ev.status !== statusFilter) return false;
      if (
        searchQuery.trim() &&
        !ev.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ev.city.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ev.eventType.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'budget') return b.totalBudget - a.totalBudget;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return a.eventDate.localeCompare(b.eventDate);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">My Events & Templates</h1>
          <p className="text-xs text-[#6B7280]">
            Manage multiple celebrations, duplicate event templates safely, or archive completed occasions.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenWizard}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Filter, Search, Sort & Duplicate Privacy Option Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label="Search events"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, city, or type..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>

          <select
            aria-label="Filter by event status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Statuses</option>
            <option value="Planning">Planning</option>
            <option value="In Progress">In Progress</option>
            <option value="Ready">Ready</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </select>

          <select
            aria-label="Sort events"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'budget' | 'title')}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="date">Sort by Date</option>
            <option value="budget">Sort by Budget</option>
            <option value="title">Sort by Name</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs text-[#6B7280] cursor-pointer">
            <input
              type="checkbox"
              checked={copyPrivateOnDuplicate}
              onChange={(e) => setCopyPrivateOnDuplicate(e.target.checked)}
              className="accent-[#047857]"
            />
            <span>Copy guest & payment data when duplicating</span>
          </label>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-slate-800">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-[#6B7280]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md cursor-pointer ${
                viewMode === 'list' ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-[#6B7280]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Events Grid or List */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
            : 'space-y-3'
        }
      >
        {filtered.map((ev) => {
          const isCurrent = ev.id === activeEventId;
          const imgPath = getEventArtworkPath(ev.eventType);
          return (
            <div
              key={ev.id}
              className={`rounded-xl bg-white dark:bg-slate-900 border overflow-hidden transition-colors flex flex-col justify-between ${
                isCurrent
                  ? 'border-[#047857] ring-1 ring-[#047857]'
                  : 'border-[#E5E7EB] dark:border-slate-800'
              }`}
            >
              <div>
                {viewMode === 'grid' && (
                  <div className="relative h-36 w-full bg-[#064E3B] overflow-hidden">
                    <img
                      src={imgPath}
                      alt={`${ev.eventType} visual preview`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between text-[11px] text-white">
                      <span className="font-medium">
                        {ev.eventType} · {ev.status}
                      </span>
                      <span className="font-mono tabular-nums text-[#FDE68A]">
                        {ev.eventDate}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5">
                  {viewMode === 'list' && (
                    <div className="flex items-center justify-between text-xs text-[#6B7280] mb-1">
                      <span>
                        {ev.eventType} · {ev.status}
                      </span>
                      <span className="font-mono">{ev.eventDate}</span>
                    </div>
                  )}
                  <h2 className="text-xl font-display font-bold">{ev.title}</h2>
                  <p className="text-xs text-[#6B7280] mt-1 font-mono tabular-nums">
                    {ev.city} · {ev.guestCount} Guests ·{' '}
                    {formatCurrency(ev.totalBudget, ev.currency)}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-[#E5E7EB] dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectEvent(ev.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    isCurrent
                      ? 'bg-[#ECFDF5] text-[#064E3B]'
                      : 'bg-[#047857] text-white hover:bg-[#064E3B]'
                  }`}
                >
                  {isCurrent ? 'Active Workspace' : 'Switch to Event'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDuplicateEvent(ev.id, copyPrivateOnDuplicate)}
                    title="Duplicate event as template"
                    aria-label={`Duplicate ${ev.title}`}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateStatus(ev.id, ev.status === 'Archived' ? 'Planning' : 'Archived')
                    }
                    title="Archive or restore event"
                    aria-label={`Archive ${ev.title}`}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  {events.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(ev.id)}
                      title="Delete event"
                      aria-label={`Delete ${ev.title}`}
                      className="p-1.5 rounded-lg border border-red-200 text-[#DC2626] hover:bg-red-50 text-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 3. AI EVENT PLANNER (VALIDATED STRUCTURED ENGINE + 8 EDITABLE PANELS) — Section 8
// ============================================================================
interface AIEventPlannerProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
  onNavigateTab: (tab: string) => void;
}

export const AIEventPlannerView: React.FC<AIEventPlannerProps> = ({
  event,
  onUpdateEvent,
  onNavigateTab,
}) => {
  const [promptInput, setPromptInput] = useState(
    'Plan a Bengali wedding reception in Kolkata for 250 guests with a budget of ₹5,00,000. I want traditional decorations, vegetarian and non-vegetarian catering, a modern photo booth, and a comfortable indoor venue.'
  );
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [syncBudgetAndTimeline, setSyncBudgetAndTimeline] = useState(true);
  const [autoRebalanceCategories, setAutoRebalanceCategories] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');
  const [newAssumptionText, setNewAssumptionText] = useState('');
  const [newRecommendationText, setNewRecommendationText] = useState('');

  const budgetSummary = calculateBudgetSummary(event.totalBudget, event.budgetItems, event.currency);
  const depAnalysis = analyzeTimelineDependencies(event.tasks);

  const handleGenerateProposal = async () => {
    const inputCheck = validateEventPlanInput({
      prompt: promptInput,
      eventName: event.title,
      eventType: event.eventType,
      eventDate: event.eventDate,
      city: event.city,
      venueType: event.venueType,
      guestCount: event.guestCount,
      budget: event.totalBudget,
      currency: event.currency,
      style: event.stylePreference,
      culturalTradition: event.culturalTradition,
      dietaryNotes: event.dietaryRequirements,
      priorities: event.priorities,
    });

    if (!inputCheck.valid) {
      setStatusMessage(inputCheck.errors[0]);
      setConfirmOverwrite(false);
      return;
    }

    setGenerating(true);
    setStatusMessage(null);
    try {
      const res = await generateEventPlanViaServer({
        prompt: promptInput,
        eventName: event.title,
        eventType: event.eventType,
        eventDate: event.eventDate,
        city: event.city,
        venueType: event.venueType,
        guestCount: event.guestCount,
        budget: event.totalBudget,
        currency: event.currency,
        style: event.stylePreference,
        culturalTradition: event.culturalTradition,
        dietaryNotes: event.dietaryRequirements,
        priorities: event.priorities,
      });

      const plan = res.plan;
      const warnings: string[] = Array.isArray(plan.validationWarnings) ? plan.validationWarnings : [];
      setValidationWarnings(warnings);

      const updatedBudgetItems: BudgetCategoryItem[] =
        syncBudgetAndTimeline && Array.isArray(plan.budgetCategories) && plan.budgetCategories.length > 0
          ? plan.budgetCategories.map((b: BudgetCategoryItem, idx: number) => ({
              id: b.id || `bcat_ai_${idx + 1}`,
              category: b.category,
              plannedAmount: Number(b.plannedAmount) || 0,
              quotedAmount: 0,
              actualAmount: 0,
              paidAmount: 0,
              vendorName: 'TBD',
              paymentDueDate: event.eventDate,
              status: 'Estimated',
              notes: b.notes || '',
              isMustHave: Boolean(b.isMustHave),
              allocationPercent: b.allocationPercent,
            }))
          : event.budgetItems;

      const updatedTasks =
        syncBudgetAndTimeline && Array.isArray(plan.timelineTasks) && plan.timelineTasks.length > 0
          ? plan.timelineTasks
          : event.tasks;

      onUpdateEvent({
        ...event,
        title: plan.eventOverview?.title || event.title,
        guestCount: Number(plan.eventOverview?.guestCount) || event.guestCount,
        totalBudget: Number(plan.eventOverview?.totalBudget) || event.totalBudget,
        budgetItems: updatedBudgetItems,
        tasks: updatedTasks,
        aiProposal: {
          summary: plan.eventOverview?.summary || event.aiProposal.summary,
          budgetAssumptions: plan.budgetAssumptions || event.aiProposal.budgetAssumptions,
          costSavingAlternatives: plan.costSavingAlternatives || event.aiProposal.costSavingAlternatives,
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
          eventSpecificRecommendations:
            plan.eventSpecificRecommendations || event.aiProposal.eventSpecificRecommendations || [],
          rsvpStrategy: plan.guestPlan?.rsvpStrategy || event.aiProposal.rsvpStrategy,
          cateringEstimateNotes: plan.guestPlan?.cateringEstimateNotes || event.aiProposal.cateringEstimateNotes,
          seatingConsiderations: plan.guestPlan?.seatingConsiderations || event.aiProposal.seatingConsiderations,
          accessibilityNotes: plan.guestPlan?.accessibilityNotes || event.aiProposal.accessibilityNotes,
          risks: plan.risks || event.aiProposal.risks,
          nextActions: plan.nextActions || event.aiProposal.nextActions,
        },
        updatedAt: new Date().toISOString(),
      });
      setStatusMessage(
        `Validated AI Proposal generated (${
          res.source === 'gemini' ? 'Gemini AI + Deterministic Math Engine' : 'Deterministic Structured Planning Engine'
        }). All budget figures are reconciled to ${formatCurrency(
          Number(plan.eventOverview?.totalBudget) || event.totalBudget,
          event.currency
        )}.`
      );
      setConfirmOverwrite(false);
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Could not generate proposal');
    } finally {
      setGenerating(false);
    }
  };

  const handleCategoryPlannedChange = (categoryId: string, newAmount: number) => {
    const result = updateBudgetCategoryDeterministic(
      event.budgetItems,
      event.totalBudget,
      categoryId,
      newAmount,
      autoRebalanceCategories
    );
    onUpdateEvent({
      ...event,
      budgetItems: result.updatedItems,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddInlineCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const amount = Math.max(0, Math.round(Number(newCategoryAmount) || 0));
    const newItem: BudgetCategoryItem = {
      id: `bcat_custom_${Date.now()}`,
      category: newCategoryName.trim(),
      plannedAmount: amount,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: 'TBD',
      paymentDueDate: event.eventDate,
      status: 'Estimated',
      notes: 'Custom category added in AI Planner',
      isCustom: true,
    };
    const nextList = [...event.budgetItems, newItem];
    const finalItems = autoRebalanceCategories
      ? rebalanceBudgetToTarget(nextList, event.totalBudget).updatedItems
      : nextList;
    onUpdateEvent({
      ...event,
      budgetItems: finalItems,
      updatedAt: new Date().toISOString(),
    });
    setNewCategoryName('');
    setNewCategoryAmount('');
    setStatusMessage(`Added budget category "${newItem.category}".`);
  };

  const handleRebuildDependencyTimeline = () => {
    const { tasks: rebuilt, warnings } = buildDependencyAwareTimeline(
      event.tasks,
      event.eventDate,
      event.eventType
    );
    onUpdateEvent({
      ...event,
      tasks: rebuilt,
      updatedAt: new Date().toISOString(),
    });
    setValidationWarnings(warnings);
    setStatusMessage(
      `Verified dependency graph across ${rebuilt.length} tasks anchored to ${event.eventDate}.`
    );
  };

  const activeTheme = event.themes.find((t) => t.id === event.activeThemeId) || event.themes[0];
  const taskTitleById = new Map(event.tasks.map((t) => [t.id, t.title]));

  return (
    <div className="space-y-6">
      {/* Conversational Natural Language Prompt Panel */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#047857]" />
              <span>AI Event Planner & Validated Proposal Architect</span>
            </h1>
            <p className="text-xs text-[#6B7280]">
              Gemini generates structured plans while deterministic application code calculates all budgets, per-plate estimates, and dependency-safe timelines.
            </p>
          </div>
          <span className="text-xs text-[#047857] dark:text-emerald-400 font-medium">
            100% Deterministic Financial Math · DAG Timeline Validation
          </span>
        </div>

        <div>
          <label htmlFor="ai-prompt-textarea" className="block text-xs font-semibold mb-1.5">
            Describe Your Celebration Vision (Natural Language)
          </label>
          <textarea
            id="ai-prompt-textarea"
            rows={3}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="e.g., Plan a Bengali wedding reception in Kolkata for 250 guests with a budget of ₹5,00,000..."
            className="w-full p-3 text-sm rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-[#FAF8F2] dark:bg-slate-950"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={syncBudgetAndTimeline}
              onChange={(e) => setSyncBudgetAndTimeline(e.target.checked)}
              className="accent-[#047857]"
            />
            <span>Apply validated budget categories & dependency-aware timeline tasks on generation</span>
          </label>
        </div>

        {/* Action Toolbar Required by Section 8 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!confirmOverwrite ? (
              <button
                type="button"
                disabled={generating}
                onClick={() => setConfirmOverwrite(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                <span>{generating ? 'Generating Plan...' : 'Generate / Refresh AI Proposal'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 text-xs">
                <span className="text-amber-900 dark:text-amber-200 font-medium px-1">
                  Generate validated plan and update proposal sections?
                </span>
                <button
                  type="button"
                  onClick={handleGenerateProposal}
                  className="px-3 py-1 rounded-md bg-[#047857] text-white font-semibold cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOverwrite(false)}
                  className="px-2 py-1 rounded-md border border-amber-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigateTab('themes')}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Regenerate Theme
            </button>
            <button
              type="button"
              onClick={() => {
                const { updatedItems } = rebalanceBudgetToTarget(event.budgetItems, event.totalBudget);
                onUpdateEvent({ ...event, budgetItems: updatedItems });
                setStatusMessage(
                  `Deterministically rebalanced all ${updatedItems.length} categories to ${formatCurrency(
                    event.totalBudget,
                    event.currency
                  )}.`
                );
              }}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Rebalance Budget ({formatCurrency(event.totalBudget, event.currency)})
            </button>
            <button
              type="button"
              onClick={() => {
                const nextGuests = event.guestCount + 25;
                const platesWithBuffer = Math.ceil(nextGuests * 1.05);
                onUpdateEvent({
                  ...event,
                  guestCount: nextGuests,
                  aiProposal: {
                    ...event.aiProposal,
                    cateringEstimateNotes: `Plan for ${nextGuests} invited guests + 5% safety buffer = ${platesWithBuffer} plates (${event.dietaryRequirements}).`,
                  },
                });
                setStatusMessage(
                  `Guest count updated to ${nextGuests} guests (${platesWithBuffer} recommended catering plates with 5% buffer).`
                );
              }}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Change Guest Count (+25)
            </button>
            <button
              type="button"
              onClick={handleRebuildDependencyTimeline}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Verify Timeline Dependencies
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('simulator')}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              What-If Alternatives
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusMessage('Event plan saved to workspace.')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#ECFDF5] text-[#064E3B] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Plan</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Plan</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-lg bg-[#ECFDF5] dark:bg-emerald-950/50 text-xs text-[#064E3B] dark:text-emerald-200 font-medium">
            {statusMessage}
          </div>
        )}

        {validationWarnings.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
            <p className="font-semibold text-[#D97706] dark:text-amber-300">
              Planning Engine Validation & Normalization Notes:
            </p>
            {validationWarnings.map((w, i) => (
              <p key={i} className="text-[#6B7280] dark:text-slate-300">
                • {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* 8 Structured Editable Proposal Sections (A through H) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A. Event Overview */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
          <h2 className="text-base font-display font-bold text-[#047857] dark:text-emerald-400">
            A. Event Overview & Deterministic Per-Capita Metrics
          </h2>
          <div>
            <label htmlFor="prop-summary" className="block text-xs font-medium text-[#6B7280] mb-1">
              Executive Concept Summary (Editable)
            </label>
            <textarea
              id="prop-summary"
              rows={3}
              value={event.aiProposal.summary}
              onChange={(e) =>
                onUpdateEvent({
                  ...event,
                  aiProposal: { ...event.aiProposal, summary: e.target.value },
                })
              }
              className="w-full p-2.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums pt-1">
            <div className="p-2.5 rounded-lg bg-[#FAF8F2] dark:bg-slate-800/60">
              <span className="text-[#6B7280] block">Guests</span>
              <span className="font-semibold">{event.guestCount} pax</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF8F2] dark:bg-slate-800/60">
              <span className="text-[#6B7280] block">Total Budget</span>
              <span className="font-semibold">{formatCurrency(event.totalBudget, event.currency)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF8F2] dark:bg-slate-800/60">
              <span className="text-[#6B7280] block">Per-Guest Spend</span>
              <span className="font-semibold">
                {formatCurrency(Math.round(event.totalBudget / Math.max(1, event.guestCount)), event.currency)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FAF8F2] dark:bg-slate-800/60">
              <span className="text-[#6B7280] block">Plates (+5% Buffer)</span>
              <span className="font-semibold">{Math.ceil(event.guestCount * 1.05)} plates</span>
            </div>
          </div>
        </div>

        {/* B. Theme Concept */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold text-[#047857] dark:text-emerald-400">
              B. Theme & Visual Direction
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('themes')}
              className="text-xs font-semibold text-[#047857] hover:underline cursor-pointer"
            >
              Open Theme Studio →
            </button>
          </div>
          {activeTheme && (
            <div className="space-y-2 text-xs">
              <input
                type="text"
                aria-label="Theme Title"
                value={activeTheme.title}
                onChange={(e) => {
                  const updatedThemes = event.themes.map((th) =>
                    th.id === activeTheme.id ? { ...th, title: e.target.value } : th
                  );
                  onUpdateEvent({ ...event, themes: updatedThemes });
                }}
                className="w-full px-2.5 py-1.5 font-semibold rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
              <p className="text-[#6B7280]">
                <strong>Decor:</strong> {activeTheme.decorationIdeas}
              </p>
              <p className="text-[#6B7280]">
                <strong>Lighting:</strong> {activeTheme.lightingIdeas}
              </p>
              <p className="text-[#6B7280]">
                <strong>Photo Booth:</strong> {activeTheme.photoBoothConcept}
              </p>
            </div>
          )}
        </div>

        {/* C. Editable Budget Categories & Realistic Assumptions (Full Width) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-display font-bold text-[#047857] dark:text-emerald-400">
                C. Editable Budget Categories & Deterministic Financial Allocations
              </h2>
              <p className="text-xs text-[#6B7280]">
                Planned Total: <strong className="font-mono">{formatCurrency(budgetSummary.totalPlanned, event.currency)}</strong> of{' '}
                <strong className="font-mono">{formatCurrency(event.totalBudget, event.currency)}</strong> · Remaining Unallocated:{' '}
                <strong className="font-mono">{formatCurrency(budgetSummary.remainingBudget, event.currency)}</strong>
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={autoRebalanceCategories}
                onChange={(e) => setAutoRebalanceCategories(e.target.checked)}
                className="accent-[#047857]"
              />
              <span>Auto-rebalance other categories to lock {formatCurrency(event.totalBudget, event.currency)} ceiling</span>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-slate-800 text-[#6B7280]">
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 px-3">Share %</th>
                  <th className="py-2 px-3">Planned Allocation ({event.currency})</th>
                  <th className="py-2 px-3">Scope & Realistic Assumptions</th>
                  <th className="py-2 pl-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
                {event.budgetItems.map((b) => {
                  const sharePct =
                    event.totalBudget > 0 ? Math.round((b.plannedAmount / event.totalBudget) * 1000) / 10 : 0;
                  return (
                    <tr key={b.id}>
                      <td className="py-2 pr-3 font-medium">
                        {b.category}
                        {b.isMustHave && (
                          <span className="ml-1.5 text-[10px] text-[#047857] font-semibold">
                            · Core
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-[#6B7280]">{sharePct}%</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          aria-label={`${b.category} planned amount`}
                          value={b.plannedAmount}
                          onChange={(e) => handleCategoryPlannedChange(b.id, Number(e.target.value))}
                          className="w-28 px-2 py-1 rounded-md border border-[#E5E7EB] dark:border-slate-700 font-mono tabular-nums bg-transparent"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          aria-label={`${b.category} notes`}
                          value={b.notes}
                          onChange={(e) => {
                            const updated = event.budgetItems.map((item) =>
                              item.id === b.id ? { ...item, notes: e.target.value } : item
                            );
                            onUpdateEvent({ ...event, budgetItems: updated });
                          }}
                          className="w-full px-2 py-1 rounded-md border border-transparent hover:border-[#E5E7EB] focus:border-[#047857] bg-transparent text-[#6B7280]"
                        />
                      </td>
                      <td className="py-2 pl-3 text-right">
                        {event.budgetItems.length > 2 && (
                          <button
                            type="button"
                            aria-label={`Remove ${b.category}`}
                            onClick={() => {
                              const remaining = event.budgetItems.filter((item) => item.id !== b.id);
                              const finalItems = autoRebalanceCategories
                                ? rebalanceBudgetToTarget(remaining, event.totalBudget).updatedItems
                                : remaining;
                              onUpdateEvent({ ...event, budgetItems: finalItems });
                            }}
                            className="p-1 text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Custom Category Inline */}
          <form onSubmit={handleAddInlineCategory} className="flex flex-wrap items-center gap-2 pt-2">
            <input
              type="text"
              placeholder="New category name (e.g., Valet & Security)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent flex-1 min-w-[180px]"
            />
            <input
              type="number"
              min={0}
              placeholder={`Planned (${event.currency})`}
              value={newCategoryAmount}
              onChange={(e) => setNewCategoryAmount(e.target.value)}
              className="w-36 px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 font-mono bg-transparent"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#047857] text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </form>

          {/* Realistic Assumptions & Cost-Saving Alternatives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB] dark:border-slate-800 text-xs">
            <div className="space-y-1.5">
              <p className="font-semibold text-[#1F2937] dark:text-slate-200">
                Realistic Quantitative & Regional Assumptions:
              </p>
              {event.aiProposal.budgetAssumptions.map((assump, idx) => (
                <p key={idx} className="text-[#6B7280]">
                  • {assump}
                </p>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add custom planning assumption..."
                  value={newAssumptionText}
                  onChange={(e) => setNewAssumptionText(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs rounded-md border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newAssumptionText.trim()) return;
                    onUpdateEvent({
                      ...event,
                      aiProposal: {
                        ...event.aiProposal,
                        budgetAssumptions: [...event.aiProposal.budgetAssumptions, newAssumptionText.trim()],
                      },
                    });
                    setNewAssumptionText('');
                  }}
                  className="px-2.5 py-1 rounded-md border border-[#E5E7EB] dark:border-slate-700 font-semibold cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-[#1F2937] dark:text-slate-200">
                Recommended Cost-Saving Alternatives:
              </p>
              {event.aiProposal.costSavingAlternatives.map((alt, idx) => (
                <p key={idx} className="text-[#6B7280]">
                  • {alt}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* D. Dependency-Aware Timeline Milestones */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-bold text-[#047857] dark:text-emerald-400">
                D. Dependency-Aware Timeline Milestones
              </h2>
              <p className="text-[11px] text-[#6B7280]">
                {event.tasks.length} milestones · {depAnalysis.criticalPathTaskIds.length} critical-path prerequisites ·{' '}
                {depAnalysis.chronologicalConflicts.length === 0 ? 'DAG order verified' : `${depAnalysis.chronologicalConflicts.length} conflict(s)`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('timeline')}
              className="text-xs font-semibold text-[#047857] hover:underline cursor-pointer"
            >
              Full Timeline →
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-xs">
            {event.tasks.map((task) => {
              const prereqTitles = (task.dependencies || []).map(
                (depId) => taskTitleById.get(depId) || depId
              );
              const isCritical =
                task.isCriticalPath || depAnalysis.criticalPathTaskIds.includes(task.id);
              return (
                <div
                  key={task.id}
                  className="p-2.5 rounded-lg bg-[#FAF8F2] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#1F2937] dark:text-slate-100">
                      {task.title}
                    </span>
                    <span className="font-mono text-[11px] text-[#047857] dark:text-emerald-400 shrink-0">
                      T-{task.daysBeforeEvent}d ({task.dueDate})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#6B7280]">
                    <span>{task.category}</span>
                    <span>· Priority: {task.priority}</span>
                    {isCritical && (
                      <span className="text-[#B45309] dark:text-amber-400 font-semibold">
                        · Critical Path
                      </span>
                    )}
                    {prereqTitles.length > 0 ? (
                      <span className="text-[#047857] dark:text-emerald-400">
                        · Depends on: {prereqTitles.join(', ')}
                      </span>
                    ) : (
                      <span>· Root Milestone (No prerequisites)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* E. Vendor Requirements & Screening Questions */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold text-[#047857] dark:text-emerald-400">
              E. Vendor Requirements & Screening Checklist
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('vendors')}
              className="text-xs font-semibold text-[#047857] hover:underline cursor-pointer"
            >
              Vendor Directory →
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
            {event.aiProposal.vendorQuestions.map((vq, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[#FAF8F2] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[#1F2937] dark:text-slate-200">
                    {vq.category}{' '}
                    {vq.priorityLevel && (
                      <span className="text-[11px] text-[#047857] font-normal">
                        · {vq.priorityLevel} Priority
                      </span>
                    )}
                    {vq.bookingLeadDays && (
                      <span className="text-[11px] text-[#6B7280] font-mono font-normal">
                        {' '}
                        (Book T-{vq.bookingLeadDays}d)
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const newVendor = {
                        id: `ven_req_${Date.now()}_${idx}`,
                        businessName: `${vq.category} Shortlist Candidate`,
                        contactPerson: 'TBD',
                        phone: '',
                        email: '',
                        website: '',
                        address: event.city,
                        category: vq.category,
                        quotedAmount: 0,
                        finalPrice: 0,
                        advancePaid: 0,
                        availabilityStatus: 'Available' as const,
                        bookingStatus: 'Researching' as const,
                        rating: 4.5,
                        servicesIncluded: vq.requirements || `Required scope for ${event.title}`,
                        additionalFees: 0,
                        cancellationTerms: 'Verify written refund clause',
                        paymentSchedule: '25% advance, 50% milestone, 25% day-of handover',
                        followUpDate: event.eventDate,
                        notes: `Questions to ask: ${(vq.questions || []).join(' | ')}`,
                      };
                      onUpdateEvent({
                        ...event,
                        vendors: [...event.vendors, newVendor],
                      });
                      setStatusMessage(`Added "${newVendor.businessName}" slot to Vendor Directory.`);
                    }}
                    className="text-[11px] font-semibold text-[#047857] hover:underline cursor-pointer shrink-0"
                  >
                    + Add Slot to Vendors
                  </button>
                </div>
                {vq.requirements && <p className="text-[#6B7280]">{vq.requirements}</p>}
                <ul className="text-[#6B7280] pl-4 list-disc space-y-0.5">
                  {vq.questions.map((q, qIdx) => (
                    <li key={qIdx}>{q}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* F. Guests & Catering Plan */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-2 text-xs">
          <h2 className="text-base font-display font-bold text-[#047857] dark:text-emerald-400">
            F. Guest, Catering & Accessibility Plan
          </h2>
          <p>
            <strong>RSVP Strategy:</strong> {event.aiProposal.rsvpStrategy}
          </p>
          <p>
            <strong>Catering Estimate:</strong> {event.aiProposal.cateringEstimateNotes}
          </p>
          <p>
            <strong>Seating Plan:</strong> {event.aiProposal.seatingConsiderations}
          </p>
          <p>
            <strong>Accessibility:</strong> {event.aiProposal.accessibilityNotes}
          </p>
        </div>

        {/* G & H. Event-Specific Recommendations, Risks & Action Plan */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3 text-xs">
          <h2 className="text-base font-display font-bold text-[#047857] dark:text-emerald-400">
            G & H. Event-Specific Recommendations & Risk Contingencies
          </h2>

          {/* Event-Specific Recommendations */}
          <div className="space-y-1.5">
            <p className="font-semibold text-[#1F2937] dark:text-slate-200">
              Tailored Recommendations for {event.eventType} in {event.city}:
            </p>
            {(
              event.aiProposal.eventSpecificRecommendations || [
                `Stagger buffet service counters 20 minutes after stage photo sessions begin for ${event.guestCount} guests.`,
                `Hold 25% of decorator and caterer balance payments until day-of setup handover (3 hours prior to start).`,
              ]
            ).map((rec, idx) => (
              <p key={idx} className="text-[#6B7280]">
                • {rec}
              </p>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Add event-specific recommendation..."
                value={newRecommendationText}
                onChange={(e) => setNewRecommendationText(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs rounded-md border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newRecommendationText.trim()) return;
                  const existing = event.aiProposal.eventSpecificRecommendations || [];
                  onUpdateEvent({
                    ...event,
                    aiProposal: {
                      ...event.aiProposal,
                      eventSpecificRecommendations: [...existing, newRecommendationText.trim()],
                    },
                  });
                  setNewRecommendationText('');
                }}
                className="px-2.5 py-1 rounded-md border border-[#E5E7EB] dark:border-slate-700 font-semibold cursor-pointer"
              >
                + Add
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E5E7EB] dark:border-slate-800">
            {event.aiProposal.risks.map((r, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-stone-50 dark:bg-slate-800/60">
                <p className="font-semibold">
                  {r.riskType} <span className="text-[#6B7280] font-normal">({r.impact})</span>
                </p>
                <p className="text-[#047857] dark:text-emerald-400 mt-0.5">
                  Backup Plan: {r.mitigation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
