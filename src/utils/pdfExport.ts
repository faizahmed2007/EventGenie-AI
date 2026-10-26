import { jsPDF } from 'jspdf';
import autoTablePlugin from 'jspdf-autotable';
import type { EventPlanWorkspace } from '../types/event';
import { calculateBudgetSummary, calculateGuestSummary } from './calculations';

// Resilient interop for Vite browser bundle and Node test runner
const autoTable = (
  typeof autoTablePlugin === 'function'
    ? autoTablePlugin
    : (autoTablePlugin as unknown as { default: typeof autoTablePlugin }).default ||
      (autoTablePlugin as unknown as { autoTable: typeof autoTablePlugin }).autoTable
) as typeof autoTablePlugin;

export interface PdfExportOptions {
  includeEventDetails?: boolean;
  includeBudget?: boolean;
  includeGuests?: boolean;
  includeTimeline?: boolean;
}

/**
 * Clean currency formatting for PDF standard fonts (avoids encoding glitches with Unicode symbols)
 */
function formatPdfCurrency(amount: number, currency: string = 'INR'): string {
  const rounded = Math.round(Number(amount) || 0);
  const formatted = rounded.toLocaleString('en-IN');
  switch (currency) {
    case 'INR':
      return `Rs. ${formatted}`;
    case 'USD':
      return `$${formatted}`;
    case 'EUR':
      return `EUR ${formatted}`;
    case 'GBP':
      return `GBP ${formatted}`;
    case 'AED':
      return `AED ${formatted}`;
    case 'SGD':
      return `SGD ${formatted}`;
    default:
      return `${currency} ${formatted}`;
  }
}

/**
 * Generates and downloads a formatted PDF document containing Event Details, Budget Summary, and Guest List.
 */
export function buildEventPdfDocument(
  event: EventPlanWorkspace,
  options: PdfExportOptions = {
    includeEventDetails: true,
    includeBudget: true,
    includeGuests: true,
    includeTimeline: false,
  }
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 14;

  const budgetSummary = calculateBudgetSummary(event.totalBudget, event.budgetItems, event.currency);
  const guestSummary = calculateGuestSummary(event.guests);

  // --------------------------------------------------------------------------
  // HEADER BANNER (Emerald Green & Champagne Gold Accent)
  // --------------------------------------------------------------------------
  doc.setFillColor(6, 78, 59); // #064E3B (Deep Emerald)
  doc.rect(margin, currentY, contentWidth, 26, 'F');

  // Gold accent strip on bottom of banner
  doc.setFillColor(212, 175, 101); // #D4AF65 (Champagne Gold)
  doc.rect(margin, currentY + 25, contentWidth, 1.2, 'F');

  // Brand Name & Tagline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('EventGenie AI', margin + 6, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(212, 175, 101);
  doc.text('PREMIUM EVENT PLANNING & MANAGEMENT REPORT', margin + 6, currentY + 13);

  // Document Title inside banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const cleanTitle = event.title.length > 50 ? `${event.title.slice(0, 48)}...` : event.title;
  doc.text(cleanTitle, margin + 6, currentY + 21);

  // Right side meta in banner
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(240, 253, 244);
  const dateFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.text(`Generated: ${dateFormatted}`, pageWidth - margin - 6, currentY + 10, { align: 'right' });
  doc.text(`Status: ${event.status || 'Planning'}`, pageWidth - margin - 6, currentY + 16, { align: 'right' });
  doc.text(`Currency: ${event.currency || 'INR'}`, pageWidth - margin - 6, currentY + 21, { align: 'right' });

  currentY += 32;

  // --------------------------------------------------------------------------
  // SECTION 1: EVENT DETAILS & SPECIFICATIONS
  // --------------------------------------------------------------------------
  if (options.includeEventDetails !== false) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(6, 78, 59);
    doc.text('1. Event Specifications & Overview', margin, currentY);

    currentY += 4;
    doc.setDrawColor(212, 175, 101);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY, margin + 60, currentY);

    currentY += 4;

    const eventDetailsRows = [
      [
        { content: 'Event Title', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        event.title || 'Untitled Celebration',
        { content: 'Event Type', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        event.eventType || 'Wedding',
      ],
      [
        { content: 'Scheduled Date', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        event.eventDate || 'TBD',
        { content: 'Target Headcount', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        `${event.guestCount || 0} Guests`,
      ],
      [
        { content: 'Destination / City', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        event.city || 'TBD',
        { content: 'Venue Setting', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        `${event.venueName || 'TBD'} (${event.venueType || 'Indoor'})`,
      ],
      [
        { content: 'Total Budget Ceiling', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        formatPdfCurrency(event.totalBudget, event.currency),
        { content: 'Style & Tradition', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        `${event.culturalTraditionType || 'Traditional'} • ${event.stylePreference || 'Classic'}`,
      ],
      [
        { content: 'Dietary Directives', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        { content: event.dietaryRequirements || 'Standard Catering', colSpan: 3 },
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      body: eventDetailsRows,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2.2,
        textColor: [31, 41, 55],
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 53 },
        2: { cellWidth: 38 },
        3: { cellWidth: 53 },
      },
    });

    currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 36;
    currentY += 8;
  }

  // --------------------------------------------------------------------------
  // SECTION 2: BUDGET & FINANCIAL RECONCILIATION SUMMARY
  // --------------------------------------------------------------------------
  if (options.includeBudget !== false) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(6, 78, 59);
    doc.text('2. Budget Allocation & Financial Ledger', margin, currentY);

    currentY += 4;
    doc.setDrawColor(212, 175, 101);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY, margin + 60, currentY);

    currentY += 4;

    // Budget KPI Grid (4 columns x 2 rows)
    const budgetKpis = [
      [
        { content: 'Total Budget Ceiling', styles: { fontStyle: 'bold' as const, fillColor: [236, 253, 245] as [number, number, number] } },
        { content: 'Planned Allocated', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        { content: 'Total Actual Spend', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        { content: 'Total Paid to Date', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
      ],
      [
        formatPdfCurrency(budgetSummary.totalBudget, event.currency),
        formatPdfCurrency(budgetSummary.totalPlanned, event.currency),
        formatPdfCurrency(budgetSummary.totalActual, event.currency),
        formatPdfCurrency(budgetSummary.totalPaid, event.currency),
      ],
      [
        { content: 'Outstanding Balance', styles: { fontStyle: 'bold' as const, fillColor: [254, 242, 242] as [number, number, number] } },
        { content: 'Remaining Unallocated', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        { content: 'Contingency Reserve', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        { content: 'Budget Utilization', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
      ],
      [
        formatPdfCurrency(budgetSummary.totalOutstanding, event.currency),
        formatPdfCurrency(budgetSummary.remainingBudget, event.currency),
        formatPdfCurrency(budgetSummary.contingencyPlanned, event.currency),
        `${budgetSummary.utilizationPercent}%`,
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      body: budgetKpis,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
        textColor: [31, 41, 55],
        halign: 'center',
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
      },
    });

    currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 30;
    currentY += 4;

    // Detailed Itemized Budget Table
    const budgetTableHead = [
      ['Category', 'Planned', 'Quoted', 'Actual', 'Paid', 'Outstanding', 'Vendor', 'Status'],
    ];

    const budgetTableBody = event.budgetItems.map((item) => {
      const effective = item.actualAmount > 0 ? item.actualAmount : item.quotedAmount;
      const outstanding = Math.max(0, effective - item.paidAmount);
      return [
        item.category,
        formatPdfCurrency(item.plannedAmount, event.currency),
        formatPdfCurrency(item.quotedAmount, event.currency),
        formatPdfCurrency(item.actualAmount, event.currency),
        formatPdfCurrency(item.paidAmount, event.currency),
        formatPdfCurrency(outstanding, event.currency),
        item.vendorName || '-',
        item.status || 'Estimated',
      ];
    });

    // Totals row at bottom
    const budgetTableFoot = [
      [
        'Total',
        formatPdfCurrency(budgetSummary.totalPlanned, event.currency),
        formatPdfCurrency(budgetSummary.totalQuoted, event.currency),
        formatPdfCurrency(budgetSummary.totalActual, event.currency),
        formatPdfCurrency(budgetSummary.totalPaid, event.currency),
        formatPdfCurrency(budgetSummary.totalOutstanding, event.currency),
        '-',
        '-',
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: budgetTableHead,
      body: budgetTableBody,
      foot: budgetTableFoot,
      theme: 'striped',
      headStyles: {
        fillColor: [4, 120, 87], // #047857
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: [6, 78, 59],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [31, 41, 55],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { halign: 'right', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 20 },
        4: { halign: 'right', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 22 },
        6: { cellWidth: 26 },
        7: { cellWidth: 16 },
      },
      alternateRowStyles: {
        fillColor: [250, 248, 242], // Warm ivory
      },
    });

    currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 40;
    currentY += 8;
  }

  // --------------------------------------------------------------------------
  // SECTION 3: GUEST LIST & CATERING RSVP SUMMARY
  // --------------------------------------------------------------------------
  if (options.includeGuests !== false) {
    if (currentY > 210) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(6, 78, 59);
    doc.text('3. Guest RSVP & Catering Roster', margin, currentY);

    currentY += 4;
    doc.setDrawColor(212, 175, 101);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY, margin + 60, currentY);

    currentY += 4;

    // Guest Summary Cards
    const nonVeg = guestSummary.mealBreakdown['Non-Vegetarian'] || 0;
    const veg = guestSummary.mealBreakdown['Vegetarian'] || 0;
    const jain = guestSummary.mealBreakdown['Jain'] || 0;

    const guestKpiRows = [
      [
        { content: 'Confirmed Attendees', styles: { fontStyle: 'bold' as const, fillColor: [236, 253, 245] as [number, number, number] } },
        { content: 'Pending RSVPs', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        { content: 'Total Invited', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        { content: 'Catering Plates (+7% Buffer)', styles: { fontStyle: 'bold' as const, fillColor: [254, 243, 199] as [number, number, number] } },
      ],
      [
        `${guestSummary.confirmedAttendees} Guests`,
        `${guestSummary.pendingAttendees} Guests`,
        `${guestSummary.totalInvited} Guests`,
        `${guestSummary.cateringEstimateWithBuffer} Guaranteed Plates`,
      ],
      [
        { content: 'Households / Groups', styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
        { content: 'Confirmed Meals Breakdown', colSpan: 3, styles: { fontStyle: 'bold' as const, fillColor: [248, 250, 252] as [number, number, number] } },
      ],
      [
        `${guestSummary.householdsCount} Households`,
        { content: `Non-Veg: ${nonVeg}  |  Veg: ${veg}  |  Jain: ${jain}`, colSpan: 3 },
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      body: guestKpiRows,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
        textColor: [31, 41, 55],
        halign: 'center',
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
      },
    });

    currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 30;
    currentY += 4;

    // Detailed Guest List Table
    const guestTableHead = [
      ['Guest / Contact', 'Household', 'Attendees', 'RSVP Status', 'Meal Preference', 'Dietary / Special Notes', 'Seating'],
    ];

    const guestTableBody = event.guests.map((g) => [
      g.fullName || 'Guest',
      g.household || '-',
      String(g.attendeeCount || 1),
      g.rsvpStatus || 'Pending',
      g.mealPreference || 'Standard',
      g.dietaryRestrictions && g.dietaryRestrictions !== 'None' ? g.dietaryRestrictions : '-',
      g.seatingGroup || '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: guestTableHead,
      body: guestTableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [6, 78, 59], // #064E3B
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [31, 41, 55],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 28 },
        2: { halign: 'center', cellWidth: 16 },
        3: { cellWidth: 22 },
        4: { cellWidth: 26 },
        5: { cellWidth: 32 },
        6: { cellWidth: 20 },
      },
      alternateRowStyles: {
        fillColor: [250, 248, 242], // Warm ivory
      },
    });
  }

  // --------------------------------------------------------------------------
  // FOOTER & PAGE NUMBERING ON ALL PAGES
  // --------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    // Subtle bottom divider
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, 285, pageWidth - margin, 285);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128); // #6B7280

    doc.text(
      `EventGenie AI  •  ${cleanTitle}  •  Page ${pageNum} of ${totalPages}`,
      margin,
      290
    );

    doc.text(
      'Exported from EventGenie AI Workspace',
      pageWidth - margin,
      290,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Downloads a generated event PDF file directly to user device.
 */
export function exportEventToPdf(
  event: EventPlanWorkspace,
  options?: PdfExportOptions
): void {
  const doc = buildEventPdfDocument(event, options);
  const sanitizedTitle = (event.title || 'Event')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
  const fileName = `${sanitizedTitle || 'Event'}_Plan_Report.pdf`;
  doc.save(fileName);
}

