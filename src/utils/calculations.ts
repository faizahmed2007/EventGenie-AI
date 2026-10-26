import type {
  BudgetCategoryItem,
  CurrencyCode,
  EventPlanWorkspace,
  GuestItem,
  TimelineTaskItem,
  VendorItem,
  WhatIfScenarioItem,
} from '../types/event.ts';

export const DEFAULT_BUDGET_CATEGORIES: string[] = [
  'Venue',
  'Catering',
  'Decoration',
  'Photography and videography',
  'Entertainment',
  'Invitations and stationery',
  'Attire and styling',
  'Transportation',
  'Accommodation',
  'Equipment',
  'Staff and volunteers',
  'Gifts and favors',
  'Permits or applicable fees',
  'Miscellaneous',
  'Contingency',
];

export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  } catch {
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
    return `${symbol}${safeAmount.toLocaleString('en-IN')}`;
  }
}

export interface BudgetSummaryResult {
  totalBudget: number;
  totalPlanned: number;
  totalQuoted: number;
  totalActual: number;
  totalPaid: number;
  totalOutstanding: number;
  remainingBudget: number;
  remainingVsActual: number;
  contingencyPlanned: number;
  overBudgetCategories: { category: string; planned: number; actualOrQuoted: number; excess: number }[];
  alerts: { level: 'error' | 'warning' | 'info'; message: string }[];
  utilizationPercent: number;
}

export function calculateBudgetSummary(
  totalBudget: number,
  items: BudgetCategoryItem[],
  currency: CurrencyCode = 'INR',
  referenceDate: string = '2026-10-20'
): BudgetSummaryResult {
  const safeTotalBudget = Math.max(0, Number(totalBudget) || 0);
  let totalPlanned = 0;
  let totalQuoted = 0;
  let totalActual = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalCommittedSpend = 0;
  let contingencyPlanned = 0;

  const overBudgetCategories: { category: string; planned: number; actualOrQuoted: number; excess: number }[] = [];
  const alerts: { level: 'error' | 'warning' | 'info'; message: string }[] = [];

  const refTime = new Date(referenceDate).getTime();

  for (const item of items) {
    const planned = Math.max(0, Math.round(Number(item.plannedAmount) || 0));
    const quoted = Math.max(0, Math.round(Number(item.quotedAmount) || 0));
    const actual = Math.max(0, Math.round(Number(item.actualAmount) || 0));
    const paid = Math.max(0, Math.round(Number(item.paidAmount) || 0));

    totalPlanned += planned;
    totalQuoted += quoted;
    totalActual += actual;
    totalPaid += paid;

    if (item.category.toLowerCase().includes('contingency')) {
      contingencyPlanned += planned;
    }

    // Per-category effective spend: prioritize actual, then quoted, and ensure it's at least what was already paid
    const effectiveSpend = Math.max(paid, actual > 0 ? actual : quoted);
    const categoryOutstanding = Math.max(0, effectiveSpend - paid);
    totalOutstanding += categoryOutstanding;
    totalCommittedSpend += effectiveSpend > 0 ? effectiveSpend : planned;

    if (planned > 0 && effectiveSpend > planned) {
      const excess = effectiveSpend - planned;
      overBudgetCategories.push({
        category: item.category,
        planned,
        actualOrQuoted: effectiveSpend,
        excess,
      });
    }

    // Check approaching payment deadlines (within 7 days)
    if (item.paymentDueDate && categoryOutstanding > 0) {
      const dueTime = new Date(item.paymentDueDate).getTime();
      if (!Number.isNaN(dueTime)) {
        const diffDays = Math.ceil((dueTime - refTime) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          alerts.push({
            level: 'error',
            message: `${item.category} payment (${formatCurrency(categoryOutstanding, currency)}) is overdue since ${item.paymentDueDate}.`,
          });
        } else if (diffDays <= 7) {
          alerts.push({
            level: 'warning',
            message: `${item.category} payment due in ${diffDays} day(s) (${item.paymentDueDate}).`,
          });
        }
      }
    }
  }

  const remainingBudget = safeTotalBudget - totalPlanned;
  const remainingVsActual = safeTotalBudget - totalActual;
  const utilizationBase = totalActual > 0 ? totalActual : totalCommittedSpend;
  const utilizationPercent =
    safeTotalBudget > 0 ? Math.min(999, Math.round((utilizationBase / safeTotalBudget) * 100)) : 0;

  if (totalPlanned > safeTotalBudget) {
    alerts.unshift({
      level: 'error',
      message: `Planned allocations exceed total budget by ${formatCurrency(totalPlanned - safeTotalBudget, currency)}.`,
    });
  }

  if (overBudgetCategories.length > 0) {
    alerts.push({
      level: 'warning',
      message: `${overBudgetCategories.length} category allocation(s) exceeded (${overBudgetCategories.map((c) => c.category).join(', ')}).`,
    });
  }

  if (safeTotalBudget > 0 && contingencyPlanned < safeTotalBudget * 0.04) {
    alerts.push({
      level: 'warning',
      message: `Contingency reserve (${formatCurrency(contingencyPlanned, currency)}) is below the recommended 5% safety threshold.`,
    });
  }

  return {
    totalBudget: safeTotalBudget,
    totalPlanned,
    totalQuoted,
    totalActual,
    totalPaid,
    totalOutstanding,
    remainingBudget,
    remainingVsActual,
    contingencyPlanned,
    overBudgetCategories,
    alerts,
    utilizationPercent,
  };
}

export function rebalanceBudgetToTarget(
  items: BudgetCategoryItem[],
  newTotalBudget: number
): {
  updatedItems: BudgetCategoryItem[];
  changes: { category: string; oldPlanned: number; newPlanned: number; delta: number }[];
} {
  const safeTarget = Math.max(0, Math.round(Number(newTotalBudget) || 0));
  if (items.length === 0) {
    return { updatedItems: [], changes: [] };
  }

  const currentTotal = items.reduce((sum, i) => sum + Math.max(0, Math.round(Number(i.plannedAmount) || 0)), 0);

  if (currentTotal <= 0) {
    const equalShare = Math.floor(safeTarget / items.length);
    const updatedItems = items.map((item, idx) => ({
      ...item,
      plannedAmount: idx === items.length - 1 ? safeTarget - equalShare * (items.length - 1) : equalShare,
    }));
    const changes = updatedItems.map((u) => ({
      category: u.category,
      oldPlanned: 0,
      newPlanned: u.plannedAmount,
      delta: u.plannedAmount,
    }));
    return { updatedItems, changes };
  }

  const ratio = safeTarget / currentTotal;
  const mustHaveItems = items.filter((i) => Boolean(i.isMustHave));
  const flexibleItems = items.filter((i) => !i.isMustHave);

  const mustHaveOldSum = mustHaveItems.reduce((s, i) => s + Math.max(0, Math.round(Number(i.plannedAmount) || 0)), 0);
  const flexibleOldSum = flexibleItems.reduce((s, i) => s + Math.max(0, Math.round(Number(i.plannedAmount) || 0)), 0);

  let updatedItems: BudgetCategoryItem[];

  if (ratio < 1 && mustHaveOldSum > 0 && flexibleOldSum > 0) {
    // Protect must-have categories by reducing them less steeply, provided total budget can cover them
    const desiredProtectedRatio = 1 - (1 - ratio) * 0.4;
    const rawProtectedMustHaveSum = mustHaveOldSum * desiredProtectedRatio;

    // Ensure flexible categories retain at least 15% of their proportional share if possible
    const maxMustHaveBudget = Math.min(rawProtectedMustHaveSum, safeTarget * 0.88);
    const effectiveMustHaveRatio = maxMustHaveBudget / mustHaveOldSum;
    const remainingForFlexible = Math.max(0, safeTarget - maxMustHaveBudget);
    const effectiveFlexibleRatio = remainingForFlexible / flexibleOldSum;

    updatedItems = items.map((item) => {
      const oldPlanned = Math.max(0, Math.round(Number(item.plannedAmount) || 0));
      const itemRatio = item.isMustHave ? effectiveMustHaveRatio : effectiveFlexibleRatio;
      const newPlanned = Math.max(0, Math.round(oldPlanned * itemRatio));
      return {
        ...item,
        plannedAmount: newPlanned,
        allocationPercent: safeTarget > 0 ? Math.round((newPlanned / safeTarget) * 1000) / 10 : 0,
      };
    });
  } else {
    updatedItems = items.map((item) => {
      const oldPlanned = Math.max(0, Math.round(Number(item.plannedAmount) || 0));
      const newPlanned = Math.max(0, Math.round(oldPlanned * ratio));
      return {
        ...item,
        plannedAmount: newPlanned,
        allocationPercent: safeTarget > 0 ? Math.round((newPlanned / safeTarget) * 1000) / 10 : 0,
      };
    });
  }

  // Reconcile any rounding difference deterministically so sum(plannedAmount) === safeTarget
  let sumAfter = updatedItems.reduce((s, i) => s + i.plannedAmount, 0);
  let diff = safeTarget - sumAfter;

  if (diff !== 0 && updatedItems.length > 0) {
    const contingencyIdx = updatedItems.findIndex((i) =>
      i.category.toLowerCase().includes('contingency')
    );
    const preferredOrder = [
      ...(contingencyIdx >= 0 ? [contingencyIdx] : []),
      ...updatedItems.map((_, idx) => idx).filter((idx) => idx !== contingencyIdx).reverse(),
    ];

    for (const idx of preferredOrder) {
      if (diff === 0) break;
      const currentVal = updatedItems[idx].plannedAmount;
      if (diff > 0) {
        updatedItems[idx] = {
          ...updatedItems[idx],
          plannedAmount: currentVal + diff,
        };
        diff = 0;
      } else if (diff < 0 && currentVal > 0) {
        const deduct = Math.min(currentVal, Math.abs(diff));
        updatedItems[idx] = {
          ...updatedItems[idx],
          plannedAmount: currentVal - deduct,
        };
        diff += deduct;
      }
    }
  }

  // Recompute final allocation percentages and change list
  const changes: { category: string; oldPlanned: number; newPlanned: number; delta: number }[] = [];
  updatedItems = updatedItems.map((item, idx) => {
    const oldPlanned = Math.max(0, Math.round(Number(items[idx].plannedAmount) || 0));
    const newPlanned = item.plannedAmount;
    const delta = newPlanned - oldPlanned;
    if (delta !== 0) {
      changes.push({ category: item.category, oldPlanned, newPlanned, delta });
    }
    return {
      ...item,
      allocationPercent: safeTarget > 0 ? Math.round((newPlanned / safeTarget) * 1000) / 10 : 0,
    };
  });

  return { updatedItems, changes };
}

export function simulateWhatIfScenario(
  event: EventPlanWorkspace,
  scenarioType:
    | 'add_guests_50'
    | 'cut_budget_50k'
    | 'indoor_to_outdoor'
    | 'remove_live_band'
    | 'catering_surge_15'
    | 'move_date_earlier_14d'
    | 'rain_backup'
    | 'vendor_cancels'
    | 'add_wedding_day',
  customPrompt?: string
): WhatIfScenarioItem {
  const baseGuests = event.guestCount;
  const baseBudget = event.totalBudget;
  let proposedGuestCount = baseGuests;
  let proposedVenueType = event.venueType;
  let proposedEventDate = event.eventDate;

  const adjustments: {
    category: string;
    originalPlanned: number;
    proposedPlanned: number;
    delta: number;
    reason: string;
  }[] = [];

  const affectedTasks: string[] = [];
  const tradeoffs: string[] = [];
  const recommendations: string[] = [];

  const cloneBudget = event.budgetItems.map((b) => ({ ...b }));

  const applyDelta = (categoryMatch: string, delta: number, reason: string, fallbackMatch?: string) => {
    const item =
      cloneBudget.find((b) => b.category.toLowerCase().includes(categoryMatch.toLowerCase())) ||
      (fallbackMatch
        ? cloneBudget.find((b) => b.category.toLowerCase().includes(fallbackMatch.toLowerCase()))
        : undefined);
    if (item) {
      const original = item.plannedAmount;
      const proposed = Math.max(0, Math.round(original + delta));
      item.plannedAmount = proposed;
      adjustments.push({
        category: item.category,
        originalPlanned: original,
        proposedPlanned: proposed,
        delta: proposed - original,
        reason,
      });
    }
  };

  let name = 'Custom What-If Scenario';
  let prompt = customPrompt || 'What if we adjust our event parameters?';

  switch (scenarioType) {
    case 'add_guests_50': {
      name = '+50 Guests Capacity Expansion';
      prompt = 'What if 50 more guests attend?';
      proposedGuestCount = baseGuests + 50;
      const guestRatio = 50 / Math.max(1, baseGuests);
      const cateringItem = cloneBudget.find((b) => b.category.toLowerCase().includes('catering'));
      const perGuestCatering = cateringItem ? Math.round(cateringItem.plannedAmount * guestRatio) : 45000;
      applyDelta('catering', perGuestCatering, 'Additional 50 plates + 5% buffer & service staff');
      applyDelta('invitations', Math.round(50 * 120), 'Extra printed cards and welcome favors for ~25 households', 'miscellaneous');
      applyDelta('equipment', Math.round(50 * 250), '5 additional banquet round tables & 50 chairs');
      affectedTasks.push('Finalize guest counts before catering deadlines', 'Verify banquet hall seating layout for +50 capacity');
      tradeoffs.push(
        `Per-capita catering and table rentals increase total planned spend by ${formatCurrency(
          adjustments.reduce((s, a) => s + a.delta, 0),
          event.currency
        )}.`,
        'Dining area aisle spacing may tighten unless buffet stations are moved to the foyer.'
      );
      recommendations.push('Lock bulk plate discount with caterer for crossing the next 50-guest tier.');
      break;
    }
    case 'cut_budget_50k': {
      const rawCut = event.currency === 'INR' ? 50000 : 1000;
      const cutAmount = Math.min(baseBudget, rawCut);
      name = `Budget-Friendly Plan (-${formatCurrency(cutAmount, event.currency)})`;
      prompt = `What if the budget drops by ${formatCurrency(rawCut, event.currency)}?`;
      applyDelta('entertainment', -Math.round(cutAmount * 0.30), 'Replace live ensemble with curated DJ & acoustic welcome');
      applyDelta('miscellaneous', -Math.round(cutAmount * 0.20), 'Switch to 100% digital bilingual invitations', 'invitations');
      let achievedSoFar = Math.abs(adjustments.reduce((s, a) => s + a.delta, 0));
      let remainingToCut = Math.max(0, cutAmount - achievedSoFar);
      if (remainingToCut > 0) {
        applyDelta('decoration', -remainingToCut, 'Switch to seasonal local florals & focal stage arch');
      }
      achievedSoFar = Math.abs(adjustments.reduce((s, a) => s + a.delta, 0));
      remainingToCut = Math.max(0, cutAmount - achievedSoFar);
      if (remainingToCut > 0) {
        applyDelta('catering', -remainingToCut, 'Streamline starter counters to hit target savings', 'venue');
      }
      affectedTasks.push('Revise decorator quotation scope', 'Send digital WhatsApp/Email RSVP suite');
      tradeoffs.push(
        'Preserves core guest hospitality and venue comfort while trimming non-essential floral density and print stationery.',
        'Keeps contingency reserve untouched.'
      );
      recommendations.push('Focus floral budget on the main photography stage and entrance archway.');
      break;
    }
    case 'indoor_to_outdoor': {
      name = 'Outdoor Lawn & Canopy Transition';
      prompt = 'What if we change from an indoor venue to an outdoor venue?';
      proposedVenueType = 'Outdoor';
      applyDelta('equipment', Math.round(baseBudget * 0.06), 'Weatherproof German hanger tent, portable AC/coolers & silent generator');
      applyDelta('decoration', Math.round(baseBudget * 0.03), 'Pathway fairy lighting, wind-resistant floral trusses & wooden flooring');
      affectedTasks.push('Book waterproof tenting & generator backup', 'Check municipal outdoor sound permit deadline (10:00 PM cutoff)');
      tradeoffs.push(
        'Provides open-air ambiance and flexible capacity, but requires dedicated weatherproofing, mosquito control, and generator backup.',
        'Outdoor acoustic regulations require shifting loud music indoors after 10:00 PM.'
      );
      recommendations.push('Hold a covered indoor lounge adjacent to the lawn for senior citizens.');
      break;
    }
    case 'remove_live_band': {
      name = 'Streamlined Entertainment (No Live Band)';
      prompt = 'What if we remove the live band?';
      const entItem = cloneBudget.find((b) => b.category.toLowerCase().includes('entertainment'));
      const saving = entItem ? -Math.round(entItem.plannedAmount * 0.65) : -20000;
      applyDelta('entertainment', saving, 'Remove live band; retain house PA system & curated playlist');
      affectedTasks.push('Cancel live band stage rider & soundcheck slot', 'Prepare curated reception playlist');
      tradeoffs.push(
        `Frees up ${formatCurrency(Math.abs(saving), event.currency)} that can bolster catering or photography.`,
        'Reduces stage setup complexity and eliminates 90-minute soundcheck requirement.'
      );
      recommendations.push('Reallocate half of the savings to an interactive guest photo booth.');
      break;
    }
    case 'catering_surge_15': {
      name = 'Catering Cost +15% Inflation Stress Test';
      prompt = 'What if catering costs increase by 15%?';
      const catItem = cloneBudget.find((b) => b.category.toLowerCase().includes('catering'));
      const surge = catItem ? Math.round(catItem.plannedAmount * 0.15) : Math.round(baseBudget * 0.05);
      applyDelta('catering', surge, '+15% raw ingredient & seasonal menu surge');
      applyDelta('contingency', -Math.min(surge, Math.round(baseBudget * 0.04)), 'Draw partial offset from contingency buffer');
      affectedTasks.push('Renegotiate menu items or lock price-protection clause with caterer');
      tradeoffs.push(
        `Catering rises by ${formatCurrency(surge, event.currency)}, consuming part of the contingency reserve.`,
        'Can be mitigated by replacing 2 redundant starter items with a signature live station.'
      );
      recommendations.push('Sign the catering rate lock at least 45 days before the event.');
      break;
    }
    case 'move_date_earlier_14d': {
      name = 'Accelerated Schedule (2 Weeks Earlier)';
      prompt = 'What if the event date moves two weeks earlier?';
      const oldDate = new Date(event.eventDate || '2026-12-15');
      if (!Number.isNaN(oldDate.getTime())) {
        oldDate.setDate(oldDate.getDate() - 14);
        proposedEventDate = oldDate.toISOString().slice(0, 10);
      }
      applyDelta('contingency', Math.round(baseBudget * 0.02), 'Expedited printing and vendor date-transfer buffer');
      affectedTasks.push(
        'All timeline deadlines shift 14 days earlier immediately',
        'Verify venue & photographer availability on new date',
        'Send urgent date-change notice to invited guests'
      );
      tradeoffs.push(
        'Compresses vendor preparation window by 14 days and may trigger rush charges for custom attire or invitations.',
        'Requires immediate written confirmation that advance deposits transfer to the new date without penalty.'
      );
      recommendations.push('Confirm venue and primary photographer availability before announcing the new date.');
      break;
    }
    case 'rain_backup': {
      name = 'Rain Backup Plan';
      prompt = 'What if it rains on the event day?';
      proposedVenueType = 'Indoor';
      applyDelta('equipment', Math.round(baseBudget * 0.04), 'Covered valet drop-off canopy, walkway matting & extragenset backup');
      applyDelta('staff', Math.round(baseBudget * 0.01), 'Umbrella escort attendants & foyer coat/bag check');
      affectedTasks.push('Activate 48-hour weather watch protocol', 'Relocate welcome drink counters and photo booth indoors');
      tradeoffs.push(
        'Adds protective canopy and escort logistics while guaranteeing zero disruption to dining and stage ceremonies.'
      );
      recommendations.push('Include a 48-hour rain-canopy activation option in the decorator contract.');
      break;
    }
    case 'vendor_cancels': {
      name = 'Emergency Standby Vendor Replacement';
      prompt = 'What if a key vendor cancels last-minute?';
      applyDelta('contingency', Math.round(baseBudget * 0.05), 'Short-notice replacement vendor premium buffer');
      affectedTasks.push('Contact shortlisted #2 backup vendor in Vendor Directory', 'Review cancellation refund clause');
      tradeoffs.push(
        'Short-notice bookings typically carry a 10–15% premium; keeping a shortlisted runner-up vendor eliminates search panic.'
      );
      recommendations.push('Always maintain at least 2 shortlisted quotes per critical category (Catering, Decor, Photo).');
      break;
    }
    case 'add_wedding_day': {
      name = 'Multi-Day Celebration (+1 Pre-Wedding Function Day)';
      prompt = 'What if we add another day (Haldi / Sangeet) to the celebration?';
      applyDelta('venue', Math.round(baseBudget * 0.12), 'Day-1 courtyard/hall rental for pre-wedding ceremonies');
      applyDelta('catering', Math.round(baseBudget * 0.14), 'Day-1 high-tea and festive lunch for core family & friends');
      applyDelta('decoration', Math.round(baseBudget * 0.06), 'Marigold Haldi setup & Sangeet stage lighting');
      affectedTasks.push('Create separate ceremony schedule in Indian Wedding Planner', 'Coordinate outstation guest accommodation');
      tradeoffs.push(
        'Expands the celebration into a relaxed multi-day experience, increasing total budget by ~32% unless bundled with the same venue.'
      );
      recommendations.push('Negotiate a combined 2-day venue & decor package for a 15% bundle discount.');
      break;
    }
  }

  const totalDelta = adjustments.reduce((sum, a) => sum + a.delta, 0);
  const proposedTotalBudget = Math.max(0, baseBudget + totalDelta);

  return {
    id: `scen_${Date.now()}_${scenarioType}`,
    name,
    prompt,
    proposedGuestCount,
    proposedTotalBudget,
    proposedVenueType,
    proposedEventDate,
    categoryAdjustments: adjustments,
    affectedTasks,
    tradeoffs,
    recommendations,
    assumptionsLabel: 'Deterministic projection based on current event allocations; confirm written vendor quotes before applying.',
  };
}

export function recalculateTimelineDeadlines(
  tasks: TimelineTaskItem[],
  newEventDate: string,
  referenceToday: string = '2026-10-20'
): {
  updatedTasks: TimelineTaskItem[];
  overdueCount: number;
  conflictTaskTitles: string[];
} {
  const eventTime = new Date(newEventDate).getTime();
  const todayTime = new Date(referenceToday).getTime();
  if (Number.isNaN(eventTime)) {
    return { updatedTasks: tasks, overdueCount: 0, conflictTaskTitles: [] };
  }

  let overdueCount = 0;
  const conflictTaskTitles: string[] = [];

  const updatedTasks = tasks.map((task) => {
    const leadDays = Math.max(0, Number(task.daysBeforeEvent) || 7);
    const dueTime = eventTime - leadDays * 24 * 60 * 60 * 1000;
    const startTime = dueTime - Math.max(2, Math.round(leadDays * 0.25)) * 24 * 60 * 60 * 1000;
    const dueDate = new Date(dueTime).toISOString().slice(0, 10);
    const startDate = new Date(startTime).toISOString().slice(0, 10);

    if (task.status !== 'Completed' && task.status !== 'Cancelled' && dueTime < todayTime) {
      overdueCount += 1;
      conflictTaskTitles.push(task.title);
    }

    return {
      ...task,
      startDate,
      dueDate,
    };
  });

  return { updatedTasks, overdueCount, conflictTaskTitles };
}

export interface GuestCateringSummary {
  totalRecords: number;
  totalInvitedHeadcount: number;
  totalInvited: number;
  confirmedAttendees: number;
  pendingAttendees: number;
  declinedAttendees: number;
  waitlistedAttendees: number;
  householdsCount: number;
  recommendedCateringPlates: number;
  cateringEstimateWithBuffer: number;
  mealBreakdown: Record<string, number>;
}

export function calculateGuestSummary(guests: GuestItem[]): GuestCateringSummary {
  let totalInvitedHeadcount = 0;
  let confirmedAttendees = 0;
  let pendingAttendees = 0;
  let declinedAttendees = 0;
  let waitlistedAttendees = 0;
  const households = new Set<string>();
  const mealBreakdown: Record<string, number> = {
    Vegetarian: 0,
    'Non-Vegetarian': 0,
    Jain: 0,
    Vegan: 0,
    Kids: 0,
  };

  for (const g of guests) {
    const count = Math.max(1, Number(g.attendeeCount) || 1);
    if (g.household?.trim()) {
      households.add(g.household.trim().toLowerCase());
    }
    if (g.rsvpStatus !== 'Not Invited') {
      totalInvitedHeadcount += count;
    }
    if (g.rsvpStatus === 'Accepted') {
      confirmedAttendees += count;
      mealBreakdown[g.mealPreference] = (mealBreakdown[g.mealPreference] || 0) + count;
    } else if (g.rsvpStatus === 'Pending' || g.rsvpStatus === 'Invited') {
      pendingAttendees += count;
    } else if (g.rsvpStatus === 'Declined') {
      declinedAttendees += count;
    } else if (g.rsvpStatus === 'Waitlisted') {
      waitlistedAttendees += count;
    }
  }

  // Recommended plates = Confirmed + 50% of Pending + 5% safety buffer
  const expectedActive = confirmedAttendees + Math.round(pendingAttendees * 0.5);
  const recommendedCateringPlates = Math.ceil(expectedActive * 1.05);

  return {
    totalRecords: guests.length,
    totalInvitedHeadcount,
    totalInvited: totalInvitedHeadcount,
    confirmedAttendees,
    pendingAttendees,
    declinedAttendees,
    waitlistedAttendees,
    householdsCount: households.size,
    recommendedCateringPlates,
    cateringEstimateWithBuffer: recommendedCateringPlates,
    mealBreakdown,
  };
}

export function parseGuestCsv(csvText: string): GuestItem[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const startIdx = lines[0].toLowerCase().includes('name') ? 1 : 0;
  const results: GuestItem[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const fullName = cols[0];
    if (!fullName) continue;

    const household = cols[1] || `${fullName.split(' ').slice(-1)[0]} Family`;
    const contact = cols[2] || '';
    const rsvpRaw = (cols[3] || 'Invited') as GuestItem['rsvpStatus'];
    const allowedRsvp: GuestItem['rsvpStatus'][] = ['Not Invited', 'Invited', 'Pending', 'Accepted', 'Declined', 'Waitlisted'];
    const rsvpStatus = allowedRsvp.includes(rsvpRaw) ? rsvpRaw : 'Invited';
    const attendeeCount = Math.max(1, Number.parseInt(cols[4] || '1', 10) || 1);
    const mealRaw = (cols[5] || 'Vegetarian') as GuestItem['mealPreference'];
    const allowedMeals: GuestItem['mealPreference'][] = ['Vegetarian', 'Non-Vegetarian', 'Jain', 'Vegan', 'Kids'];
    const mealPreference = allowedMeals.includes(mealRaw) ? mealRaw : 'Vegetarian';
    const seatingGroup = cols[6] || 'General';

    results.push({
      id: `guest_csv_${Date.now()}_${i}`,
      fullName,
      household,
      contact,
      invitationStatus: rsvpStatus === 'Not Invited' ? 'Not Sent' : 'Sent',
      rsvpStatus,
      attendeeCount,
      mealPreference,
      dietaryRestrictions: cols[7] || 'None',
      accessibilityRequirements: cols[8] || 'None',
      seatingGroup,
      notes: 'Imported via CSV',
      source: 'CSV Import',
    });
  }

  return results;
}

export function exportGuestsToCsv(guests: GuestItem[]): string {
  const header = 'Full Name,Household,Contact,RSVP Status,Attendees,Meal Preference,Seating Group,Dietary Notes,Accessibility';
  const rows = guests.map((g) =>
    [
      `"${(g.fullName || '').replace(/"/g, '""')}"`,
      `"${(g.household || '').replace(/"/g, '""')}"`,
      `"${(g.contact || '').replace(/"/g, '""')}"`,
      g.rsvpStatus,
      g.attendeeCount,
      g.mealPreference,
      `"${(g.seatingGroup || '').replace(/"/g, '""')}"`,
      `"${(g.dietaryRestrictions || '').replace(/"/g, '""')}"`,
      `"${(g.accessibilityRequirements || '').replace(/"/g, '""')}"`,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function exportBudgetToCsv(items: BudgetCategoryItem[]): string {
  const header = 'Category,Planned Amount,Quoted Amount,Actual Amount,Paid Amount,Outstanding,Vendor,Due Date,Status,Notes';
  const rows = items.map((b) => {
    const effective = b.actualAmount > 0 ? b.actualAmount : b.quotedAmount;
    const outstanding = Math.max(0, effective - b.paidAmount);
    return [
      `"${b.category.replace(/"/g, '""')}"`,
      b.plannedAmount,
      b.quotedAmount,
      b.actualAmount,
      b.paidAmount,
      outstanding,
      `"${(b.vendorName || '').replace(/"/g, '""')}"`,
      b.paymentDueDate || '',
      b.status,
      `"${(b.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export function exportVendorsToCsv(vendors: VendorItem[]): string {
  const header = 'Business Name,Category,Contact Person,Phone,Email,Quoted Amount,Final Price,Advance Paid,Balance Due,Status,Contract Status';
  const rows = vendors.map((v) => {
    const balance = Math.max(0, (v.finalPrice || v.quotedAmount) - v.advancePaid);
    const contractStatus = v.contractStatus || (v.bookingStatus === 'Booked' ? 'Signed' : 'Pending');
    return [
      `"${v.businessName.replace(/"/g, '""')}"`,
      `"${v.category.replace(/"/g, '""')}"`,
      `"${v.contactPerson.replace(/"/g, '""')}"`,
      `"${v.phone.replace(/"/g, '""')}"`,
      `"${v.email.replace(/"/g, '""')}"`,
      v.quotedAmount,
      v.finalPrice,
      v.advancePaid,
      balance,
      v.bookingStatus,
      contractStatus,
    ].join(',');
  });
  return [header, ...rows].join('\n');
}
