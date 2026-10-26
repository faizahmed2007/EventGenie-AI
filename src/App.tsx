import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  Calculator,
  Sliders,
  Clock,
  Store,
  Users,
  Palette,
  Mail,
  HeartHandshake,
  UserCheck,
  FileBarChart,
  Settings as SettingsIcon,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react';
import type {
  EventPlanWorkspace,
  EventStatus,
  UserProfileSettings,
} from './types/event';
import {
  ADDITIONAL_SAMPLE_TEMPLATES,
  BENGALI_WEDDING_DEMO_EVENT,
} from './data/demoEvents';
import {
  auth,
  deleteEventFromFirestore,
  loadUserEventsFromFirestore,
  loadUserProfileFromFirestore,
  saveEventToFirestore,
  saveUserProfileToFirestore,
  signOut,
} from './services/firebase/firebaseClient';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { EventWizardModal } from './components/EventWizardModal';
import {
  AIEventPlannerView,
  MyEventsView,
  OverviewDashboardView,
} from './components/DashboardAndPlannerViews';
import {
  BudgetOptimizerView,
  WhatIfSimulatorView,
} from './components/BudgetAndSimulatorViews';
import {
  GuestManagementView,
  TimelineTasksView,
  VendorManagementView,
} from './components/TimelineVendorsGuestsViews';
import {
  InvitationCreatorView,
  SpecializedPlannersView,
  ThemeStudioView,
} from './components/CreativeAndSpecializedViews';
import {
  ReportsAndPostEventView,
  SettingsView,
  TeamCollaborationView,
} from './components/CollaborationReportsSettingsViews';

type NavTabId =
  | 'overview'
  | 'my-events'
  | 'planner'
  | 'budget'
  | 'simulator'
  | 'timeline'
  | 'vendors'
  | 'guests'
  | 'themes'
  | 'invitations'
  | 'specialized'
  | 'collaboration'
  | 'reports'
  | 'settings';

const NAV_ITEMS: { id: NavTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'my-events', label: 'My Events', icon: FolderKanban },
  { id: 'planner', label: 'AI Event Planner', icon: Sparkles },
  { id: 'budget', label: 'Budget Planner', icon: Calculator },
  { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
  { id: 'timeline', label: 'Timeline & Tasks', icon: Clock },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'guests', label: 'Guests & RSVPs', icon: Users },
  { id: 'themes', label: 'Theme Studio', icon: Palette },
  { id: 'invitations', label: 'Invitations', icon: Mail },
  { id: 'specialized', label: 'Cultural, Party & Fest', icon: HeartHandshake },
  { id: 'collaboration', label: 'Community & Team', icon: UserCheck },
  { id: 'reports', label: 'Reports & Insights', icon: FileBarChart },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') !== '1';
  });
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTabId>('overview');

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileSettings>({
    uid: 'demo_user',
    name: 'Arindam Sen',
    email: 'arindam.sen@example.com',
    currency: 'INR',
    country: 'India',
    timezone: 'Asia/Kolkata',
    reminderLeadDays: 7,
    aiPrivacyConsent: true,
  });

  const [events, setEvents] = useState<EventPlanWorkspace[]>(() => [
    BENGALI_WEDDING_DEMO_EVENT,
    ...ADDITIONAL_SAMPLE_TEMPLATES,
  ]);
  const [activeEventId, setActiveEventId] = useState<string>(
    BENGALI_WEDDING_DEMO_EVENT.id
  );

  // Sync dark mode class on documentElement
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const loadedProf = await loadUserProfileFromFirestore(user.uid);
          if (loadedProf) {
            setProfile(loadedProf);
          } else {
            const nextProf: UserProfileSettings = {
              uid: user.uid,
              name: user.displayName || 'Event Planner',
              email: user.email || '',
              currency: 'INR',
              country: 'India',
              timezone: 'Asia/Kolkata',
              reminderLeadDays: 7,
              aiPrivacyConsent: true,
            };
            setProfile(nextProf);
            await saveUserProfileToFirestore(nextProf);
          }
          const userEvents = await loadUserEventsFromFirestore(user.uid);
          if (userEvents.length > 0) {
            setEvents([
              ...userEvents,
              BENGALI_WEDDING_DEMO_EVENT,
              ...ADDITIONAL_SAMPLE_TEMPLATES,
            ]);
            setActiveEventId(userEvents[0].id);
          }
        } catch {
          // Keep local demo events if rules/network prevent initial fetch
        }
      } else {
        // Clear any previous authenticated user's private events and profile on sign-out
        setProfile({
          uid: 'demo_user',
          name: 'Arindam Sen (Sample Profile)',
          email: 'arindam.sen@example.com',
          currency: 'INR',
          country: 'India',
          timezone: 'Asia/Kolkata',
          reminderLeadDays: 7,
          aiPrivacyConsent: true,
        });
        setEvents((prev) => {
          const demoOnly = prev.filter((ev) => ev.isDemo);
          return demoOnly.length > 0
            ? demoOnly
            : [BENGALI_WEDDING_DEMO_EVENT, ...ADDITIONAL_SAMPLE_TEMPLATES];
        });
        setActiveEventId(BENGALI_WEDDING_DEMO_EVENT.id);
      }
    });
    return () => unsub();
  }, []);

  const activeEvent =
    events.find((e) => e.id === activeEventId) || events[0];

  const handleUpdateActiveEvent = (updated: EventPlanWorkspace) => {
    setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)));
    if (currentUser && !updated.isDemo) {
      void saveEventToFirestore(updated);
    }
  };

  const handleCreateNewEvent = (newEv: EventPlanWorkspace) => {
    const withOwner: EventPlanWorkspace = {
      ...newEv,
      ownerId: currentUser?.uid || 'local_user',
      isDemo: !currentUser,
    };
    setEvents((prev) => [withOwner, ...prev]);
    setActiveEventId(withOwner.id);
    setShowLanding(false);
    setActiveTab('overview');
    if (currentUser) {
      void saveEventToFirestore(withOwner);
    }
  };

  const handleDuplicateEvent = (
    sourceId: string,
    includePrivateGuestsAndPayments: boolean
  ) => {
    const src = events.find((e) => e.id === sourceId);
    if (!src) return;
    const copy: EventPlanWorkspace = {
      ...src,
      id: `evt_copy_${Date.now()}`,
      ownerId: currentUser?.uid || 'local_user',
      title: `${src.title} (Copy)`,
      isDemo: !currentUser,
      status: 'Planning',
      guests: includePrivateGuestsAndPayments ? src.guests : [],
      budgetItems: src.budgetItems.map((b) => ({
        ...b,
        paidAmount: includePrivateGuestsAndPayments ? b.paidAmount : 0,
        actualAmount: includePrivateGuestsAndPayments ? b.actualAmount : 0,
      })),
      updatedAt: new Date().toISOString(),
    };
    setEvents((prev) => [copy, ...prev]);
    setActiveEventId(copy.id);
    if (currentUser) {
      void saveEventToFirestore(copy);
    }
  };

  const handleUpdateEventStatus = (id: string, status: EventStatus) => {
    const target = events.find((ev) => ev.id === id);
    if (!target) return;
    const updated: EventPlanWorkspace = {
      ...target,
      status,
      updatedAt: new Date().toISOString(),
    };
    setEvents((prev) => prev.map((ev) => (ev.id === id ? updated : ev)));
    if (currentUser && !updated.isDemo) {
      void saveEventToFirestore(updated);
    }
  };

  const handleDeleteEvent = (id: string) => {
    const remaining = events.filter((e) => e.id !== id);
    if (remaining.length === 0) return;
    setEvents(remaining);
    if (activeEventId === id) {
      setActiveEventId(remaining[0].id);
    }
    if (currentUser) {
      void deleteEventFromFirestore(id);
    }
  };

  const unreadNotifications = activeEvent.notifications.filter((n) => !n.read);

  // Global search results across active event
  const searchResults = globalSearch.trim()
    ? [
        ...activeEvent.tasks
          .filter((t) => t.title.toLowerCase().includes(globalSearch.toLowerCase()))
          .map((t) => ({ label: `Task: ${t.title}`, tab: 'timeline' as NavTabId })),
        ...activeEvent.vendors
          .filter((v) => v.businessName.toLowerCase().includes(globalSearch.toLowerCase()))
          .map((v) => ({ label: `Vendor: ${v.businessName}`, tab: 'vendors' as NavTabId })),
        ...activeEvent.guests
          .filter((g) => g.fullName.toLowerCase().includes(globalSearch.toLowerCase()))
          .map((g) => ({ label: `Guest: ${g.fullName}`, tab: 'guests' as NavTabId })),
        ...activeEvent.budgetItems
          .filter((b) => b.category.toLowerCase().includes(globalSearch.toLowerCase()))
          .map((b) => ({ label: `Budget: ${b.category}`, tab: 'budget' as NavTabId })),
      ].slice(0, 6)
    : [];

  if (showLanding) {
    return (
      <>
        <LandingPage
          darkMode={darkMode}
          templates={[BENGALI_WEDDING_DEMO_EVENT, ...ADDITIONAL_SAMPLE_TEMPLATES]}
          onStartPlanning={() => setShowLanding(false)}
          onOpenWizard={() => {
            setShowLanding(false);
            setWizardOpen(true);
          }}
          onSelectTemplate={(tpl) => {
            setActiveEventId(tpl.id);
            setShowLanding(false);
            setActiveTab('overview');
          }}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onContinueDemo={() => setShowLanding(false)}
        />
        <EventWizardModal
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onCreateEvent={handleCreateNewEvent}
        />
      </>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row transition-colors ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#FAF8F2] text-[#1F2937]'
      }`}
    >
      {/* Desktop & Mobile Sidebar */}
      <aside
        aria-label="Main Application Navigation"
        className={`no-print fixed inset-y-0 left-0 z-40 lg:static flex flex-col border-r transition-all ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E5E7EB]'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} ${
          mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800">
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setShowLanding(true)}
              className="text-xl font-display font-bold text-[#064E3B] dark:text-emerald-400 tracking-tight cursor-pointer truncate"
            >
              EventGenie AI
            </button>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:inline-flex p-1.5 rounded-lg text-[#6B7280] hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close mobile menu"
            className="lg:hidden p-1.5 rounded-lg text-[#6B7280]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#047857] text-white font-semibold shadow-xs'
                    : 'text-[#1F2937] dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Back to Landing Page */}
        <div className="p-3 border-t border-[#E5E7EB] dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowLanding(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#6B7280] hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Home className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Public Landing Page</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header
          className={`no-print sticky top-0 z-30 h-16 px-4 lg:px-8 border-b flex items-center justify-between gap-4 ${
            darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-[#E5E7EB]'
          } backdrop-blur-xs`}
        >
          {/* Left: Mobile Menu + Active Event Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg border border-[#E5E7EB] dark:border-slate-700 shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>

            <select
              aria-label="Switch active event"
              value={activeEvent.id}
              onChange={(e) => setActiveEventId(e.target.value)}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-[#FAF8F2] dark:bg-slate-800 min-w-0 w-full max-w-[180px] sm:max-w-xs truncate"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.isDemo ? '[Sample] ' : ''}
                  {ev.title} ({ev.currency})
                </option>
              ))}
            </select>
            <span
              className={`hidden xl:inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border shrink-0 ${
                activeEvent.isDemo
                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'bg-[#ECFDF5] dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-[#064E3B] dark:text-emerald-300'
              }`}
              title={
                activeEvent.isDemo
                  ? 'Illustrative sample template data — create or duplicate an event while signed in to persist to Firestore'
                  : 'Private workspace synced to your account'
              }
            >
              {activeEvent.isDemo ? 'Illustrative Sample Data' : 'Cloud Synced Workspace'}
            </span>
          </div>

          {/* Center: Global Search */}
          <div className="relative hidden md:block flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label="Global workspace search"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search tasks, vendors, guests, budget..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 shadow-lg p-1.5 z-50">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveTab(res.tab);
                      setGlobalSearch('');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer block truncate"
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Create Event, Notifications, Theme Toggle, Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Event</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* Notifications Button & Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                aria-label={`Notifications (${unreadNotifications.length} unread)`}
                className="relative p-2 rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#D4AF65] text-[#1F2937] rounded-full">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 shadow-xl p-4 z-50 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800 pb-2">
                    <span className="font-bold">Reminders & Alerts</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateActiveEvent({
                          ...activeEvent,
                          notifications: activeEvent.notifications.map((n) => ({
                            ...n,
                            read: true,
                          })),
                        });
                      }}
                      className="text-[#047857] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {activeEvent.notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-lg border ${
                          n.read
                            ? 'border-[#E5E7EB] dark:border-slate-800 opacity-60'
                            : 'border-emerald-300 bg-[#ECFDF5]/60 dark:bg-emerald-950/30'
                        }`}
                      >
                        <p className="font-semibold">{n.title}</p>
                        <p className="text-[#6B7280] mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-[#D4AF65]" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Auth / Profile Button */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => void signOut(auth)}
                aria-label="Sign Out"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                aria-label="Sign In"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-lg border border-[#047857] text-[#047857] dark:text-emerald-400 cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewDashboardView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
              onNavigateTab={(t) => setActiveTab(t as NavTabId)}
            />
          )}
          {activeTab === 'my-events' && (
            <MyEventsView
              events={events}
              activeEventId={activeEvent.id}
              onSelectEvent={(id) => {
                setActiveEventId(id);
                setActiveTab('overview');
              }}
              onOpenWizard={() => setWizardOpen(true)}
              onDuplicateEvent={handleDuplicateEvent}
              onUpdateStatus={handleUpdateEventStatus}
              onDeleteEvent={handleDeleteEvent}
            />
          )}
          {activeTab === 'planner' && (
            <AIEventPlannerView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
              onNavigateTab={(t) => setActiveTab(t as NavTabId)}
            />
          )}
          {activeTab === 'budget' && (
            <BudgetOptimizerView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
          {activeTab === 'simulator' && (
            <WhatIfSimulatorView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
          {activeTab === 'timeline' && (
            <TimelineTasksView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
          {activeTab === 'vendors' && (
            <VendorManagementView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
          {activeTab === 'guests' && (
            <GuestManagementView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
          {activeTab === 'themes' && (
            <ThemeStudioView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
          {activeTab === 'invitations' && (
            <InvitationCreatorView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
          {activeTab === 'specialized' && (
            <SpecializedPlannersView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
          {activeTab === 'collaboration' && (
            <TeamCollaborationView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
          {activeTab === 'reports' && (
            <ReportsAndPostEventView
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              profile={profile}
              onUpdateProfile={(up) => {
                setProfile(up);
                if (currentUser) void saveUserProfileToFirestore(up);
              }}
              event={activeEvent}
              onUpdateEvent={handleUpdateActiveEvent}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onContinueDemo={() => setAuthModalOpen(false)}
      />
      <EventWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreateEvent={handleCreateNewEvent}
      />
    </div>
  );
}
