import React, { useState } from 'react';
import {
  Users,
  Shield,
  MessageSquare,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  Settings,
  Bell,
  Lock,
  Plus,
  FileDown,
  Loader2,
} from 'lucide-react';
import type {
  CurrencyCode,
  EventPlanWorkspace,
  TeamRole,
  UserProfileSettings,
} from '../types/event';
import {
  calculateBudgetSummary,
  calculateGuestSummary,
  exportBudgetToCsv,
  exportGuestsToCsv,
  exportVendorsToCsv,
  formatCurrency,
} from '../utils/calculations';
import { exportEventToPdf } from '../utils/pdfExport';

// ============================================================================
// 1. TEAM COLLABORATION & RBAC PERMISSIONS — Section 19
// ============================================================================
interface CollaborationViewProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const TeamCollaborationView: React.FC<CollaborationViewProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('Editor');
  const [commentText, setCommentText] = useState('');

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    const member = {
      id: `tm_${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      assignedTasksCount: 0,
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    const logEntry = {
      id: `act_${Date.now()}`,
      actorName: 'Event Owner',
      action: `Added ${member.name} as ${member.role}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    onUpdateEvent({
      ...event,
      teamMembers: [...event.teamMembers, member],
      activityLog: [logEntry, ...event.activityLog],
    });
    setInviteName('');
    setInviteEmail('');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const cm = {
      id: `cm_${Date.now()}`,
      authorName: event.teamMembers[0]?.name || 'Event Owner',
      authorRole: 'Owner' as TeamRole,
      text: commentText.trim(),
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    onUpdateEvent({
      ...event,
      comments: [cm, ...event.comments],
    });
    setCommentText('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">
          Team Collaboration, Roles & Activity Log
        </h1>
        <p className="text-xs text-[#6B7280]">
          Assign Owner, Administrator, Editor, and Viewer permissions, coordinate family/committee tasks, and review change history. Note: Outbound email invitations require configuring an SMTP/email provider.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        {/* Left 7 Cols: Team Directory & Role Matrix */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
            <h2 className="text-base font-display font-bold">Add Collaborator to Event Team</h2>
            <form onSubmit={handleAddCollaborator} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                type="text"
                aria-label="Collaborator Name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Full Name"
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
              <input
                type="email"
                aria-label="Collaborator Email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
              <select
                aria-label="Collaborator Role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="Administrator">Administrator (Manage Event & Team)</option>
                <option value="Editor">Editor (Update Tasks, Budget & Vendors)</option>
                <option value="Viewer">Viewer (Read-Only Access)</option>
              </select>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#047857] text-white font-semibold cursor-pointer"
              >
                Add Member
              </button>
            </form>

            <div className="divide-y divide-[#E5E7EB] dark:divide-slate-800 pt-2">
              {event.teamMembers.map((m) => {
                const realAssignedCount = event.tasks.filter((t) =>
                  t.assignedUser.toLowerCase().includes(m.name.split(' ')[0].toLowerCase())
                ).length;
                return (
                  <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-[#6B7280]">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {m.role === 'Owner' ? (
                          <span className="font-semibold text-[#047857]">Owner</span>
                        ) : (
                          <select
                            aria-label={`Change role for ${m.name}`}
                            value={m.role}
                            onChange={(e) => {
                              const nextRole = e.target.value as TeamRole;
                              onUpdateEvent({
                                ...event,
                                teamMembers: event.teamMembers.map((tm) =>
                                  tm.id === m.id ? { ...tm, role: nextRole } : tm
                                ),
                                activityLog: [
                                  {
                                    id: `act_${Date.now()}`,
                                    actorName: 'Event Owner',
                                    action: `Updated ${m.name}'s role to ${nextRole}`,
                                    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
                                  },
                                  ...event.activityLog,
                                ],
                              });
                            }}
                            className="px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-[#047857]"
                          >
                            <option value="Administrator">Administrator</option>
                            <option value="Editor">Editor</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        )}
                        <span className="block text-[11px] text-[#6B7280]">
                          {realAssignedCount || m.assignedTasksCount} assigned tasks
                        </span>
                      </div>
                      {m.role !== 'Owner' && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateEvent({
                              ...event,
                              teamMembers: event.teamMembers.filter((tm) => tm.id !== m.id),
                              activityLog: [
                                {
                                  id: `act_${Date.now()}`,
                                  actorName: 'Event Owner',
                                  action: `Removed ${m.name} from event team`,
                                  timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
                                },
                                ...event.activityLog,
                              ],
                            })
                          }
                          className="px-2 py-1 text-[11px] rounded border border-[#E5E7EB] dark:border-slate-700 text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared Team Discussion / Comments */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
            <h2 className="text-base font-display font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#047857]" />
              <span>Team Coordination Notes & Comments</span>
            </h2>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                aria-label="Write a coordination note"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share vendor update or family task note..."
                className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#047857] text-white font-semibold cursor-pointer"
              >
                Post Note
              </button>
            </form>
            <div className="space-y-3">
              {event.comments.map((cm) => (
                <div
                  key={cm.id}
                  className="p-3 rounded-lg bg-[#FAF8F2] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800"
                >
                  <div className="flex justify-between text-[11px] text-[#6B7280] mb-1">
                    <span className="font-semibold text-[#1F2937] dark:text-slate-200">
                      {cm.authorName} ({cm.authorRole})
                    </span>
                    <span className="font-mono">{cm.createdAt}</span>
                  </div>
                  <p>{cm.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Role Permissions Guide & Activity History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-2.5">
            <h2 className="text-base font-display font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#047857]" />
              <span>Enforced Role Permissions</span>
            </h2>
            <p className="text-[#6B7280]">
              <strong>Owner:</strong> Full control over event deletion, ownership, security rules, and billing.
            </p>
            <p className="text-[#6B7280]">
              <strong>Administrator:</strong> Manage team members, approve vendor contracts, and edit all modules.
            </p>
            <p className="text-[#6B7280]">
              <strong>Editor:</strong> Update assigned timeline tasks, vendor notes, and theme boards.
            </p>
            <p className="text-[#6B7280]">
              <strong>Viewer:</strong> Read-only access to schedules and checklists.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
            <h2 className="text-base font-display font-bold">Audit Activity History</h2>
            <div className="space-y-2.5">
              {event.activityLog.map((act) => (
                <div key={act.id} className="border-b border-[#E5E7EB] dark:border-slate-800 pb-2">
                  <p className="font-medium">{act.action}</p>
                  <p className="text-[11px] text-[#6B7280] font-mono">
                    By {act.actorName} · {act.timestamp}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. REPORTS, EXPORTS & POST-EVENT REVIEW — Sections 23 & 24
// ============================================================================
interface ReportsAndReviewProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const ReportsAndPostEventView: React.FC<ReportsAndReviewProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [includeBudget, setIncludeBudget] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeVendors, setIncludeVendors] = useState(true);
  const [includeGuests, setIncludeGuests] = useState(true);
  const [includePostReview, setIncludePostReview] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportMessage, setPdfExportMessage] = useState<string | null>(null);

  const budgetSummary = calculateBudgetSummary(event.totalBudget, event.budgetItems, event.currency);
  const guestSummary = calculateGuestSummary(event.guests);

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    setPdfExportMessage(null);
    try {
      exportEventToPdf(event, {
        includeEventDetails: true,
        includeBudget,
        includeGuests,
        includeTimeline,
      });
      setPdfExportMessage(`Downloaded PDF report for "${event.title}"!`);
      setTimeout(() => setPdfExportMessage(null), 4000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setPdfExportMessage('Unable to generate PDF file. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const downloadCsvFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            Reports, Exports & Post-Event Review
          </h1>
          <p className="text-xs text-[#6B7280]">
            Export customizable PDF/Printable event plans, CSV ledgers, and complete post-event reconciliation reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Action: Downloadable PDF File */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            title="Export downloadable PDF file with event details, budget summary, and guest roster"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{isExportingPdf ? 'Exporting PDF...' : 'Download PDF Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadCsvFile(
                exportBudgetToCsv(event.budgetItems),
                `${event.title.replace(/\s+/g, '_')}_budget.csv`
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Budget</span>
          </button>
          <button
            type="button"
            onClick={() =>
              downloadCsvFile(
                exportGuestsToCsv(event.guests),
                `${event.title.replace(/\s+/g, '_')}_guests.csv`
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Guests</span>
          </button>
          <button
            type="button"
            onClick={() =>
              downloadCsvFile(
                exportVendorsToCsv(event.vendors),
                `${event.title.replace(/\s+/g, '_')}_vendors.csv`
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Vendors</span>
          </button>
        </div>
      </div>

      {pdfExportMessage && (
        <div className="p-3 rounded-xl bg-[#ECFDF5] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-[#064E3B] dark:text-emerald-300 flex items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
            <span className="font-medium">{pdfExportMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setPdfExportMessage(null)}
            className="text-xs text-[#064E3B] hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section Inclusion Checkboxes for Printable / PDF Export */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 flex flex-wrap items-center gap-5 text-xs no-print">
        <span className="font-semibold">Include Sections in Report:</span>
        {[
          { label: 'Budget & Expense Report', val: includeBudget, set: setIncludeBudget },
          { label: 'Timeline & Task Checklist', val: includeTimeline, set: setIncludeTimeline },
          { label: 'Vendor Contracts', val: includeVendors, set: setIncludeVendors },
          { label: 'Guest & Catering Summary', val: includeGuests, set: setIncludeGuests },
          { label: 'Post-Event Review & Thank-You', val: includePostReview, set: setIncludePostReview },
        ].map((sec) => (
          <label key={sec.label} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={sec.val}
              onChange={(e) => sec.set(e.target.checked)}
              className="accent-[#047857]"
            />
            <span>{sec.label}</span>
          </label>
        ))}
      </div>

      {/* Section 1: Budget & Expense Report */}
      {includeBudget && (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-display font-bold">
              1. Budget & Expense Reconciliation Report
            </h2>
            <span className="font-mono text-[#047857] font-semibold">
              Ceiling: {formatCurrency(event.totalBudget, event.currency)} · Remaining:{' '}
              {formatCurrency(budgetSummary.remainingBudget, event.currency)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-slate-800 text-[#6B7280]">
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 px-3 text-right">Planned</th>
                  <th className="py-2 px-3 text-right">Quoted</th>
                  <th className="py-2 px-3 text-right">Actual</th>
                  <th className="py-2 px-3 text-right">Paid</th>
                  <th className="py-2 px-3 text-right">Outstanding</th>
                  <th className="py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800 font-mono tabular-nums">
                {event.budgetItems.map((b) => {
                  const eff = b.actualAmount > 0 ? b.actualAmount : b.quotedAmount;
                  const out = Math.max(0, eff - b.paidAmount);
                  return (
                    <tr key={b.id}>
                      <td className="py-2 pr-3 font-sans font-medium">{b.category}</td>
                      <td className="py-2 px-3 text-right">
                        {formatCurrency(b.plannedAmount, event.currency)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatCurrency(b.quotedAmount, event.currency)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatCurrency(b.actualAmount, event.currency)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatCurrency(b.paidAmount, event.currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {formatCurrency(out, event.currency)}
                      </td>
                      <td className="py-2 pl-3 font-sans">{b.status}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E5E7EB] dark:border-slate-700 font-mono tabular-nums font-bold">
                  <td className="py-2.5 pr-3 font-sans">Total</td>
                  <td className="py-2.5 px-3 text-right">
                    {formatCurrency(budgetSummary.totalPlanned, event.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatCurrency(budgetSummary.totalQuoted, event.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatCurrency(budgetSummary.totalActual, event.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatCurrency(budgetSummary.totalPaid, event.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#047857]">
                    {formatCurrency(budgetSummary.totalOutstanding, event.currency)}
                  </td>
                  <td className="py-2.5 pl-3 font-sans" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Timeline & Task Checklist */}
      {includeTimeline && (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4 text-xs">
          <h2 className="text-lg font-display font-bold">
            2. Timeline & Milestone Checklist ({event.tasks.filter((t) => t.status === 'Completed').length}/
            {event.tasks.length} Completed)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-slate-800 text-[#6B7280]">
                  <th className="py-2 pr-3">Task Milestone</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Due Date</th>
                  <th className="py-2 px-3">Priority</th>
                  <th className="py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
                {event.tasks.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-3 font-medium">{t.title}</td>
                    <td className="py-2 px-3">{t.category}</td>
                    <td className="py-2 px-3 font-mono">{t.dueDate}</td>
                    <td className="py-2 px-3">{t.priority}</td>
                    <td className="py-2 pl-3 font-semibold">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Vendor Contracts */}
      {includeVendors && (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4 text-xs">
          <h2 className="text-lg font-display font-bold">
            3. Vendor Contracts & Balance Schedule ({event.vendors.length} Vendors)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-slate-800 text-[#6B7280]">
                  <th className="py-2 pr-3">Vendor Business</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Contact</th>
                  <th className="py-2 px-3 text-right">Final / Quoted</th>
                  <th className="py-2 px-3 text-right">Advance Paid</th>
                  <th className="py-2 px-3 text-right">Balance Due</th>
                  <th className="py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
                {event.vendors.map((v) => {
                  const committed = v.finalPrice > 0 ? v.finalPrice : v.quotedAmount;
                  const bal = Math.max(0, committed - v.advancePaid);
                  return (
                    <tr key={v.id}>
                      <td className="py-2 pr-3 font-medium">{v.businessName}</td>
                      <td className="py-2 px-3">{v.category}</td>
                      <td className="py-2 px-3">{v.contactPerson}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {formatCurrency(committed, event.currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {formatCurrency(v.advancePaid, event.currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {formatCurrency(bal, event.currency)}
                      </td>
                      <td className="py-2 pl-3">{v.bookingStatus}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Guest & Catering Summary */}
      {includeGuests && (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4 text-xs">
          <h2 className="text-lg font-display font-bold">
            4. Guest RSVP & Catering Plate Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#FAF8F2] dark:bg-slate-950 font-mono tabular-nums">
            <div>
              <p className="text-[#6B7280] font-sans">Confirmed Headcount</p>
              <p className="text-base font-bold mt-0.5 text-[#047857]">
                {guestSummary.confirmedAttendees} Guests
              </p>
            </div>
            <div>
              <p className="text-[#6B7280] font-sans">Pending / Invited</p>
              <p className="text-base font-bold mt-0.5">{guestSummary.pendingAttendees} Guests</p>
            </div>
            <div>
              <p className="text-[#6B7280] font-sans">Catering Plates (+7% Buffer)</p>
              <p className="text-base font-bold mt-0.5">
                {guestSummary.cateringEstimateWithBuffer} Plates
              </p>
            </div>
            <div>
              <p className="text-[#6B7280] font-sans">Meal Breakdown</p>
              <p className="text-xs font-semibold mt-1 font-sans">
                Non-Veg: {guestSummary.mealBreakdown['Non-Vegetarian'] || 0} · Veg:{' '}
                {guestSummary.mealBreakdown['Vegetarian'] || 0} · Jain:{' '}
                {guestSummary.mealBreakdown['Jain'] || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Post-Event Review Workspace (Section 23) */}
      {includePostReview && (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4 text-xs">
          <h2 className="text-lg font-display font-bold">
            5. Post-Event Review & Reconciliation Workspace
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#FAF8F2] dark:bg-slate-950 font-mono tabular-nums">
            <div>
              <p className="text-[#6B7280] font-sans">Final Budget vs Actual</p>
              <p className="text-base font-bold mt-1">
                {formatCurrency(budgetSummary.totalActual, event.currency)} /{' '}
                {formatCurrency(event.totalBudget, event.currency)}
              </p>
            </div>
            <div>
              <p className="text-[#6B7280] font-sans">Final Attendance Recorded</p>
              <input
                type="number"
                aria-label="Final attendance"
                value={event.postEventReview.finalAttendance}
                onChange={(e) =>
                  onUpdateEvent({
                    ...event,
                    postEventReview: {
                      ...event.postEventReview,
                      finalAttendance: Number(e.target.value),
                    },
                  })
                }
                className="mt-1 px-2.5 py-1 text-sm font-bold rounded border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <p className="text-[#6B7280] font-sans">Confirmed RSVPs vs Planned</p>
              <p className="text-base font-bold mt-1">
                {guestSummary.confirmedAttendees} / {event.guestCount} Guests
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="post-exec" className="block font-semibold mb-1">
                Editable AI Post-Event Executive Summary
              </label>
              <textarea
                id="post-exec"
                rows={4}
                value={event.postEventReview.executiveSummary}
                onChange={(e) =>
                  onUpdateEvent({
                    ...event,
                    postEventReview: {
                      ...event.postEventReview,
                      executiveSummary: e.target.value,
                    },
                  })
                }
                className="w-full p-3 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="post-thankyou" className="block font-semibold mb-1">
                Guest & Sponsor Thank-You Message Generator
              </label>
              <textarea
                id="post-thankyou"
                rows={4}
                value={event.postEventReview.thankYouDraft}
                onChange={(e) =>
                  onUpdateEvent({
                    ...event,
                    postEventReview: {
                      ...event.postEventReview,
                      thankYouDraft: e.target.value,
                    },
                  })
                }
                className="w-full p-3 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="post-lessons" className="block font-semibold mb-1">
              Lessons Learned & Unresolved Expenses
            </label>
            <textarea
              id="post-lessons"
              rows={2}
              value={event.postEventReview.lessonsLearned}
              onChange={(e) =>
                onUpdateEvent({
                  ...event,
                  postEventReview: {
                    ...event.postEventReview,
                    lessonsLearned: e.target.value,
                  },
                })
              }
              className="w-full p-3 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. USER PROFILE, CURRENCY & PRIVACY SETTINGS — Sections 5, 20, 26
// ============================================================================
interface SettingsViewProps {
  profile: UserProfileSettings;
  onUpdateProfile: (updated: UserProfileSettings) => void;
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateProfile,
  event,
  onUpdateEvent,
}) => {
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profile);
    if (profile.currency !== event.currency) {
      onUpdateEvent({ ...event, currency: profile.currency });
    }
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">
          Account Profile, Regional Currency & Privacy Settings
        </h1>
        <p className="text-xs text-[#6B7280]">
          Configure your preferred currency (defaults to INR ₹), timezone, reminder lead times, and AI privacy controls.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4 text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-name" className="block font-medium mb-1">
              Full Name
            </label>
            <input
              id="prof-name"
              type="text"
              value={profile.name}
              onChange={(e) => onUpdateProfile({ ...profile, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>
          <div>
            <label htmlFor="prof-email" className="block font-medium mb-1">
              Email Address
            </label>
            <input
              id="prof-email"
              type="email"
              value={profile.email}
              onChange={(e) => onUpdateProfile({ ...profile, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>
          <div>
            <label htmlFor="prof-currency" className="block font-medium mb-1">
              Preferred Default Currency
            </label>
            <select
              id="prof-currency"
              value={profile.currency}
              onChange={(e) =>
                onUpdateProfile({ ...profile, currency: e.target.value as CurrencyCode })
              }
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="INR">INR (₹ Indian Rupee)</option>
              <option value="USD">USD ($ US Dollar)</option>
              <option value="EUR">EUR (€ Euro)</option>
              <option value="GBP">GBP (£ British Pound)</option>
              <option value="AED">AED (UAE Dirham)</option>
              <option value="SGD">SGD (Singapore Dollar)</option>
            </select>
          </div>
          <div>
            <label htmlFor="prof-country" className="block font-medium mb-1">
              Country / Region
            </label>
            <input
              id="prof-country"
              type="text"
              value={profile.country}
              onChange={(e) => onUpdateProfile({ ...profile, country: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>
          <div>
            <label htmlFor="prof-tz" className="block font-medium mb-1">
              Timezone
            </label>
            <input
              id="prof-tz"
              type="text"
              value={profile.timezone}
              onChange={(e) => onUpdateProfile({ ...profile, timezone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>
          <div>
            <label htmlFor="prof-lead" className="block font-medium mb-1">
              Reminder Lead Time (Days before deadline)
            </label>
            <input
              id="prof-lead"
              type="number"
              min={1}
              max={60}
              value={profile.reminderLeadDays}
              onChange={(e) =>
                onUpdateProfile({ ...profile, reminderLeadDays: Number(e.target.value) })
              }
              className="w-full px-3 py-2 font-mono rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FAF8F2] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold flex items-center gap-1.5 text-[#047857]">
              <Lock className="w-4 h-4" />
              <span>AI Privacy & External Notification Disclosure</span>
            </p>
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={profile.aiPrivacyConsent}
                onChange={(e) =>
                  onUpdateProfile({ ...profile, aiPrivacyConsent: e.target.checked })
                }
                className="accent-[#047857]"
              />
              <span>Enable AI Planning Assistance</span>
            </label>
          </div>
          <p className="text-[#6B7280] leading-relaxed">
            • Gemini API calls run exclusively on the server and never include your private guest contact list or payment credentials.
            <br />• In-app deadline reminders are active immediately; outbound SMS/Email/Push delivery requires connecting an external messaging provider (Twilio/SendGrid/FCM).
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedToast ? (
            <span className="text-[#047857] font-semibold">
              Settings saved and currency synced!
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#047857] hover:bg-[#064E3B] text-white font-semibold cursor-pointer"
          >
            Save Profile Settings
          </button>
        </div>
      </form>
    </div>
  );
};
