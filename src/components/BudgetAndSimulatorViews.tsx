import React, { useState } from 'react';
import {
  Calculator,
  AlertTriangle,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Download,
  TrendingDown,
  ShieldAlert,
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
  BudgetStatus,
  EventPlanWorkspace,
  WhatIfScenarioItem,
} from '../types/event';
import {
  DEFAULT_BUDGET_CATEGORIES,
  calculateBudgetSummary,
  exportBudgetToCsv,
  formatCurrency,
  rebalanceBudgetToTarget,
  simulateWhatIfScenario,
} from '../utils/calculations';
import { analyzeWhatIfViaServer } from '../services/gemini/geminiService';
import { BudgetSpendingChartsModule } from './BudgetSpendingChartsModule';

const CHART_COLORS = ['#047857', '#D4AF65', '#064E3B', '#059669', '#92400E', '#1F2937', '#6B7280', '#10B981'];

// ============================================================================
// 1. SMART BUDGET OPTIMIZER (BudgetBloom Module) — Section 9
// ============================================================================
interface BudgetOptimizerProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const BudgetOptimizerView: React.FC<BudgetOptimizerProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPlanned, setNewPlanned] = useState<number>(15000);
  const [newVendor, setNewVendor] = useState('');
  const [targetTotalInput, setTargetTotalInput] = useState<number>(event.totalBudget);
  const [lastRebalanceDiffs, setLastRebalanceDiffs] = useState<
    { category: string; oldPlanned: number; newPlanned: number; delta: number }[]
  >([]);

  React.useEffect(() => {
    setTargetTotalInput(event.totalBudget);
    setLastRebalanceDiffs([]);
  }, [event.id, event.totalBudget]);

  const summary = calculateBudgetSummary(event.totalBudget, event.budgetItems, event.currency);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = newCategoryName.trim();
    if (!cat) return;
    const item: BudgetCategoryItem = {
      id: `b_${Date.now()}`,
      category: cat,
      plannedAmount: Math.max(0, Number(newPlanned) || 0),
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: newVendor.trim() || 'TBD',
      paymentDueDate: event.eventDate,
      status: 'Estimated',
      notes: 'Custom added category',
      isCustom: true,
    };
    onUpdateEvent({
      ...event,
      budgetItems: [...event.budgetItems, item],
      updatedAt: new Date().toISOString(),
    });
    setNewCategoryName('');
    setNewPlanned(15000);
    setNewVendor('');
  };

  const handleUpdateItemField = (
    id: string,
    field: keyof BudgetCategoryItem,
    value: string | number | boolean
  ) => {
    const updatedItems = event.budgetItems.map((b) =>
      b.id === id ? { ...b, [field]: value } : b
    );
    onUpdateEvent({
      ...event,
      budgetItems: updatedItems,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteItem = (id: string) => {
    onUpdateEvent({
      ...event,
      budgetItems: event.budgetItems.filter((b) => b.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleApplyTotalBudgetChange = (newBudgetCeiling: number) => {
    const { updatedItems, changes } = rebalanceBudgetToTarget(event.budgetItems, newBudgetCeiling);
    setLastRebalanceDiffs(changes);
    setTargetTotalInput(newBudgetCeiling);
    onUpdateEvent({
      ...event,
      totalBudget: newBudgetCeiling,
      budgetItems: updatedItems,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDownloadCsv = () => {
    const csv = exportBudgetToCsv(event.budgetItems);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_')}_budget.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const barData = event.budgetItems.map((b) => ({
    name: b.category.length > 12 ? `${b.category.slice(0, 10)}…` : b.category,
    Planned: b.plannedAmount,
    Quoted: b.quotedAmount,
    Actual: b.actualAmount,
  }));

  const pieData = event.budgetItems
    .filter((b) => b.plannedAmount > 0)
    .map((b) => ({
      name: b.category,
      value: b.plannedAmount,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Smart Budget Optimizer</h1>
          <p className="text-xs text-[#6B7280]">
            Deterministic financial arithmetic distinguishing AI estimates, confirmed vendor quotes, and actual paid expenses.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-stone-50 cursor-pointer self-start"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download CSV Budget</span>
        </button>
      </div>

      {/* Automated Alerts Banner */}
      {summary.alerts.length > 0 && (
        <div className="space-y-2">
          {summary.alerts.map((al, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                al.level === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-[#DC2626] dark:text-red-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{al.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 8 Financial Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Budget Ceiling', val: formatCurrency(summary.totalBudget, event.currency) },
          { label: 'Total Planned', val: formatCurrency(summary.totalPlanned, event.currency) },
          { label: 'Total Quoted', val: formatCurrency(summary.totalQuoted, event.currency) },
          { label: 'Total Actual', val: formatCurrency(summary.totalActual, event.currency) },
          { label: 'Total Paid', val: formatCurrency(summary.totalPaid, event.currency) },
          { label: 'Outstanding Due', val: formatCurrency(summary.totalOutstanding, event.currency) },
          { label: 'Remaining Budget', val: formatCurrency(summary.remainingBudget, event.currency) },
          { label: 'Contingency Reserve', val: formatCurrency(summary.contingencyPlanned, event.currency) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800"
          >
            <p className="text-[11px] text-[#6B7280] truncate">{stat.label}</p>
            <p className="text-base font-bold font-mono tabular-nums mt-1 truncate">{stat.val}</p>
          </div>
        ))}
      </div>

      {/* AI Budget Optimizer Controls Bar */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-display font-bold flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[#047857]" />
              <span>Budget Rebalancer & Priority-Preserving Optimizer</span>
            </h2>
            <p className="text-xs text-[#6B7280]">
              Protected “Must-Have” categories are shielded from steep cuts when reducing the total budget.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              aria-label="Target Total Budget"
              value={targetTotalInput}
              onChange={(e) => setTargetTotalInput(Number(e.target.value))}
              className="w-36 px-3 py-1.5 text-xs font-mono rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
            <button
              type="button"
              onClick={() => handleApplyTotalBudgetChange(targetTotalInput)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
            >
              Recalculate Allocations
            </button>
            <button
              type="button"
              onClick={() => handleApplyTotalBudgetChange(Math.round(event.totalBudget * 0.9))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Reduce by 10%
            </button>
            <button
              type="button"
              onClick={() =>
                handleApplyTotalBudgetChange(Math.max(50000, event.totalBudget - 50000))
              }
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Reduce by {formatCurrency(50000, event.currency)}
            </button>
          </div>
        </div>

        {lastRebalanceDiffs.length > 0 && (
          <div className="p-3 rounded-lg bg-[#ECFDF5] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
            <p className="font-semibold text-[#064E3B] dark:text-emerald-300 mb-1">
              Allocation Changes Applied:
            </p>
            <div className="flex flex-wrap gap-3 font-mono tabular-nums text-[11px]">
              {lastRebalanceDiffs.map((d) => (
                <span key={d.category}>
                  {d.category}: {formatCurrency(d.oldPlanned, event.currency)} →{' '}
                  {formatCurrency(d.newPlanned, event.currency)} (
                  {d.delta >= 0 ? `+${d.delta}` : d.delta})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Charts Module: Estimated vs Actual Spending Breakdown & Variance Analytics */}
      <BudgetSpendingChartsModule
        budgetItems={event.budgetItems}
        totalBudget={event.totalBudget}
        currency={event.currency}
      />

      {/* Add Budget Category Form */}
      <form
        onSubmit={handleAddCategory}
        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="add-budget-cat" className="block text-xs font-medium mb-1">
            Category (Select default or type custom)
          </label>
          <input
            id="add-budget-cat"
            list="default-budget-cats"
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g., Transportation, Accommodation, Security..."
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
          <datalist id="default-budget-cats">
            {DEFAULT_BUDGET_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="w-36">
          <label htmlFor="add-budget-planned" className="block text-xs font-medium mb-1">
            Planned ({event.currency})
          </label>
          <input
            id="add-budget-planned"
            type="number"
            value={newPlanned}
            onChange={(e) => setNewPlanned(Number(e.target.value))}
            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>

        <div className="w-48">
          <label htmlFor="add-budget-vendor" className="block text-xs font-medium mb-1">
            Vendor / Note
          </label>
          <input
            id="add-budget-vendor"
            type="text"
            value={newVendor}
            onChange={(e) => setNewVendor(e.target.value)}
            placeholder="Assigned vendor"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Category</span>
        </button>
      </form>

      {/* Complete Ledger Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E5E7EB] dark:border-slate-800 text-[#6B7280] bg-stone-50/60 dark:bg-slate-800/50">
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-3 font-semibold text-right">Planned (Est.)</th>
              <th className="py-3 px-3 font-semibold text-right">Quoted</th>
              <th className="py-3 px-3 font-semibold text-right">Actual</th>
              <th className="py-3 px-3 font-semibold text-right">Paid</th>
              <th className="py-3 px-3 font-semibold text-right">Outstanding</th>
              <th className="py-3 px-3 font-semibold">Vendor</th>
              <th className="py-3 px-3 font-semibold">Due Date</th>
              <th className="py-3 px-3 font-semibold">Status</th>
              <th className="py-3 px-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
            {event.budgetItems.map((item) => {
              const effective = item.actualAmount > 0 ? item.actualAmount : item.quotedAmount;
              const outstanding = Math.max(0, effective - item.paidAmount);
              const isOver = item.plannedAmount > 0 && effective > item.plannedAmount;
              return (
                <tr key={item.id} className="hover:bg-stone-50/60 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-medium">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={Boolean(item.isMustHave)}
                        onChange={(e) =>
                          handleUpdateItemField(item.id, 'isMustHave', e.target.checked)
                        }
                        title="Mark as Must-Have priority"
                        aria-label={`Mark ${item.category} as must-have`}
                        className="accent-[#047857]"
                      />
                      <span>{item.category}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    <input
                      type="number"
                      aria-label={`${item.category} planned amount`}
                      value={item.plannedAmount}
                      onChange={(e) =>
                        handleUpdateItemField(item.id, 'plannedAmount', Number(e.target.value))
                      }
                      className="w-24 text-right px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    <input
                      type="number"
                      aria-label={`${item.category} quoted amount`}
                      value={item.quotedAmount}
                      onChange={(e) =>
                        handleUpdateItemField(item.id, 'quotedAmount', Number(e.target.value))
                      }
                      className="w-24 text-right px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    <input
                      type="number"
                      aria-label={`${item.category} actual amount`}
                      value={item.actualAmount}
                      onChange={(e) =>
                        handleUpdateItemField(item.id, 'actualAmount', Number(e.target.value))
                      }
                      className={`w-24 text-right px-2 py-1 rounded border bg-transparent ${
                        isOver
                          ? 'border-red-400 text-[#DC2626] font-bold'
                          : 'border-[#E5E7EB] dark:border-slate-700'
                      }`}
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    <input
                      type="number"
                      aria-label={`${item.category} paid amount`}
                      value={item.paidAmount}
                      onChange={(e) =>
                        handleUpdateItemField(item.id, 'paidAmount', Number(e.target.value))
                      }
                      className="w-24 text-right px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                    {formatCurrency(outstanding, event.currency)}
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      aria-label={`${item.category} vendor`}
                      value={item.vendorName}
                      onChange={(e) =>
                        handleUpdateItemField(item.id, 'vendorName', e.target.value)
                      }
                      className="w-36 px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                    />
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <input
                      type="date"
                      aria-label={`${item.category} payment due date`}
                      value={item.paymentDueDate}
                      onChange={(e) =>
                        handleUpdateItemField(item.id, 'paymentDueDate', e.target.value)
                      }
                      className="px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      aria-label={`${item.category} payment status`}
                      value={item.status}
                      onChange={(e) =>
                        handleUpdateItemField(item.id, 'status', e.target.value as BudgetStatus)
                      }
                      className="px-2 py-1 rounded border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="Estimated">Estimated</option>
                      <option value="Quoted">Quoted</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      aria-label={`Remove ${item.category}`}
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
    </div>
  );
};

// ============================================================================
// 2. WHAT-IF EVENT SIMULATOR (Signature Feature) — Section 10
// ============================================================================
interface WhatIfSimulatorProps {
  event: EventPlanWorkspace;
  onUpdateEvent: (updated: EventPlanWorkspace) => void;
}

export const WhatIfSimulatorView: React.FC<WhatIfSimulatorProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [activeScenario, setActiveScenario] = useState<WhatIfScenarioItem>(() =>
    simulateWhatIfScenario(event, 'add_guests_50')
  );
  const [customQuestion, setCustomQuestion] = useState('');
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  React.useEffect(() => {
    setActiveScenario(simulateWhatIfScenario(event, 'add_guests_50'));
    setAppliedBanner(null);
  }, [event.id]);

  const runPresetScenario = (
    type:
      | 'add_guests_50'
      | 'cut_budget_50k'
      | 'indoor_to_outdoor'
      | 'remove_live_band'
      | 'catering_surge_15'
      | 'move_date_earlier_14d'
      | 'rain_backup'
      | 'vendor_cancels'
      | 'add_wedding_day'
  ) => {
    setAppliedBanner(null);
    const result = simulateWhatIfScenario(event, type);
    setActiveScenario(result);
  };

  const handleRunCustomAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;
    setAnalyzingAi(true);
    const q = customQuestion.toLowerCase();
    let baseType: Parameters<typeof simulateWhatIfScenario>[1] = 'add_guests_50';
    if (q.includes('drop') || q.includes('cut') || q.includes('50,000') || q.includes('budget')) {
      baseType = 'cut_budget_50k';
    } else if (q.includes('outdoor') || q.includes('lawn')) {
      baseType = 'indoor_to_outdoor';
    } else if (q.includes('band') || q.includes('music')) {
      baseType = 'remove_live_band';
    } else if (q.includes('catering') || q.includes('15%')) {
      baseType = 'catering_surge_15';
    } else if (q.includes('earlier') || q.includes('date') || q.includes('week')) {
      baseType = 'move_date_earlier_14d';
    } else if (q.includes('rain') || q.includes('weather')) {
      baseType = 'rain_backup';
    } else if (q.includes('cancel') || q.includes('vendor')) {
      baseType = 'vendor_cancels';
    } else if (q.includes('day') || q.includes('haldi')) {
      baseType = 'add_wedding_day';
    }

    const sim = simulateWhatIfScenario(event, baseType, customQuestion);
    try {
      const aiRes = await analyzeWhatIfViaServer({
        prompt: customQuestion,
        currentBudget: event.totalBudget,
        proposedBudget: sim.proposedTotalBudget,
        currentGuests: event.guestCount,
        proposedGuests: sim.proposedGuestCount,
        currency: event.currency,
      });

      setActiveScenario({
        ...sim,
        name: `Custom Scenario: ${customQuestion.slice(0, 36)}`,
        prompt: customQuestion,
        tradeoffs: aiRes.analysis?.tradeoffs || sim.tradeoffs,
        recommendations: aiRes.analysis?.recommendations || sim.recommendations,
      });
    } catch {
      setActiveScenario({
        ...sim,
        name: `Custom Scenario: ${customQuestion.slice(0, 36)}`,
        prompt: customQuestion,
      });
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleSaveScenario = () => {
    const exists = event.scenarios.some((s) => s.id === activeScenario.id);
    if (exists) return;
    onUpdateEvent({
      ...event,
      scenarios: [activeScenario, ...event.scenarios],
      updatedAt: new Date().toISOString(),
    });
    setAppliedBanner(`Saved "${activeScenario.name}" to your Named Scenarios list.`);
  };

  const handleApplyScenarioToActiveEvent = () => {
    const updatedBudgetItems = event.budgetItems.map((b) => {
      const adj = activeScenario.categoryAdjustments.find(
        (a) => a.category.toLowerCase() === b.category.toLowerCase()
      );
      return adj ? { ...b, plannedAmount: adj.proposedPlanned } : b;
    });

    onUpdateEvent({
      ...event,
      guestCount: activeScenario.proposedGuestCount,
      totalBudget: activeScenario.proposedTotalBudget,
      venueType: activeScenario.proposedVenueType,
      eventDate: activeScenario.proposedEventDate,
      budgetItems: updatedBudgetItems,
      updatedAt: new Date().toISOString(),
    });
    setAppliedBanner(
      `Applied "${activeScenario.name}" to active event! Budget is now ${formatCurrency(
        activeScenario.proposedTotalBudget,
        event.currency
      )} for ${activeScenario.proposedGuestCount} guests.`
    );
  };

  const budgetDelta = activeScenario.proposedTotalBudget - event.totalBudget;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
          <Sliders className="w-6 h-6 text-[#047857]" />
          <span>What-If Event Simulator</span>
        </h1>
        <p className="text-xs text-[#6B7280]">
          Simulate guest surges, budget cuts, weather backups, or date changes side-by-side. The active event is never modified until you explicitly click “Apply Scenario to Active Event”.
        </p>
      </div>

      {/* 9 Interactive Preset Questions */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          Instant Stress-Test Scenarios (Click to Simulate)
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'add_guests_50', label: 'What if 50 more guests attend?' },
            { id: 'cut_budget_50k', label: 'What if the budget drops by ₹50,000?' },
            { id: 'indoor_to_outdoor', label: 'What if we change indoor to outdoor?' },
            { id: 'remove_live_band', label: 'What if we remove the live band?' },
            { id: 'catering_surge_15', label: 'What if catering costs increase by 15%?' },
            { id: 'move_date_earlier_14d', label: 'What if event date moves 2 weeks earlier?' },
            { id: 'rain_backup', label: 'What if it rains?' },
            { id: 'vendor_cancels', label: 'What if a vendor cancels?' },
            { id: 'add_wedding_day', label: 'What if we add another day to the wedding?' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                runPresetScenario(preset.id as Parameters<typeof runPresetScenario>[0])
              }
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                activeScenario.prompt === preset.label
                  ? 'bg-[#047857] text-white border-[#047857]'
                  : 'border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom What-If Question Input */}
        <form onSubmit={handleRunCustomAnalysis} className="flex flex-col sm:flex-row gap-2 pt-2">
          <input
            type="text"
            aria-label="Ask a custom What-If question"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Ask any custom scenario, e.g., 'What if we add 50 guests and switch to outdoor lawn?'"
            className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
          />
          <button
            type="submit"
            disabled={analyzingAi}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{analyzingAi ? 'Simulating...' : 'Simulate Custom Question'}</span>
          </button>
        </form>
      </div>

      {appliedBanner && (
        <div className="p-3.5 rounded-xl bg-[#ECFDF5] dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-[#064E3B] dark:text-emerald-200 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{appliedBanner}</span>
        </div>
      )}

      {/* Side-by-Side Comparison: Original Active Plan vs Proposed Scenario */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Original Plan vs Proposed Plan Summary */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
            <div>
              <p className="text-xs font-semibold text-[#047857]">{activeScenario.prompt}</p>
              <h2 className="text-xl font-display font-bold">{activeScenario.name}</h2>
            </div>
            <span
              className={`text-xs font-mono tabular-nums font-bold px-2.5 py-1 rounded-md ${
                budgetDelta > 0
                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-[#ECFDF5] text-[#064E3B]'
              }`}
            >
              {budgetDelta >= 0
                ? `+${formatCurrency(budgetDelta, event.currency)}`
                : formatCurrency(budgetDelta, event.currency)}
            </span>
          </div>

          {/* Side-by-Side Metric Table */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-[#FAF8F2] dark:bg-slate-950 text-xs font-mono tabular-nums">
            <div>
              <p className="text-[#6B7280] font-sans">Parameter</p>
              <p className="mt-2 font-sans font-medium">Total Budget</p>
              <p className="mt-2 font-sans font-medium">Guest Capacity</p>
              <p className="mt-2 font-sans font-medium">Venue Setting</p>
              <p className="mt-2 font-sans font-medium">Event Date</p>
            </div>
            <div>
              <p className="text-[#6B7280] font-sans">Original Active Plan</p>
              <p className="mt-2 font-semibold">{formatCurrency(event.totalBudget, event.currency)}</p>
              <p className="mt-2">{event.guestCount} Guests</p>
              <p className="mt-2 font-sans">{event.venueType}</p>
              <p className="mt-2">{event.eventDate}</p>
            </div>
            <div>
              <p className="text-[#047857] font-sans font-semibold">Proposed Scenario</p>
              <p className="mt-2 font-bold text-[#047857]">
                {formatCurrency(activeScenario.proposedTotalBudget, event.currency)}
              </p>
              <p className="mt-2 font-bold">{activeScenario.proposedGuestCount} Guests</p>
              <p className="mt-2 font-sans font-semibold">{activeScenario.proposedVenueType}</p>
              <p className="mt-2 font-semibold">{activeScenario.proposedEventDate}</p>
            </div>
          </div>

          {/* Category-Level Deltas */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
              Recalculated Category Adjustments
            </h3>
            <div className="divide-y divide-[#E5E7EB] dark:divide-slate-800 text-xs">
              {activeScenario.categoryAdjustments.map((adj) => (
                <div key={adj.category} className="py-2.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{adj.category}</p>
                    <p className="text-[#6B7280]">{adj.reason}</p>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <p>
                      {formatCurrency(adj.originalPlanned, event.currency)} →{' '}
                      <strong>{formatCurrency(adj.proposedPlanned, event.currency)}</strong>
                    </p>
                    <p
                      className={
                        adj.delta > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-[#047857]'
                      }
                    >
                      {adj.delta >= 0
                        ? `+${formatCurrency(adj.delta, event.currency)}`
                        : formatCurrency(adj.delta, event.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[#6B7280] italic">{activeScenario.assumptionsLabel}</p>

          {/* Confirm / Save / Discard Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleApplyScenarioToActiveEvent}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#064E3B] rounded-lg cursor-pointer"
            >
              Apply Scenario to Active Event
            </button>
            <button
              type="button"
              onClick={handleSaveScenario}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Save to Named Scenarios
            </button>
            <button
              type="button"
              onClick={() => runPresetScenario('add_guests_50')}
              className="px-3 py-2 text-xs text-[#6B7280] hover:underline cursor-pointer"
            >
              Reset / Discard Preview
            </button>
          </div>
        </div>

        {/* Right: Trade-offs, Affected Tasks & Saved Scenarios */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-4">
            <h2 className="text-lg font-display font-bold">Operational Trade-Offs & Affected Tasks</h2>
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-[#1F2937] dark:text-slate-200">Trade-Off Analysis:</p>
              {activeScenario.tradeoffs.map((tr, i) => (
                <p key={i} className="text-[#6B7280] leading-relaxed">
                  • {tr}
                </p>
              ))}

              <p className="font-semibold text-[#1F2937] dark:text-slate-200 pt-2">
                Affected Timeline Tasks:
              </p>
              {activeScenario.affectedTasks.map((tk, i) => (
                <p key={i} className="text-[#047857] dark:text-emerald-400">
                  → {tk}
                </p>
              ))}

              <p className="font-semibold text-[#1F2937] dark:text-slate-200 pt-2">
                Recommended Mitigation:
              </p>
              {activeScenario.recommendations.map((rec, i) => (
                <p key={i} className="text-[#6B7280]">
                  ✓ {rec}
                </p>
              ))}
            </div>
          </div>

          {/* Saved Named Scenarios Library */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
            <h2 className="text-lg font-display font-bold">
              Saved Scenarios ({event.scenarios.length})
            </h2>
            <div className="space-y-2.5">
              {event.scenarios.map((sc) => (
                <div
                  key={sc.id}
                  className="p-3 rounded-lg border border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-semibold">{sc.name}</p>
                    <p className="text-[#6B7280] font-mono tabular-nums">
                      {sc.proposedGuestCount} Guests ·{' '}
                      {formatCurrency(sc.proposedTotalBudget, event.currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveScenario(sc)}
                    className="px-3 py-1.5 rounded-md bg-[#ECFDF5] text-[#064E3B] font-semibold cursor-pointer"
                  >
                    Compare
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
