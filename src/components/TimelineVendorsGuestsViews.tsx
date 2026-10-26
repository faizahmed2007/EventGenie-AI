import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Store,
  Users,
  Download,
  Upload,
  Search,
  Scale,
  FileCheck,
  FileClock,
  FileText,
  Check,
  Filter,
} from 'lucide-react';
import type {
  EventPlanWorkspace,
  GuestItem,
  RsvpStatus,
  TaskPriority,
  TaskStatus,
  TimelineTaskItem,
  VendorBookingStatus,
  VendorItem,
  ContractStatus,
} from '../types/event';
import {
  calculateGuestSummary,
  exportGuestsToCsv,
  exportVendorsToCsv,
  formatCurrency,
  parseGuestCsv,
  recalculateTimelineDeadlines,
} from '../utils/calculations';
import {
  analyzeTimelineDependencies,
  buildDependencyAwareTimeline,
} from '../utils/planningEngine';

// ============================================================================
// 1. DYNAMIC EVENT TIMELINE (List, Kanban, Milestone, Calendar Views) — Section 11
// ============================================================================
interface TimelineViewProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const TimelineTasksView: React.FC<TimelineViewProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'milestone' | 'calendar'>('list');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Venue');
  const [newDueDate, setNewDueDate] = useState(event.eventDate);
  const [newPriority, setNewPriority] = useState<TaskPriority>('High');
  const [newDependencyId, setNewDependencyId] = useState<string>('');
  const [newAssignee] = useState('Arindam Sen (Owner)');
  const [proposedEventDate, setProposedEventDate] = useState(event.eventDate);
  const [dateShiftPreview, setDateShiftPreview] = useState<{
    updatedTasks: TimelineTaskItem[];
    overdueCount: number;
    conflictTaskTitles: string[];
  } | null>(null);

  const todayStr = '2026-10-20';
  const totalTasks = event.tasks.length;
  const completedCount = event.tasks.filter((t) => t.status === 'Completed').length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const depAnalysis = analyzeTimelineDependencies(event.tasks);
  const taskTitleById = new Map(event.tasks.map((t) => [t.id, t.title]));

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const evTime = new Date(event.eventDate).getTime();
    const dueTime = new Date(newDueDate).getTime();
    const daysBefore =
      !Number.isNaN(evTime) && !Number.isNaN(dueTime)
        ? Math.max(0, Math.round((evTime - dueTime) / 86400000))
        : 14;

    const newTask: TimelineTaskItem = {
      id: `t_${Date.now()}`,
      title: newTitle.trim(),
      description: '',
      category: newCategory,
      startDate: newDueDate,
      dueDate: newDueDate,
      daysBeforeEvent: daysBefore,
      priority: newPriority,
      status: 'Not Started',
      assignedUser: newAssignee,
      dependencies: newDependencyId ? [newDependencyId] : [],
      estimatedCost: 0,
      relatedVendor: '',
      notes: '',
    };

    onUpdateEvent({
      ...event,
      tasks: [...event.tasks, newTask],
      updatedAt: new Date().toISOString(),
    });
    setNewTitle('');
    setNewDependencyId('');
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    onUpdateEvent({
      ...event,
      tasks: event.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdateEvent({
      ...event,
      tasks: event.tasks
        .filter((t) => t.id !== taskId)
        .map((t) => ({
          ...t,
          dependencies: (t.dependencies || []).filter((d) => d !== taskId),
        })),
      updatedAt: new Date().toISOString(),
    });
  };

  const handlePreviewDateShift = () => {
    const preview = recalculateTimelineDeadlines(event.tasks, proposedEventDate, todayStr);
    setDateShiftPreview(preview);
  };

  const handleConfirmDateShift = () => {
    if (!dateShiftPreview) return;
    onUpdateEvent({
      ...event,
      eventDate: proposedEventDate,
      tasks: dateShiftPreview.updatedTasks,
      updatedAt: new Date().toISOString(),
    });
    setDateShiftPreview(null);
  };

  const handleResolveDependencies = () => {
    const { tasks: resolved } = buildDependencyAwareTimeline(
      event.tasks,
      event.eventDate,
      event.eventType,
      todayStr
    );
    onUpdateEvent({
      ...event,
      tasks: resolved,
      updatedAt: new Date().toISOString(),
    });
  };

  const statuses: TaskStatus[] = ['Not Started', 'In Progress', 'Completed', 'Blocked', 'Cancelled'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            Dynamic Event Timeline & Task Manager
          </h1>
          <p className="text-xs text-[#6B7280]">
            Dependency-aware preparation milestones, critical path tracking, and automatic deadline recalculation when dates shift.
          </p>
        </div>

        {/* 4 View Switchers */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-200/70 dark:bg-slate-800 self-start">
          {(
            [
              { id: 'list', label: 'List View' },
              { id: 'kanban', label: 'Kanban Board' },
              { id: 'milestone', label: 'Milestone View' },
              { id: 'calendar', label: 'Calendar Schedule' },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setViewMode(v.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === v.id
                  ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                  : 'text-[#6B7280]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress & Event Date Recalculator Bar */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span>
                Overall Checklist Completion ({completedCount} of {totalTasks} tasks ·{' '}
                {depAnalysis.criticalPathTaskIds.length} critical-path milestones)
              </span>
              <span className="font-mono tabular-nums text-[#047857]">{progressPct}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-[#047857] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="shift-event-date" className="text-xs font-medium text-[#6B7280]">
              Event Date:
            </label>
            <input
              id="shift-event-date"
              type="date"
              value={proposedEventDate}
              onChange={(e) => setProposedEventDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
            <button
              type="button"
              onClick={handlePreviewDateShift}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#ECFDF5] text-[#064E3B] hover:bg-emerald-100 cursor-pointer"
            >
              Recalculate Deadlines
            </button>
            <button
              type="button"
              onClick={handleResolveDependencies}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Verify Dependency Order
            </button>
          </div>
        </div>

        {dateShiftPreview && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Confirm Schedule Revision for {proposedEventDate}:
              </p>
              <p className="text-amber-800 dark:text-amber-300">
                All {dateShiftPreview.updatedTasks.length} task deadlines will shift relative to {proposedEventDate}. Overdue tasks flagged: {dateShiftPreview.overdueCount}.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleConfirmDateShift}
                className="px-3 py-1.5 rounded-lg bg-[#047857] text-white font-semibold cursor-pointer"
              >
                Confirm & Apply Revised Schedule
              </button>
              <button
                type="button"
                onClick={() => setDateShiftPreview(null)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Task Form (with Prerequisite Dependency selector) */}
      <form
        onSubmit={handleAddTask}
        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="new-task-title" className="block text-xs font-medium mb-1">
            Task Title
          </label>
          <input
            id="new-task-title"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g., Confirm bridal makeup trial & lighting test"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="new-task-cat" className="block text-xs font-medium mb-1">
            Category
          </label>
          <select
            id="new-task-cat"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="Venue">Venue</option>
            <option value="Catering">Catering</option>
            <option value="Decoration">Decoration</option>
            <option value="Guests">Guests</option>
            <option value="Operations">Operations</option>
            <option value="Ceremony">Ceremony</option>
          </select>
        </div>
        <div>
          <label htmlFor="new-task-dep" className="block text-xs font-medium mb-1">
            Prerequisite Task (Dependency)
          </label>
          <select
            id="new-task-dep"
            value={newDependencyId}
            onChange={(e) => setNewDependencyId(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 max-w-[180px]"
          >
            <option value="">None (Root Task)</option>
            {event.tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title.slice(0, 32)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="new-task-due" className="block text-xs font-medium mb-1">
            Due Date
          </label>
          <input
            id="new-task-due"
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="new-task-prio" className="block text-xs font-medium mb-1">
            Priority
          </label>
          <select
            id="new-task-prio"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </form>

      {/* View Mode 1: List View */}
      {viewMode === 'list' && (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-slate-800 text-[#6B7280] bg-stone-50/60 dark:bg-slate-800/50">
                <th className="py-3 px-4 font-semibold">Task & Dependencies</th>
                <th className="py-3 px-3 font-semibold">Category</th>
                <th className="py-3 px-3 font-semibold">Due Date</th>
                <th className="py-3 px-3 font-semibold">Priority</th>
                <th className="py-3 px-3 font-semibold">Assigned To</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
              {event.tasks.map((task) => {
                const isOverdue =
                  task.status !== 'Completed' &&
                  task.status !== 'Cancelled' &&
                  task.dueDate < todayStr;
                const prereqTitles = (task.dependencies || []).map(
                  (d) => taskTitleById.get(d) || d
                );
                const unmetPrereqs = depAnalysis.unmetPrerequisitesByTask[task.id] || [];
                const isCritical =
                  task.isCriticalPath || depAnalysis.criticalPathTaskIds.includes(task.id);

                return (
                  <tr key={task.id}>
                    <td className="py-3 px-4">
                      <p className="font-semibold">
                        {task.title}
                        {isCritical && (
                          <span className="ml-2 text-[10px] font-semibold text-[#B45309] dark:text-amber-400">
                            · Critical Path
                          </span>
                        )}
                      </p>
                      {prereqTitles.length > 0 && (
                        <p className="text-[11px] text-[#047857] dark:text-emerald-400 mt-0.5">
                          Depends on: {prereqTitles.join(', ')}
                          {unmetPrereqs.length > 0 && task.status !== 'Completed' && (
                            <span className="text-[#D97706] ml-1">
                              (Waiting on {unmetPrereqs.length} prerequisite)
                            </span>
                          )}
                        </p>
                      )}
                      {task.notes && <p className="text-[11px] text-[#6B7280] mt-0.5">{task.notes}</p>}
                    </td>
                    <td className="py-3 px-3">{task.category}</td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      <span className={isOverdue ? 'text-[#DC2626] font-bold' : ''}>
                        {task.dueDate} {isOverdue ? '(Overdue)' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium">{task.priority}</td>
                    <td className="py-3 px-3 text-[#6B7280]">{task.assignedUser}</td>
                    <td className="py-3 px-3">
                      <select
                        aria-label={`Status for ${task.title}`}
                        value={task.status}
                        onChange={(e) =>
                          handleStatusChange(task.id, e.target.value as TaskStatus)
                        }
                        className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        {statuses.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        aria-label={`Delete ${task.title}`}
                        className="p-1 text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View Mode 2: Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['Not Started', 'In Progress', 'Completed', 'Blocked'] as TaskStatus[]).map((col) => (
            <div
              key={col}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider">{col}</h2>
                <span className="text-xs font-mono text-[#6B7280]">
                  {event.tasks.filter((t) => t.status === col).length}
                </span>
              </div>
              <div className="space-y-2.5">
                {event.tasks
                  .filter((t) => t.status === col)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg bg-[#FAF8F2] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 space-y-2 text-xs"
                    >
                      <p className="font-semibold">{task.title}</p>
                      <p className="text-[11px] text-[#6B7280] font-mono">
                        Due {task.dueDate} · {task.priority}
                      </p>
                      <select
                        aria-label={`Move ${task.title}`}
                        value={task.status}
                        onChange={(e) =>
                          handleStatusChange(task.id, e.target.value as TaskStatus)
                        }
                        className="w-full px-2 py-1 text-[11px] rounded border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        {statuses.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Mode 3 & 4: Milestone / Calendar Schedule View */}
      {(viewMode === 'milestone' || viewMode === 'calendar') && (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
          <h2 className="text-lg font-display font-bold">
            {viewMode === 'milestone'
              ? 'Countdown Milestone Phases'
              : 'Chronological Calendar Schedule'}
          </h2>
          <div className="space-y-4">
            {[...event.tasks]
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .map((t, idx) => (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono font-bold text-[#047857] mt-0.5">
                      0{idx + 1}.
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{t.title}</p>
                      <p className="text-xs text-[#6B7280]">
                        {t.category} · {t.daysBeforeEvent} days before event · {t.assignedUser}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span>{t.dueDate}</span>
                    <span className="font-semibold text-[#047857]">{t.status}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. VENDOR & QUOTATION MANAGEMENT — Section 12
// ============================================================================
interface VendorManagementProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const VendorManagementView: React.FC<VendorManagementProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Caterers');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [quotedAmount, setQuotedAmount] = useState<number>(50000);
  const [servicesIncluded, setServicesIncluded] = useState('');
  const [initialBookingStatus, setInitialBookingStatus] = useState<VendorBookingStatus>('Quote Received');
  const [initialContractStatus, setInitialContractStatus] = useState<ContractStatus>('Pending');
  const [compareCategory, setCompareCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [contractFilter, setContractFilter] = useState<string>('ALL');

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    const newVendor: VendorItem = {
      id: `v_${Date.now()}`,
      businessName: businessName.trim(),
      contactPerson: contactPerson.trim() || 'Primary Contact',
      phone: phone.trim() || 'Not provided',
      email: '',
      website: '',
      address: event.city,
      category,
      quotedAmount: Number(quotedAmount) || 0,
      finalPrice: Number(quotedAmount) || 0,
      advancePaid: 0,
      availabilityStatus: 'Available',
      bookingStatus: initialBookingStatus,
      contractStatus: initialContractStatus,
      rating: 4.5,
      servicesIncluded: servicesIncluded.trim() || 'Standard event package',
      additionalFees: 0,
      cancellationTerms: 'Standard terms',
      paymentSchedule: '50% advance, 50% on event day',
      followUpDate: event.eventDate,
      notes: 'User-entered vendor record',
      isDemoIllustrative: false,
    };
    onUpdateEvent({
      ...event,
      vendors: [...event.vendors, newVendor],
      updatedAt: new Date().toISOString(),
    });
    setBusinessName('');
    setContactPerson('');
    setPhone('');
    setServicesIncluded('');
    setInitialBookingStatus('Quote Received');
    setInitialContractStatus('Pending');
  };

  const handleUpdateVendor = (
    id: string,
    field: keyof VendorItem,
    val: string | number
  ) => {
    onUpdateEvent({
      ...event,
      vendors: event.vendors.map((v) => (v.id === id ? { ...v, [field]: val } : v)),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleToggleContractStatus = (vendorId: string) => {
    const target = event.vendors.find((v) => v.id === vendorId);
    if (!target) return;
    const current = target.contractStatus || (target.bookingStatus === 'Booked' ? 'Signed' : 'Pending');
    const next: ContractStatus = current === 'Signed' ? 'Pending' : 'Signed';
    handleUpdateVendor(vendorId, 'contractStatus', next);
  };

  const handleDeleteVendor = (id: string) => {
    onUpdateEvent({
      ...event,
      vendors: event.vendors.filter((v) => v.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleExportCsv = () => {
    const csv = exportVendorsToCsv(event.vendors);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_')}_vendors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Vendor Status Counts
  const totalVendors = event.vendors.length;
  const bookedCount = event.vendors.filter((v) => v.bookingStatus === 'Booked').length;
  const pendingCount = event.vendors.filter((v) =>
    ['Pending', 'Negotiating', 'Quote Received', 'Shortlisted'].includes(v.bookingStatus)
  ).length;
  const inquiryCount = event.vendors.filter((v) =>
    ['Inquiry', 'Researching', 'Contacted'].includes(v.bookingStatus)
  ).length;
  const signedContractCount = event.vendors.filter(
    (v) => (v.contractStatus || (v.bookingStatus === 'Booked' ? 'Signed' : 'Pending')) === 'Signed'
  ).length;

  const comparisonList = event.vendors.filter((v) => {
    if (compareCategory !== 'ALL' && v.category !== compareCategory) return false;
    const contract = v.contractStatus || (v.bookingStatus === 'Booked' ? 'Signed' : 'Pending');

    if (statusFilter === 'Booked' && v.bookingStatus !== 'Booked') return false;
    if (
      statusFilter === 'Pending' &&
      !['Pending', 'Negotiating', 'Quote Received', 'Shortlisted'].includes(v.bookingStatus)
    )
      return false;
    if (
      statusFilter === 'Inquiry' &&
      !['Inquiry', 'Researching', 'Contacted'].includes(v.bookingStatus)
    )
      return false;

    if (contractFilter === 'Signed' && contract !== 'Signed') return false;
    if (contractFilter === 'Pending' && contract !== 'Pending') return false;

    return true;
  });

  const getStatusBadgeConfig = (status: VendorBookingStatus) => {
    if (status === 'Booked') {
      return {
        label: 'Booked',
        className:
          'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
        Icon: CheckCircle2,
      };
    }
    if (['Inquiry', 'Researching', 'Contacted'].includes(status)) {
      return {
        label: status === 'Inquiry' ? 'Inquiry' : `Inquiry (${status})`,
        className:
          'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800',
        Icon: Search,
      };
    }
    if (status === 'Completed') {
      return {
        label: 'Completed',
        className:
          'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
        Icon: CheckCircle2,
      };
    }
    if (status === 'Rejected') {
      return {
        label: 'Rejected',
        className:
          'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800',
        Icon: AlertCircle,
      };
    }
    // Default Pending bucket (Pending, Quote Received, Negotiating, Shortlisted)
    return {
      label: status === 'Pending' ? 'Pending' : `Pending (${status})`,
      className:
        'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
      Icon: Clock,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            Vendor Directory & Quotation Comparison
          </h1>
          <p className="text-xs text-[#6B7280]">
            Track vendor quotes, advances, balances, contract execution status, and compare deliverables side-by-side.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer self-start hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Vendors CSV</span>
        </button>
      </div>

      {/* Vendor Status KPI Overview Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800">
          <p className="text-[11px] text-[#6B7280]">Total Vendors</p>
          <p className="text-lg font-bold font-mono mt-0.5">{totalVendors}</p>
          <p className="text-[10px] text-slate-500 mt-1">Across all categories</p>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Booked</p>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
          </div>
          <p className="text-lg font-bold font-mono text-[#064E3B] dark:text-emerald-200 mt-0.5">
            {bookedCount}
          </p>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 mt-1">
            Confirmed partnerships
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Pending</p>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-lg font-bold font-mono text-amber-900 dark:text-amber-200 mt-0.5">
            {pendingCount}
          </p>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400 mt-1">
            Negotiations & quotes
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-sky-800 dark:text-sky-300">Inquiry</p>
            <Search className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <p className="text-lg font-bold font-mono text-sky-900 dark:text-sky-200 mt-0.5">
            {inquiryCount}
          </p>
          <p className="text-[10px] text-sky-700/80 dark:text-sky-400 mt-1">
            Research & outreach
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FAF8F2] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Contracts Signed</p>
            <FileCheck className="w-3.5 h-3.5 text-[#047857]" />
          </div>
          <p className="text-lg font-bold font-mono text-[#047857] dark:text-emerald-400 mt-0.5">
            {signedContractCount} <span className="text-xs text-slate-400 font-normal">/ {totalVendors}</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {totalVendors - signedContractCount} pending contract
          </p>
        </div>
      </div>

      {/* Add Vendor Quote Form */}
      <form
        onSubmit={handleAddVendor}
        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3 items-end"
      >
        <div className="lg:col-span-2">
          <label htmlFor="v-name" className="block text-xs font-medium mb-1">
            Business Name
          </label>
          <input
            id="v-name"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g., Royal Caterers"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="v-cat" className="block text-xs font-medium mb-1">
            Service Category
          </label>
          <select
            id="v-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            {[
              'Venues',
              'Caterers',
              'Decorators',
              'Photographers',
              'Videographers',
              'Makeup artists',
              'Attire providers',
              'Florists',
              'DJs and musicians',
              'Entertainers',
              'Transport',
              'Accommodation',
              'Rental equipment',
              'Printers',
              'Event staff',
              'Security',
              'Other custom categories',
            ].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="v-contact" className="block text-xs font-medium mb-1">
            Contact Person
          </label>
          <input
            id="v-contact"
            type="text"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="Name / Phone"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="v-quote" className="block text-xs font-medium mb-1">
            Quoted ({event.currency})
          </label>
          <input
            id="v-quote"
            type="number"
            value={quotedAmount}
            onChange={(e) => setQuotedAmount(Number(e.target.value))}
            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="v-status" className="block text-xs font-medium mb-1">
            Initial Status
          </label>
          <select
            id="v-status"
            value={initialBookingStatus}
            onChange={(e) => setInitialBookingStatus(e.target.value as VendorBookingStatus)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="Inquiry">Inquiry</option>
            <option value="Quote Received">Quote Received</option>
            <option value="Pending">Pending</option>
            <option value="Booked">Booked</option>
            <option value="Shortlisted">Shortlisted</option>
          </select>
        </div>
        <div>
          <label htmlFor="v-contract" className="block text-xs font-medium mb-1">
            Contract Status
          </label>
          <select
            id="v-contract"
            value={initialContractStatus}
            onChange={(e) => setInitialContractStatus(e.target.value as ContractStatus)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="Pending">Pending</option>
            <option value="Signed">Signed</option>
            <option value="Draft">Draft</option>
            <option value="Not Required">Not Required</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer h-[34px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Vendor</span>
        </button>
      </form>

      {/* Side-by-Side Quotation Comparison Matrix */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
        {/* Table Controls & Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#047857]" />
            <h2 className="text-lg font-display font-bold">
              Vendor Quotation Matrix & Contracts
            </h2>
            <span className="text-xs text-[#6B7280]">
              ({comparisonList.length} shown)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              aria-label="Filter vendor category for comparison"
              value={compareCategory}
              onChange={(e) => setCompareCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="ALL">All Categories</option>
              <option value="Caterers">Caterers</option>
              <option value="Venues">Venues</option>
              <option value="Decorators">Decorators</option>
              <option value="Photographers">Photographers</option>
            </select>

            {/* Status Filter */}
            <select
              aria-label="Filter by vendor status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="Booked">Status: Booked</option>
              <option value="Pending">Status: Pending</option>
              <option value="Inquiry">Status: Inquiry</option>
            </select>

            {/* Contract Status Filter */}
            <select
              aria-label="Filter by contract status"
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="ALL">All Contracts</option>
              <option value="Signed">Contract: Signed</option>
              <option value="Pending">Contract: Pending</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-slate-800 text-[#6B7280] bg-stone-50/60 dark:bg-slate-800/50">
                <th className="py-2.5 px-3 font-semibold">Vendor</th>
                <th className="py-2.5 px-3 font-semibold">Category</th>
                <th className="py-2.5 px-3 font-semibold text-right">Quoted</th>
                <th className="py-2.5 px-3 font-semibold text-right">Agreed Final</th>
                <th className="py-2.5 px-3 font-semibold text-right">Advance Paid</th>
                <th className="py-2.5 px-3 font-semibold text-right">Balance Due</th>
                <th className="py-2.5 px-3 font-semibold">Status Badge</th>
                <th className="py-2.5 px-3 font-semibold">Contract Status</th>
                <th className="py-2.5 px-3 font-semibold">Services & Inclusions</th>
                <th className="py-2.5 px-3 font-semibold text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
              {comparisonList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No vendors match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                comparisonList.map((v) => {
                  const balance = Math.max(0, (v.finalPrice || v.quotedAmount) - v.advancePaid);
                  const contractStatus =
                    v.contractStatus || (v.bookingStatus === 'Booked' ? 'Signed' : 'Pending');
                  const statusConfig = getStatusBadgeConfig(v.bookingStatus);
                  const StatusIcon = statusConfig.Icon;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{v.businessName}</p>
                        <p className="text-[11px] text-[#6B7280]">
                          {v.contactPerson} · {v.phone}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{v.category}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(v.quotedAmount, event.currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <input
                          type="number"
                          aria-label={`Agreed price for ${v.businessName}`}
                          value={v.finalPrice}
                          onChange={(e) =>
                            handleUpdateVendor(v.id, 'finalPrice', Number(e.target.value))
                          }
                          className="w-24 text-right px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <input
                          type="number"
                          aria-label={`Advance paid to ${v.businessName}`}
                          value={v.advancePaid}
                          onChange={(e) =>
                            handleUpdateVendor(v.id, 'advancePaid', Number(e.target.value))
                          }
                          className="w-24 text-right px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#047857] dark:text-emerald-400">
                        {formatCurrency(balance, event.currency)}
                      </td>

                      {/* Status Badges with Quick Dropdown Selection */}
                      <td className="py-3 px-3 min-w-[130px]">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.className}`}
                          >
                            <StatusIcon className="w-3 h-3 shrink-0" />
                            <span>{statusConfig.label}</span>
                          </span>
                          <select
                            aria-label={`Change status for ${v.businessName}`}
                            value={v.bookingStatus}
                            onChange={(e) =>
                              handleUpdateVendor(
                                v.id,
                                'bookingStatus',
                                e.target.value as VendorBookingStatus
                              )
                            }
                            className="block w-full text-[11px] px-1.5 py-0.5 rounded border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                          >
                            <option value="Booked">Booked</option>
                            <option value="Pending">Pending</option>
                            <option value="Inquiry">Inquiry</option>
                            <option value="Quote Received">Quote Received</option>
                            <option value="Negotiating">Negotiating</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Completed">Completed</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                      </td>

                      {/* Quick-Action Contract Status Toggle */}
                      <td className="py-3 px-3 min-w-[140px]">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleContractStatus(v.id)}
                            title={`Contract is currently ${contractStatus}. Click to toggle to ${
                              contractStatus === 'Signed' ? 'Pending' : 'Signed'
                            }`}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 ${
                              contractStatus === 'Signed'
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/90 dark:text-emerald-300 dark:border-emerald-700'
                                : contractStatus === 'Draft'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:hover:bg-amber-900/90 dark:text-amber-300 dark:border-amber-700'
                            }`}
                          >
                            {contractStatus === 'Signed' ? (
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : contractStatus === 'Draft' ? (
                              <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            ) : (
                              <FileClock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            )}
                            <span>{contractStatus}</span>
                            <span className="text-[9px] opacity-60 ml-0.5">⇄</span>
                          </button>

                          <select
                            aria-label={`Select contract status for ${v.businessName}`}
                            value={contractStatus}
                            onChange={(e) =>
                              handleUpdateVendor(
                                v.id,
                                'contractStatus',
                                e.target.value as ContractStatus
                              )
                            }
                            className="text-[10px] px-1 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                            title="Select contract status"
                          >
                            <option value="Signed">Signed</option>
                            <option value="Pending">Pending</option>
                            <option value="Draft">Draft</option>
                            <option value="Not Required">Not Required</option>
                          </select>
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        <p className="truncate" title={v.servicesIncluded}>
                          {v.servicesIncluded}
                        </p>
                        <p className="text-[11px] text-[#6B7280] truncate">
                          Terms: {v.cancellationTerms}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteVendor(v.id)}
                          aria-label={`Remove ${v.businessName}`}
                          className="p-1 text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. GUEST & RSVP MANAGEMENT (Households, CSV Import/Export, Catering Math) — Section 18
// ============================================================================
interface GuestManagementProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const GuestManagementView: React.FC<GuestManagementProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [fullName, setFullName] = useState('');
  const [household, setHousehold] = useState('');
  const [contact, setContact] = useState('');
  const [attendeeCount, setAttendeeCount] = useState<number>(2);
  const [mealPreference, setMealPreference] = useState<GuestItem['mealPreference']>('Non-Vegetarian');
  const [seatingGroup, setSeatingGroup] = useState('Main Banquet');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState(
    'Full Name,Household,Contact,RSVP Status,Attendees,Meal Preference,Seating Group\nSourav Ganguly,Ganguly Family,+91 98300 55555,Accepted,3,Non-Vegetarian,VIP Table 1\nRiya Sen,Sen Household,+91 98300 66666,Accepted,2,Vegetarian,Friends Zone'
  );

  const summary = calculateGuestSummary(event.guests);

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    const newGuest: GuestItem = {
      id: `g_${Date.now()}`,
      fullName: fullName.trim(),
      household: household.trim() || `${fullName.trim()} Household`,
      contact: contact.trim() || 'Private',
      invitationStatus: 'Sent',
      rsvpStatus: 'Accepted',
      attendeeCount: Math.max(1, Number(attendeeCount) || 1),
      mealPreference,
      dietaryRestrictions: 'None',
      accessibilityRequirements: 'None',
      seatingGroup,
      notes: 'Manually recorded by host',
      source: 'Manual Entry',
    };
    onUpdateEvent({
      ...event,
      guests: [newGuest, ...event.guests],
      updatedAt: new Date().toISOString(),
    });
    setFullName('');
    setHousehold('');
    setContact('');
  };

  const handleImportCsv = () => {
    const imported = parseGuestCsv(csvText);
    if (imported.length === 0) return;
    onUpdateEvent({
      ...event,
      guests: [...imported, ...event.guests],
      updatedAt: new Date().toISOString(),
    });
    setCsvModalOpen(false);
  };

  const handleExportCsv = () => {
    const csv = exportGuestsToCsv(event.guests);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_')}_guests.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredGuests = event.guests.filter((g) => {
    if (statusFilter !== 'ALL' && g.rsvpStatus !== statusFilter) return false;
    if (
      searchQuery.trim() &&
      !g.fullName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !g.household.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            Guest List, Households & Catering Estimator
          </h1>
          <p className="text-xs text-[#6B7280]">
            Private guest contact records isolated to your account. Distinguishes manual RSVP logs from CSV imports.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Import CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#047857] text-white cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Guest CSV</span>
          </button>
        </div>
      </div>

      {/* Guest & Catering KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Invited Pax', val: summary.totalInvitedHeadcount },
          { label: 'Confirmed Attendees', val: summary.confirmedAttendees },
          { label: 'Pending Responses', val: summary.pendingAttendees },
          { label: 'Declined Pax', val: summary.declinedAttendees },
          { label: 'Distinct Households', val: summary.householdsCount },
          { label: 'Est. Catering Plates (+5%)', val: summary.recommendedCateringPlates },
        ].map((st) => (
          <div
            key={st.label}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800"
          >
            <p className="text-[11px] text-[#6B7280]">{st.label}</p>
            <p className="text-xl font-bold font-mono tabular-nums mt-1">{st.val}</p>
          </div>
        ))}
      </div>

      {/* Add Guest Form */}
      <form
        onSubmit={handleAddGuest}
        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
      >
        <div>
          <label htmlFor="g-name" className="block text-xs font-medium mb-1">
            Guest / Family Name
          </label>
          <input
            id="g-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g., Dr. Amitava Sen"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="g-house" className="block text-xs font-medium mb-1">
            Household Group
          </label>
          <input
            id="g-house"
            type="text"
            value={household}
            onChange={(e) => setHousehold(e.target.value)}
            placeholder="Sen Family"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="g-count" className="block text-xs font-medium mb-1">
            Attendees Count
          </label>
          <input
            id="g-count"
            type="number"
            min={1}
            value={attendeeCount}
            onChange={(e) => setAttendeeCount(Number(e.target.value))}
            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="g-meal" className="block text-xs font-medium mb-1">
            Meal Preference
          </label>
          <select
            id="g-meal"
            value={mealPreference}
            onChange={(e) =>
              setMealPreference(e.target.value as GuestItem['mealPreference'])
            }
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="Non-Vegetarian">Non-Vegetarian</option>
            <option value="Vegetarian">Vegetarian</option>
            <option value="Jain">Jain</option>
            <option value="Vegan">Vegan</option>
            <option value="Kids">Kids</option>
          </select>
        </div>
        <div>
          <label htmlFor="g-seat" className="block text-xs font-medium mb-1">
            Seating Group
          </label>
          <input
            id="g-seat"
            type="text"
            value={seatingGroup}
            onChange={(e) => setSeatingGroup(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Guest</span>
        </button>
      </form>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            aria-label="Search guests"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by guest or household..."
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <select
            aria-label="Filter RSVP status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All RSVP Statuses</option>
            <option value="Accepted">Accepted</option>
            <option value="Pending">Pending</option>
            <option value="Invited">Invited</option>
            <option value="Declined">Declined</option>
            <option value="Waitlisted">Waitlisted</option>
          </select>
        </div>
        <div className="text-xs text-[#6B7280] font-mono">
          Confirmed Meals: Non-Veg ({summary.mealBreakdown['Non-Vegetarian'] || 0}) · Veg (
          {summary.mealBreakdown['Vegetarian'] || 0}) · Jain ({summary.mealBreakdown['Jain'] || 0})
        </div>
      </div>

      {/* Guest Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E5E7EB] dark:border-slate-800 text-[#6B7280] bg-stone-50/60 dark:bg-slate-800/50">
              <th className="py-3 px-4 font-semibold">Guest / Group</th>
              <th className="py-3 px-3 font-semibold">Household</th>
              <th className="py-3 px-3 font-semibold text-right">Attendees</th>
              <th className="py-3 px-3 font-semibold">RSVP Status</th>
              <th className="py-3 px-3 font-semibold">Meal & Dietary</th>
              <th className="py-3 px-3 font-semibold">Seating & Accessibility</th>
              <th className="py-3 px-3 font-semibold">Record Source</th>
              <th className="py-3 px-3 font-semibold text-center">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
            {filteredGuests.map((g) => (
              <tr key={g.id}>
                <td className="py-2.5 px-4 font-semibold">{g.fullName}</td>
                <td className="py-2.5 px-3 text-[#6B7280]">{g.household}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  <input
                    type="number"
                    min={1}
                    aria-label={`Attendee count for ${g.fullName}`}
                    value={g.attendeeCount}
                    onChange={(e) => {
                      const cnt = Math.max(1, Number(e.target.value) || 1);
                      onUpdateEvent({
                        ...event,
                        guests: event.guests.map((item) =>
                          item.id === g.id ? { ...item, attendeeCount: cnt } : item
                        ),
                      });
                    }}
                    className="w-16 text-right px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                  />
                </td>
                <td className="py-2.5 px-3">
                  <select
                    aria-label={`RSVP status for ${g.fullName}`}
                    value={g.rsvpStatus}
                    onChange={(e) => {
                      const nextStatus = e.target.value as RsvpStatus;
                      onUpdateEvent({
                        ...event,
                        guests: event.guests.map((item) =>
                          item.id === g.id ? { ...item, rsvpStatus: nextStatus } : item
                        ),
                      });
                    }}
                    className="px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    {(['Not Invited', 'Invited', 'Pending', 'Accepted', 'Declined', 'Waitlisted'] as RsvpStatus[]).map(
                      (st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      )
                    )}
                  </select>
                </td>
                <td className="py-2.5 px-3">
                  <span>{g.mealPreference}</span>
                  {g.dietaryRestrictions !== 'None' && (
                    <span className="block text-[11px] text-[#6B7280]">{g.dietaryRestrictions}</span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <span>{g.seatingGroup}</span>
                  {g.accessibilityRequirements !== 'None' && (
                    <span className="block text-[11px] text-[#047857]">
                      {g.accessibilityRequirements}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-[#6B7280]">{g.source}</td>
                <td className="py-2.5 px-3 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateEvent({
                        ...event,
                        guests: event.guests.filter((item) => item.id !== g.id),
                      })
                    }
                    aria-label={`Delete ${g.fullName}`}
                    className="p-1 text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk CSV Import Modal */}
      {csvModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="csv-import-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h2 id="csv-import-title" className="text-xl font-display font-bold">
              Bulk Import Guests via CSV
            </h2>
            <p className="text-xs text-[#6B7280]">
              Format: Full Name, Household, Contact, RSVP Status, Attendees, Meal Preference, Seating Group
            </p>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 text-xs font-mono rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="px-4 py-2 text-xs rounded-lg border border-[#E5E7EB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#047857] rounded-lg cursor-pointer"
              >
                Import Guests Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
