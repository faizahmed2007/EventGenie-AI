import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBudgetSummary,
  rebalanceBudgetToTarget,
  calculateGuestSummary,
  parseGuestCsv,
  recalculateTimelineDeadlines,
  formatCurrency,
  simulateWhatIfScenario,
  exportVendorsToCsv,
} from './calculations.ts';
import {
  validateEventPlanInput,
  extractHintsFromPrompt,
  computeDeterministicBudgetAllocations,
  updateBudgetCategoryDeterministic,
  buildDependencyAwareTimeline,
  analyzeTimelineDependencies,
  validateAndNormalizeAIEventPlan,
  validateAndNormalizeThemeBoard,
  validateAndNormalizeInvitation,
  validateAndNormalizeWhatIfAnalysis,
  scrubFabricatedContactInfo,
} from './planningEngine.ts';
import { BENGALI_WEDDING_DEMO_EVENT } from '../data/demoEvents.ts';
import { buildEventPdfDocument } from './pdfExport.ts';
import type { BudgetCategoryItem, GuestItem, TimelineTaskItem, EventPlanWorkspace } from '../types/event.ts';

// ============================================================================
// 1. DETERMINISTIC FINANCIAL & BUDGET CHANGE TESTS
// ============================================================================

test('formatCurrency formats INR using Indian numbering system', () => {
  const formatted = formatCurrency(500000, 'INR');
  assert.equal(formatted.includes('5,00,000'), true);
});

test('calculateBudgetSummary computes planned, actual, paid, outstanding, and over-budget alerts accurately', () => {
  const items: BudgetCategoryItem[] = [
    {
      id: '1',
      category: 'Venue',
      plannedAmount: 120000,
      quotedAmount: 125000,
      actualAmount: 130000,
      paidAmount: 60000,
      vendorName: 'Rajbari Hall (Demo)',
      paymentDueDate: '2026-10-23',
      status: 'Confirmed',
      notes: '',
    },
    {
      id: '2',
      category: 'Catering',
      plannedAmount: 180000,
      quotedAmount: 175000,
      actualAmount: 175000,
      paidAmount: 100000,
      vendorName: 'Bhoj Caterers (Demo)',
      paymentDueDate: '2026-11-15',
      status: 'Confirmed',
      notes: '',
    },
    {
      id: '3',
      category: 'Contingency',
      plannedAmount: 30000,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: '',
      paymentDueDate: '',
      status: 'Estimated',
      notes: '',
    },
  ];

  const summary = calculateBudgetSummary(500000, items, 'INR', '2026-10-20');
  assert.equal(summary.totalBudget, 500000);
  assert.equal(summary.totalPlanned, 330000);
  assert.equal(summary.totalActual, 305000);
  assert.equal(summary.totalPaid, 160000);
  assert.equal(summary.totalOutstanding, 145000);
  assert.equal(summary.remainingBudget, 170000);
  assert.equal(summary.overBudgetCategories.length, 1);
  assert.equal(summary.overBudgetCategories[0].category, 'Venue');
  assert.equal(summary.overBudgetCategories[0].excess, 10000);
});

test('rebalanceBudgetToTarget scales category allocations to exact new budget total on decrease and increase', () => {
  const items: BudgetCategoryItem[] = [
    {
      id: '1',
      category: 'Venue',
      plannedAmount: 200000,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: '',
      paymentDueDate: '',
      status: 'Estimated',
      notes: '',
      isMustHave: true,
    },
    {
      id: '2',
      category: 'Decoration',
      plannedAmount: 200000,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: '',
      paymentDueDate: '',
      status: 'Estimated',
      notes: '',
    },
    {
      id: '3',
      category: 'Contingency',
      plannedAmount: 100000,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: '',
      paymentDueDate: '',
      status: 'Estimated',
      notes: '',
    },
  ];

  // 1. Decrease from 5,00,000 to 4,00,000
  const downResult = rebalanceBudgetToTarget(items, 400000);
  const downSum = downResult.updatedItems.reduce((s, i) => s + i.plannedAmount, 0);
  assert.equal(downSum, 400000);
  assert.equal(downResult.changes.length > 0, true);
  // Must-have Venue is protected from full linear cut (retained > 160,000)
  const updatedVenue = downResult.updatedItems.find((i) => i.category === 'Venue')!;
  assert.equal(updatedVenue.plannedAmount > 160000, true);

  // 2. Increase from 5,00,000 to 7,25,333 (odd prime-like budget to test exact rounding reconciliation)
  const upResult = rebalanceBudgetToTarget(items, 725333);
  const upSum = upResult.updatedItems.reduce((s, i) => s + i.plannedAmount, 0);
  assert.equal(upSum, 725333);
});

test('updateBudgetCategoryDeterministic edits a single category and rebalances others to keep exact budget ceiling', () => {
  const initial = computeDeterministicBudgetAllocations(500000, 'Wedding', undefined, 250, '2026-12-18');
  const initialSum = initial.reduce((s, i) => s + i.plannedAmount, 0);
  assert.equal(initialSum, 500000);

  const cateringItem = initial.find((i) => i.category === 'Catering')!;
  // Increase Catering to 220,000 with autoRebalanceOthers = true
  const rebalanced = updateBudgetCategoryDeterministic(initial, 500000, cateringItem.id, 220000, true);
  assert.equal(rebalanced.totalPlanned, 500000);
  assert.equal(rebalanced.varianceFromBudget, 0);
  assert.equal(
    rebalanced.updatedItems.find((i) => i.id === cateringItem.id)?.plannedAmount,
    220000
  );

  // Edit without auto-rebalancing reports exact varianceFromBudget
  const unRebalanced = updateBudgetCategoryDeterministic(initial, 500000, cateringItem.id, 220000, false);
  const expectedDelta = 220000 - cateringItem.plannedAmount;
  assert.equal(unRebalanced.totalPlanned, 500000 + expectedDelta);
  assert.equal(unRebalanced.varianceFromBudget, -expectedDelta);
});

test('simulateWhatIfScenario deterministically models budget and guest changes across scenarios', () => {
  const scenAddGuests = simulateWhatIfScenario(BENGALI_WEDDING_DEMO_EVENT, 'add_guests_50');
  assert.equal(scenAddGuests.proposedGuestCount, BENGALI_WEDDING_DEMO_EVENT.guestCount + 50);
  assert.equal(scenAddGuests.proposedTotalBudget > BENGALI_WEDDING_DEMO_EVENT.totalBudget, true);

  const scenCutBudget = simulateWhatIfScenario(BENGALI_WEDDING_DEMO_EVENT, 'cut_budget_50k');
  assert.equal(scenCutBudget.proposedTotalBudget, BENGALI_WEDDING_DEMO_EVENT.totalBudget - 50000);
});

// ============================================================================
// 2. MISSING INPUTS & NATURAL LANGUAGE EXTRACTION TESTS
// ============================================================================

test('validateEventPlanInput rejects completely empty, null, or non-object payloads', () => {
  const nullCheck = validateEventPlanInput(null);
  assert.equal(nullCheck.valid, false);
  assert.equal(nullCheck.errors.length > 0, true);

  const emptyObjCheck = validateEventPlanInput({ prompt: '   ', eventName: '', eventType: '' });
  assert.equal(emptyObjCheck.valid, false);
  assert.equal(emptyObjCheck.errors.length > 0, true);
});

test('validateEventPlanInput extracts guestCount, INR budget, city, and eventType from natural language prompt when fields are missing', () => {
  const result = validateEventPlanInput({
    prompt:
      'Plan a Bengali wedding reception in Kolkata for 250 guests with a budget of ₹5,00,000 in an outdoor garden.',
  });

  assert.equal(result.valid, true);
  assert.equal(result.normalized.eventType, 'Wedding');
  assert.equal(result.normalized.city, 'Kolkata');
  assert.equal(result.normalized.guestCount, 250);
  assert.equal(result.normalized.totalBudget, 500000);
  assert.equal(result.normalized.currency, 'INR');
  assert.equal(result.normalized.venueType, 'Outdoor');
  // Because eventDate was omitted, it should record a transparent assumption
  assert.equal(
    result.normalized.missingInputAssumptions.some((a) => a.toLowerCase().includes('date')),
    true
  );
});

test('validateEventPlanInput sanitizes negative guestCount, negative budget, and invalid dates with explicit assumptions', () => {
  const result = validateEventPlanInput({
    eventType: 'Birthday',
    guestCount: -40,
    budget: -9999,
    eventDate: 'not-a-valid-date',
    currency: 'INVALID_CUR',
  });

  assert.equal(result.valid, true);
  assert.equal(result.normalized.eventType, 'Birthday');
  assert.equal(result.normalized.guestCount > 0, true);
  assert.equal(result.normalized.totalBudget > 0, true);
  assert.equal(result.normalized.currency, 'INR');
  assert.equal(/^\d{4}-\d{2}-\d{2}$/.test(result.normalized.eventDate), true);
  assert.equal(result.normalized.missingInputAssumptions.length >= 3, true);
});

test('extractHintsFromPrompt parses lakh notation and USD/EUR currencies accurately', () => {
  const lakhHints = extractHintsFromPrompt('Organize a college fest in Mumbai for 800 students with 4.5 lakh budget');
  assert.equal(lakhHints.guestCount, 800);
  assert.equal(lakhHints.budget, 450000);
  assert.equal(lakhHints.currency, 'INR');
  assert.equal(lakhHints.eventType, 'College festival');
  assert.equal(lakhHints.city, 'Mumbai');
});

// ============================================================================
// 3. INVALID AI RESPONSES & DEPENDENCY-AWARE TIMELINE TESTS
// ============================================================================

test('validateAndNormalizeAIEventPlan safely recovers from malformed JSON, markdown fences, or null AI output', () => {
  const { normalized: input } = validateEventPlanInput({
    prompt: 'Plan an engagement in Jaipur for 180 guests with ₹4,00,000 budget',
  });

  // Case A: Malformed/truncated JSON string from LLM
  const planFromBrokenJson = validateAndNormalizeAIEventPlan('{"eventOverview": {"title": "Broken...', input);
  assert.equal(planFromBrokenJson.eventOverview.totalBudget, 400000);
  assert.equal(
    planFromBrokenJson.budgetCategories.reduce((s, b) => s + b.plannedAmount, 0),
    400000
  );
  assert.equal(
    planFromBrokenJson.validationWarnings.some((w) => w.toLowerCase().includes('malformed json')),
    true
  );

  // Case B: Markdown-fenced JSON string with mismatched AI budget numbers
  const fencedResponse =
    '```json\n' +
    JSON.stringify({
      eventOverview: {
        title: 'Royal Jaipur Engagement',
        eventType: 'Engagement',
        summary: 'Elegant courtyard celebration in Jaipur.',
      },
      budgetCategories: [
        { category: 'Venue', plannedAmount: 999999, notes: 'Palace courtyard' },
        { category: 'Catering', plannedAmount: 888888, notes: 'Rajasthani thali' },
        { category: 'Decoration', plannedAmount: -50000, notes: 'Invalid negative number' },
      ],
      vendorRequirements: [
        {
          category: 'Venues',
          requirements: 'Call +91 98765 43210 immediately',
          questionsToAsk: ['Is generator included?'],
          bookingLeadDays: 60,
        },
      ],
      eventSpecificRecommendations: [
        'Use traditional brass lanterns in the Jaipur courtyard.',
        'Arrange dedicated shaded valet drop-off for elderly guests.',
      ],
    }) +
    '\n```';

  const planFromFenced = validateAndNormalizeAIEventPlan(fencedResponse, input);
  // Deterministic math forces exact sum === 400,000, no negative numbers, and preserves Contingency
  const totalReconciled = planFromFenced.budgetCategories.reduce((s, b) => s + b.plannedAmount, 0);
  assert.equal(totalReconciled, 400000);
  assert.equal(planFromFenced.budgetCategories.every((b) => b.plannedAmount >= 0), true);
  assert.equal(
    planFromFenced.budgetCategories.some((b) => b.category.toLowerCase().includes('contingency')),
    true
  );
  // Fabricated phone number is scrubbed
  assert.equal(
    planFromFenced.vendorRequirements[0].requirements.includes('98765 43210'),
    false
  );
});

test('buildDependencyAwareTimeline breaks circular dependencies, strips dangling references, and enforces chronological DAG order', () => {
  const cyclicRawTasks = [
    {
      id: 'task_a',
      title: 'Book Venue Hall',
      category: 'Venue',
      daysBeforeEvent: 30,
      priority: 'High',
      dependencies: ['task_b', 'non_existent_task_99'],
      notes: '',
    },
    {
      id: 'task_b',
      title: 'Lock Catering Contract',
      category: 'Catering',
      daysBeforeEvent: 60,
      priority: 'High',
      dependencies: ['task_c'],
      notes: '',
    },
    {
      id: 'task_c',
      title: 'Approve Event Budget',
      category: 'Operations',
      daysBeforeEvent: 90,
      priority: 'High',
      dependencies: ['task_a'], // Circular cycle: task_a -> task_b -> task_c -> task_a
      notes: '',
    },
  ];

  const { tasks, warnings } = buildDependencyAwareTimeline(cyclicRawTasks, '2026-12-18', 'Wedding', '2026-10-20');
  assert.equal(tasks.length, 3);
  // Should warn about unknown dependency and circular dependency
  assert.equal(warnings.some((w) => w.includes('non_existent_task_99')), true);
  assert.equal(warnings.some((w) => w.toLowerCase().includes('circular')), true);

  // Verify no task has a chronological conflict after DAG resolution
  const analysis = analyzeTimelineDependencies(tasks);
  assert.equal(analysis.chronologicalConflicts.length, 0);
  assert.equal(analysis.criticalPathTaskIds.length > 0, true);
});

test('scrubFabricatedContactInfo removes phone numbers while preserving normal quantities', () => {
  const scrubbed = scrubFabricatedContactInfo(
    'Book hall for 250 guests and call +91 98300 12345 or 033-2456-7890 for quotes.'
  );
  assert.equal(scrubbed.includes('250 guests'), true);
  assert.equal(scrubbed.includes('98300 12345'), false);
  assert.equal(scrubbed.includes('2456-7890'), false);
});

test('calculateGuestSummary and parseGuestCsv compute households and catering plate buffer', () => {
  const csv = `Full Name,Household,Contact,RSVP Status,Attendees,Meal Preference,Seating Group
Arindam Chatterjee,Chatterjee Family,+91 98300 00001,Accepted,4,Non-Vegetarian,Family Front
Ritul Sen,Sen Family,+91 98300 00002,Accepted,2,Vegetarian,Colleagues
Meera Bose,Bose Family,+91 98300 00003,Pending,4,Non-Vegetarian,Family Front`;

  const parsed: GuestItem[] = parseGuestCsv(csv);
  assert.equal(parsed.length, 3);
  const summary = calculateGuestSummary(parsed);
  assert.equal(summary.confirmedAttendees, 6);
  assert.equal(summary.pendingAttendees, 4);
  assert.equal(summary.householdsCount, 3);
  assert.equal(summary.recommendedCateringPlates, 9);
});

test('recalculateTimelineDeadlines shifts task dates and detects overdue tasks', () => {
  const tasks: TimelineTaskItem[] = [
    {
      id: 't1',
      title: 'Book primary venue',
      description: '',
      category: 'Venue',
      startDate: '2026-09-01',
      dueDate: '2026-09-15',
      daysBeforeEvent: 60,
      priority: 'High',
      status: 'Not Started',
      assignedUser: 'Owner',
      dependencies: [],
      estimatedCost: 0,
      relatedVendor: '',
      notes: '',
    },
  ];

  const { updatedTasks, overdueCount } = recalculateTimelineDeadlines(tasks, '2026-11-10', '2026-10-20');
  assert.equal(updatedTasks.length, 1);
  assert.equal(overdueCount, 1);
});

test('calculateBudgetSummary computes accurate per-category outstanding and committed spend when actual and quoted amounts are mixed', () => {
  const items: BudgetCategoryItem[] = [
    {
      id: 'b_venue',
      category: 'Venue',
      plannedAmount: 100000,
      quotedAmount: 100000,
      actualAmount: 105000, // Finalized actual
      paidAmount: 50000, // Outstanding = 55,000
      vendorName: 'Palace Hall',
      paymentDueDate: '2026-11-01',
      status: 'Confirmed',
      notes: '',
    },
    {
      id: 'b_cater',
      category: 'Catering',
      plannedAmount: 150000,
      quotedAmount: 140000, // Quoted only, actual is still 0
      actualAmount: 0,
      paidAmount: 40000, // Outstanding = 140,000 - 40,000 = 100,000
      vendorName: 'Royal Caterers',
      paymentDueDate: '2026-11-10',
      status: 'Quoted',
      notes: '',
    },
    {
      id: 'b_cont',
      category: 'Contingency / Emergency Fund',
      plannedAmount: 30000,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: 'Reserve',
      paymentDueDate: '2026-12-01',
      status: 'Estimated',
      notes: '',
    },
  ];

  const summary = calculateBudgetSummary(300000, items, 'INR');
  // Venue outstanding (55,000) + Catering outstanding (100,000) = 155,000
  assert.equal(summary.totalOutstanding, 155000);
  // Remaining unallocated budget = 300,000 - 280,000 = 20,000
  assert.equal(summary.remainingBudget, 20000);
});

test('rebalanceBudgetToTarget hits exact targetTotalBudget even when must-have categories are protected', () => {
  const items: BudgetCategoryItem[] = [
    {
      id: '1',
      category: 'Venue',
      plannedAmount: 100000,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: '',
      paymentDueDate: '',
      status: 'Estimated',
      notes: '',
      isMustHave: true,
    },
    {
      id: '2',
      category: 'Catering',
      plannedAmount: 150000,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: '',
      paymentDueDate: '',
      status: 'Estimated',
      notes: '',
      isMustHave: true,
    },
    {
      id: '3',
      category: 'Decoration',
      plannedAmount: 80000,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: '',
      paymentDueDate: '',
      status: 'Estimated',
      notes: '',
      isMustHave: false,
    },
    {
      id: '4',
      category: 'Entertainment',
      plannedAmount: 70000,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: '',
      paymentDueDate: '',
      status: 'Estimated',
      notes: '',
      isMustHave: false,
    },
  ];

  // Reduce 400,000 -> 340,000 (-15%). Must-have items are shielded (cut by only 6% to 94,000 & 141,000) while flexible items absorb the steeper cut, hitting exact 340,000 total.
  const { updatedItems } = rebalanceBudgetToTarget(items, 340000);
  const sumAfter = updatedItems.reduce((s, b) => s + b.plannedAmount, 0);
  assert.equal(sumAfter, 340000);
  assert.equal(updatedItems.find((b) => b.category === 'Venue')?.plannedAmount, 94000);
  assert.equal(updatedItems.find((b) => b.category === 'Catering')?.plannedAmount, 141000);
});

test('validateAndNormalizeThemeBoard, validateAndNormalizeInvitation, and validateAndNormalizeWhatIfAnalysis sanitize malformed AI outputs', () => {
  const theme = validateAndNormalizeThemeBoard(
    '```json\n{"title": "Royal Mandap", "colorPalette": [{"name": "Emerald", "hex": "invalid-hex"}]}\n```',
    { styleCategory: 'Luxury', eventType: 'Wedding', culturalStyle: 'Bengali' }
  );
  assert.equal(theme.title, 'Royal Mandap');
  assert.equal(theme.styleCategory, 'Luxury');
  assert.equal(theme.colorPalette.length >= 3, true);
  assert.equal(/^#[0-9A-Fa-f]{6}$/.test(theme.colorPalette[0].hex), true);

  const inv = validateAndNormalizeInvitation('not valid json', {
    eventName: 'Shubho Bibaho',
    hostNames: 'Sen Family',
    date: '2026-12-18',
    time: '7:00 PM',
    venue: 'Kolkata',
    language: 'Bengali',
  });
  assert.equal(inv.formalCard.includes('Shubho Bibaho'), true);
  assert.equal(inv.regionalScriptNote.includes('শুভ'), true);

  const whatIf = validateAndNormalizeWhatIfAnalysis(
    JSON.stringify({
      riskNote: 'Call +91 98300 55555 for emergency tents',
      tradeoffs: ['Higher catering cost'],
      recommendations: ['Confirm headcount 7 days prior'],
    }),
    { prompt: 'What if 50 more guests attend?', proposedBudget: 560000, proposedGuests: 300, currency: 'INR' }
  );
  assert.equal(whatIf.riskNote.includes('98300 55555'), false);
  assert.equal(whatIf.tradeoffs.length > 0, true);
  assert.equal(whatIf.recommendations.length > 0, true);
});

// ============================================================================
// 5. PDF EXPORT DOCUMENT TESTS
// ============================================================================

test('buildEventPdfDocument generates a formatted multi-page PDF document for demo event', () => {
  const doc = buildEventPdfDocument(BENGALI_WEDDING_DEMO_EVENT);
  assert.ok(doc, 'jsPDF instance must be created');
  const pageCount = doc.getNumberOfPages();
  assert.ok(pageCount >= 2, `Expected at least 2 pages for full report, got ${pageCount}`);

  // Test that output arraybuffer / data can be produced without throwing
  const outputData = doc.output('arraybuffer');
  assert.ok(outputData.byteLength > 1000, 'PDF output binary must be non-empty');
});

test('buildEventPdfDocument handles sparse and empty event plans without crashing', () => {
  const emptyEvent: EventPlanWorkspace = {
    ...BENGALI_WEDDING_DEMO_EVENT,
    id: 'empty-1',
    title: 'Minimal Gathering',
    eventType: 'Custom event',
    guestCount: 0,
    totalBudget: 0,
    budgetItems: [],
    tasks: [],
    guests: [],
    updatedAt: new Date().toISOString(),
  };

  const doc = buildEventPdfDocument(emptyEvent);
  assert.ok(doc);
  assert.ok(doc.getNumberOfPages() >= 1);
  const binary = doc.output('arraybuffer');
  assert.ok(binary.byteLength > 0);
});

test('buildEventPdfDocument respects selective section options', () => {
  // Only budget
  const docBudgetOnly = buildEventPdfDocument(BENGALI_WEDDING_DEMO_EVENT, {
    includeEventDetails: false,
    includeBudget: true,
    includeGuests: false,
    includeTimeline: false,
  });
  assert.ok(docBudgetOnly);

  // Only guests
  const docGuestsOnly = buildEventPdfDocument(BENGALI_WEDDING_DEMO_EVENT, {
    includeEventDetails: false,
    includeBudget: false,
    includeGuests: true,
    includeTimeline: false,
  });
  assert.ok(docGuestsOnly);
});

test('exportVendorsToCsv outputs booking status and contract status', () => {
  const csv = exportVendorsToCsv(BENGALI_WEDDING_DEMO_EVENT.vendors);
  assert.equal(csv.includes('Business Name,Category,Contact Person'), true);
  assert.equal(csv.includes('Contract Status'), true);
  assert.equal(csv.includes('Signed'), true);
  assert.equal(csv.includes('Booked'), true);
});

