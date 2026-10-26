import type {
  BudgetCategoryItem,
  CurrencyCode,
  EventType,
  TaskPriority,
  ThemeStyleCategory,
  TimelineTaskItem,
  VendorRequirementSpec,
  VenueSetting,
} from '../types/event.ts';
import { formatCurrency } from './calculations.ts';

export interface RawEventPlanInput {
  prompt?: unknown;
  eventName?: unknown;
  eventType?: unknown;
  eventDate?: unknown;
  city?: unknown;
  venueType?: unknown;
  guestCount?: unknown;
  budget?: unknown;
  currency?: unknown;
  style?: unknown;
  culturalTradition?: unknown;
  dietaryNotes?: unknown;
  priorities?: unknown;
  referenceToday?: string;
}

export interface ValidatedEventPlanInput {
  prompt: string;
  eventName: string;
  eventType: EventType;
  eventDate: string;
  city: string;
  venueType: VenueSetting;
  guestCount: number;
  totalBudget: number;
  currency: CurrencyCode;
  style: string;
  culturalTradition: string;
  dietaryNotes: string;
  priorities: string[];
  referenceToday: string;
  missingInputAssumptions: string[];
}

export interface ValidationInputResult {
  valid: boolean;
  errors: string[];
  normalized: ValidatedEventPlanInput;
}

export interface ValidatedStructuredEventPlan {
  eventOverview: {
    title: string;
    eventType: EventType;
    summary: string;
    guestCount: number;
    location: string;
    venueType: VenueSetting;
    eventDate: string;
    totalBudget: number;
    currency: CurrencyCode;
    perGuestAllocation: number;
    priorities: string[];
  };
  theme: {
    name: string;
    styleCategory: ThemeStyleCategory;
    description: string;
    colorPalette: string[];
    decorationDirection: string;
    lightingIdeas: string;
    entranceConcept: string;
    tableSetup: string;
    photoBoothConcept: string;
    guestExperience: string;
  };
  budgetCategories: BudgetCategoryItem[];
  budgetAssumptions: string[];
  costSavingAlternatives: string[];
  timelineTasks: TimelineTaskItem[];
  vendorRequirements: VendorRequirementSpec[];
  eventSpecificRecommendations: string[];
  guestPlan: {
    rsvpStrategy: string;
    cateringEstimateNotes: string;
    seatingConsiderations: string;
    accessibilityNotes: string;
    recommendedPlatesWithBuffer: number;
    estimatedTablesCount: number;
  };
  risks: { riskType: string; impact: string; mitigation: string }[];
  nextActions: {
    immediate: string[];
    nextWeek: string[];
    finalDays: string[];
  };
  validationWarnings: string[];
}

const ALLOWED_CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

const ALLOWED_EVENT_TYPES: EventType[] = [
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

const EVENT_TYPE_BUDGET_WEIGHTS: Record<
  EventType,
  { category: string; weight: number; isMustHave: boolean; defaultNote: string }[]
> = {
  Wedding: [
    { category: 'Venue', weight: 0.23, isMustHave: true, defaultNote: 'Banquet hall, lawn, AC backup & valet' },
    { category: 'Catering', weight: 0.34, isMustHave: true, defaultNote: 'Multi-course feast, live counters & 5% plate buffer' },
    { category: 'Decoration', weight: 0.14, isMustHave: true, defaultNote: 'Mandap/stage backdrop, floral entrance & table centerpieces' },
    { category: 'Photography and videography', weight: 0.08, isMustHave: true, defaultNote: 'Candid + traditional coverage & cinematic reel' },
    { category: 'Entertainment', weight: 0.05, isMustHave: false, defaultNote: 'Live instrumental welcome, DJ & PA acoustics' },
    { category: 'Attire and styling', weight: 0.05, isMustHave: false, defaultNote: 'Bridal/groom styling, draping & makeup artist' },
    { category: 'Invitations and stationery', weight: 0.02, isMustHave: false, defaultNote: 'Digital RSVP suite + keepsake printed cards for elders' },
    { category: 'Miscellaneous', weight: 0.03, isMustHave: false, defaultNote: 'Hospitality favors, local logistics & signage' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: 'Protected 6% reserve for guest surges or weather backup' },
  ],
  Engagement: [
    { category: 'Venue', weight: 0.25, isMustHave: true, defaultNote: 'Boutique banquet hall or terrace lounge rental' },
    { category: 'Catering', weight: 0.33, isMustHave: true, defaultNote: 'Cocktail appetizers, main buffet & dessert bar' },
    { category: 'Decoration', weight: 0.15, isMustHave: true, defaultNote: 'Ring ceremony stage arch, floral wall & warm lighting' },
    { category: 'Photography and videography', weight: 0.09, isMustHave: true, defaultNote: 'Couple portraits, ring ceremony & highlight film' },
    { category: 'Attire and styling', weight: 0.06, isMustHave: false, defaultNote: 'Couple outfits, hair & makeup styling' },
    { category: 'Entertainment', weight: 0.04, isMustHave: false, defaultNote: 'DJ, ring ceremony sound cues & emcee' },
    { category: 'Gifts and favors', weight: 0.02, isMustHave: false, defaultNote: 'engagement platters & guest sweet boxes' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: '6% unallocated reserve' },
  ],
  Birthday: [
    { category: 'Venue', weight: 0.22, isMustHave: true, defaultNote: 'Party hall, lounge or garden booking' },
    { category: 'Catering', weight: 0.35, isMustHave: true, defaultNote: 'Custom celebration cake, buffet & live snack stations' },
    { category: 'Decoration', weight: 0.16, isMustHave: true, defaultNote: 'Theme balloon/floral backdrop, neon signage & table setup' },
    { category: 'Entertainment', weight: 0.10, isMustHave: false, defaultNote: 'Games host, DJ/music & interactive activities' },
    { category: 'Photography and videography', weight: 0.06, isMustHave: false, defaultNote: 'Event photography & instant photo booth prints' },
    { category: 'Gifts and favors', weight: 0.05, isMustHave: false, defaultNote: 'Return favors & goodie bags for guests' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: '6% buffer for extra guests and game supplies' },
  ],
  Anniversary: [
    { category: 'Venue', weight: 0.24, isMustHave: true, defaultNote: 'Heritage dining hall or banquet lawn' },
    { category: 'Catering', weight: 0.35, isMustHave: true, defaultNote: 'Sit-down or buffet dinner, cake & welcome beverages' },
    { category: 'Decoration', weight: 0.15, isMustHave: true, defaultNote: 'Memory timeline photo gallery, floral stage & warm lighting' },
    { category: 'Photography and videography', weight: 0.08, isMustHave: true, defaultNote: 'Family portraits & tribute video screening' },
    { category: 'Entertainment', weight: 0.07, isMustHave: false, defaultNote: 'Live retro/acoustic ensemble & audio-visual projector' },
    { category: 'Gifts and favors', weight: 0.05, isMustHave: false, defaultNote: 'Custom keepsake favors for attending families' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: '6% unallocated reserve' },
  ],
  'Baby shower': [
    { category: 'Venue', weight: 0.22, isMustHave: true, defaultNote: 'Comfortable daytime banquet or community hall' },
    { category: 'Catering', weight: 0.36, isMustHave: true, defaultNote: 'Traditional lunch/brunch feast & sweet platters' },
    { category: 'Decoration', weight: 0.18, isMustHave: true, defaultNote: 'Floral swing/jhula stage, pastel backdrop & entrance arch' },
    { category: 'Photography and videography', weight: 0.08, isMustHave: false, defaultNote: 'Ceremony & family candid photography' },
    { category: 'Gifts and favors', weight: 0.08, isMustHave: false, defaultNote: 'Guest return favors & traditional blessing hampers' },
    { category: 'Contingency', weight: 0.08, isMustHave: true, defaultNote: '8% comfort & hospitality reserve' },
  ],
  Graduation: [
    { category: 'Venue', weight: 0.24, isMustHave: true, defaultNote: 'Banquet hall or rooftop terrace' },
    { category: 'Catering', weight: 0.38, isMustHave: true, defaultNote: 'Buffet dinner, mocktail bar & celebration cake' },
    { category: 'Decoration', weight: 0.14, isMustHave: false, defaultNote: 'Class year backdrop, photo booth & table centerpieces' },
    { category: 'Entertainment', weight: 0.10, isMustHave: false, defaultNote: 'DJ, speech PA system & memory slideshow' },
    { category: 'Photography and videography', weight: 0.08, isMustHave: false, defaultNote: 'Group portraits & event coverage' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: '6% safety buffer' },
  ],
  'College festival': [
    { category: 'Equipment', weight: 0.28, isMustHave: true, defaultNote: 'Main stage truss, line-array sound, LED wall & genset backup' },
    { category: 'Venue', weight: 0.16, isMustHave: true, defaultNote: 'Auditorium/grounds setup, barricading & stall tents' },
    { category: 'Entertainment', weight: 0.20, isMustHave: true, defaultNote: 'Headliner artist/band hospitality, judges & prizes' },
    { category: 'Catering', weight: 0.14, isMustHave: true, defaultNote: 'Volunteer meals, speaker hospitality & hydration stations' },
    { category: 'Decoration', weight: 0.08, isMustHave: false, defaultNote: 'Campus entrance gates, sponsor branding banners & signage' },
    { category: 'Permits or applicable fees', weight: 0.04, isMustHave: true, defaultNote: 'Sound permit, fire safety clearance & security personnel' },
    { category: 'Staff and volunteers', weight: 0.04, isMustHave: false, defaultNote: 'Volunteer IDs, t-shirts & first-aid desk' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: '6% emergency production reserve' },
  ],
  'Corporate event': [
    { category: 'Venue', weight: 0.28, isMustHave: true, defaultNote: 'Conference ballroom with high-speed Wi-Fi & breakout rooms' },
    { category: 'Catering', weight: 0.30, isMustHave: true, defaultNote: 'Networking breakfast, working lunch & high-tea service' },
    { category: 'Equipment', weight: 0.18, isMustHave: true, defaultNote: 'Dual projection screens, lapel mics, stage lighting & livestream' },
    { category: 'Decoration', weight: 0.08, isMustHave: false, defaultNote: 'Stage branding backdrop, registration desk & podium florals' },
    { category: 'Photography and videography', weight: 0.05, isMustHave: false, defaultNote: 'Keynote photography & corporate sizzle reel' },
    { category: 'Gifts and favors', weight: 0.05, isMustHave: false, defaultNote: 'Speaker mementos & attendee welcome kits' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: '6% AV & operational contingency' },
  ],
  'Community gathering': [
    { category: 'Venue', weight: 0.20, isMustHave: true, defaultNote: 'Community hall or neighborhood ground pandal' },
    { category: 'Catering', weight: 0.38, isMustHave: true, defaultNote: 'Community bhog/feast, drinking water & serving counters' },
    { category: 'Equipment', weight: 0.14, isMustHave: true, defaultNote: 'PA sound system, seating chairs, fans/coolers & lighting' },
    { category: 'Decoration', weight: 0.12, isMustHave: false, defaultNote: 'Traditional gate, stage backdrop & floral garlands' },
    { category: 'Permits or applicable fees', weight: 0.05, isMustHave: true, defaultNote: 'Civic permissions, sanitation & waste management' },
    { category: 'Staff and volunteers', weight: 0.05, isMustHave: false, defaultNote: 'Volunteer badges, first-aid & crowd management' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: '6% community reserve' },
  ],
  'Cultural or religious celebration': [
    { category: 'Venue', weight: 0.20, isMustHave: true, defaultNote: 'Courtyard, mandap or community cultural hall' },
    { category: 'Catering', weight: 0.36, isMustHave: true, defaultNote: 'Prasad/traditional feast & refreshment counters' },
    { category: 'Decoration', weight: 0.18, isMustHave: true, defaultNote: 'Traditional shola-pith/marigold sanctum, alpona & brass lamps' },
    { category: 'Entertainment', weight: 0.10, isMustHave: false, defaultNote: 'Traditional dhak/shehnai ensemble & cultural program PA' },
    { category: 'Photography and videography', weight: 0.05, isMustHave: false, defaultNote: 'Ceremonial documentation' },
    { category: 'Miscellaneous', weight: 0.05, isMustHave: false, defaultNote: 'Ceremonial samagri, priest dakshina & hospitality' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: '6% reserve' },
  ],
  Fundraiser: [
    { category: 'Venue', weight: 0.25, isMustHave: true, defaultNote: 'Accessible gala hall or auditorium' },
    { category: 'Catering', weight: 0.30, isMustHave: true, defaultNote: 'Donor reception refreshments & dinner service' },
    { category: 'Equipment', weight: 0.16, isMustHave: true, defaultNote: 'AV projection for impact films, auction mics & lighting' },
    { category: 'Decoration', weight: 0.10, isMustHave: false, defaultNote: 'Cause storytelling displays, pledge wall & stage backdrop' },
    { category: 'Invitations and stationery', weight: 0.07, isMustHave: false, defaultNote: 'Donor packets, pledge cards & impact brochures' },
    { category: 'Photography and videography', weight: 0.06, isMustHave: false, defaultNote: 'Donor recognition photos & campaign recap video' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: '6% reserve to protect net fundraising yield' },
  ],
  'Custom event': [
    { category: 'Venue', weight: 0.24, isMustHave: true, defaultNote: 'Primary venue rental & utilities' },
    { category: 'Catering', weight: 0.34, isMustHave: true, defaultNote: 'Food, beverage & service staff' },
    { category: 'Decoration', weight: 0.14, isMustHave: true, defaultNote: 'Stage, entrance & ambient styling' },
    { category: 'Photography and videography', weight: 0.08, isMustHave: false, defaultNote: 'Photo & video coverage' },
    { category: 'Entertainment', weight: 0.07, isMustHave: false, defaultNote: 'Music, sound & guest engagement' },
    { category: 'Miscellaneous', weight: 0.07, isMustHave: false, defaultNote: 'Stationery, logistics & favors' },
    { category: 'Contingency', weight: 0.06, isMustHave: true, defaultNote: '6% unallocated reserve' },
  ],
};

/**
 * Extracts natural-language hints from a freeform prompt when structured fields are omitted.
 */
export function extractHintsFromPrompt(prompt: string): {
  guestCount?: number;
  budget?: number;
  currency?: CurrencyCode;
  eventType?: EventType;
  city?: string;
  venueType?: VenueSetting;
} {
  const clean = String(prompt || '').trim();
  if (!clean) return {};
  const lower = clean.toLowerCase();

  const hints: {
    guestCount?: number;
    budget?: number;
    currency?: CurrencyCode;
    eventType?: EventType;
    city?: string;
    venueType?: VenueSetting;
  } = {};

  // 1. Extract guest count (e.g., "250 guests", "for 180 people", "300 pax", "400 attendees")
  const guestMatch = clean.match(/\b(\d{1,5})\s*(?:guests?|people|pax|attendees|invitees|students)\b/i);
  if (guestMatch) {
    const parsedGuests = Number.parseInt(guestMatch[1], 10);
    if (parsedGuests > 0 && parsedGuests <= 50000) {
      hints.guestCount = parsedGuests;
    }
  }

  // 2. Extract currency & budget (e.g., "₹5,00,000", "Rs 300000", "5 lakh", "$15,000", "EUR 8,000")
  if (clean.includes('₹') || /\b(?:inr|rs\.?|rupees?|lakhs?|lacs?)\b/i.test(clean)) {
    hints.currency = 'INR';
  } else if (clean.includes('$') || /\busd\b/i.test(clean)) {
    hints.currency = 'USD';
  } else if (clean.includes('€') || /\beur\b/i.test(clean)) {
    hints.currency = 'EUR';
  } else if (clean.includes('£') || /\bgbp\b/i.test(clean)) {
    hints.currency = 'GBP';
  } else if (/\baed\b/i.test(clean)) {
    hints.currency = 'AED';
  } else if (/\bsgd\b/i.test(clean)) {
    hints.currency = 'SGD';
  }

  const lakhMatch = clean.match(/\b(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?)\b/i);
  if (lakhMatch) {
    hints.budget = Math.round(Number.parseFloat(lakhMatch[1]) * 100000);
    hints.currency = hints.currency || 'INR';
  } else {
    const currencyNumberMatch = clean.match(
      /(?:₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP|AED|SGD|budget\s*(?:of|is|:)?)\s*([\d,]{3,12})/i
    );
    if (currencyNumberMatch) {
      const numeric = Number.parseInt(currencyNumberMatch[1].replace(/,/g, ''), 10);
      if (numeric >= 500) {
        hints.budget = numeric;
      }
    }
  }

  // 3. Extract EventType
  if (lower.includes('wedding') || lower.includes('reception') || lower.includes('shaadi') || lower.includes('biye')) {
    hints.eventType = 'Wedding';
  } else if (lower.includes('engagement') || lower.includes('roka') || lower.includes('ring ceremony')) {
    hints.eventType = 'Engagement';
  } else if (lower.includes('birthday') || lower.includes('bday')) {
    hints.eventType = 'Birthday';
  } else if (lower.includes('anniversary')) {
    hints.eventType = 'Anniversary';
  } else if (lower.includes('baby shower') || lower.includes('godh bharai') || lower.includes('shaadh')) {
    hints.eventType = 'Baby shower';
  } else if (lower.includes('graduation') || lower.includes('convocation')) {
    hints.eventType = 'Graduation';
  } else if (lower.includes('college') || lower.includes('hackathon') || lower.includes('campus') || lower.includes('fest')) {
    hints.eventType = 'College festival';
  } else if (lower.includes('corporate') || lower.includes('conference') || lower.includes('summit')) {
    hints.eventType = 'Corporate event';
  } else if (lower.includes('fundraiser') || lower.includes('charity')) {
    hints.eventType = 'Fundraiser';
  } else if (lower.includes('puja') || lower.includes('utsav') || lower.includes('eid') || lower.includes('diwali') || lower.includes('cultural')) {
    hints.eventType = 'Cultural or religious celebration';
  } else if (lower.includes('community') || lower.includes('neighborhood')) {
    hints.eventType = 'Community gathering';
  }

  // 4. Extract Venue Setting
  if (lower.includes('outdoor') || lower.includes('lawn') || lower.includes('garden') || lower.includes('open-air')) {
    hints.venueType = 'Outdoor';
  } else if (lower.includes('hybrid') || lower.includes('indoor and outdoor')) {
    hints.venueType = 'Hybrid';
  } else if (lower.includes('indoor') || lower.includes('banquet') || lower.includes('hall') || lower.includes('ballroom')) {
    hints.venueType = 'Indoor';
  }

  // 5. Extract City
  const knownCities = [
    'Kolkata',
    'Mumbai',
    'Delhi',
    'Bengaluru',
    'Bangalore',
    'Chennai',
    'Hyderabad',
    'Pune',
    'Jaipur',
    'Ahmedabad',
    'Udaipur',
    'Goa',
    'Kochi',
    'Guwahati',
    'Siliguri',
    'London',
    'Dubai',
    'Singapore',
    'New York',
    'San Francisco',
  ];
  for (const c of knownCities) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(clean)) {
      hints.city = c === 'Bangalore' ? 'Bengaluru' : c;
      break;
    }
  }

  return hints;
}

/**
 * Validates and normalizes incoming event plan request payloads.
 * Handles missing inputs, negative numbers, invalid dates, and records explicit assumptions.
 */
export function validateEventPlanInput(rawInput: unknown): ValidationInputResult {
  const errors: string[] = [];
  const missingInputAssumptions: string[] = [];

  if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    return {
      valid: false,
      errors: ['Request body must be a valid JSON object containing an event prompt, name, or type.'],
      normalized: {
        prompt: '',
        eventName: 'Celebration Plan',
        eventType: 'Wedding',
        eventDate: '2026-12-18',
        city: 'Kolkata',
        venueType: 'Indoor',
        guestCount: 150,
        totalBudget: 300000,
        currency: 'INR',
        style: 'Traditional & Warm',
        culturalTradition: 'Indian Regional',
        dietaryNotes: 'Vegetarian & Non-Vegetarian',
        priorities: ['Catering', 'Venue Comfort', 'Decoration'],
        referenceToday: '2026-10-20',
        missingInputAssumptions: ['All inputs were missing; applied standard baseline defaults.'],
      },
    };
  }

  const input = rawInput as RawEventPlanInput;
  const rawPrompt = typeof input.prompt === 'string' ? input.prompt.trim().slice(0, 1500) : '';
  const rawName = typeof input.eventName === 'string' ? input.eventName.trim().slice(0, 140) : '';
  const rawType = typeof input.eventType === 'string' ? input.eventType.trim() : '';

  if (!rawPrompt && !rawName && !rawType) {
    errors.push('Please provide at least an event description prompt, event name, or event type.');
  }

  const hints = extractHintsFromPrompt(rawPrompt);

  // Event Type
  let eventType: EventType = 'Wedding';
  if (ALLOWED_EVENT_TYPES.includes(rawType as EventType)) {
    eventType = rawType as EventType;
  } else if (hints.eventType) {
    eventType = hints.eventType;
  } else {
    eventType = 'Wedding';
    missingInputAssumptions.push('Event type was not specified; defaulted to Wedding celebration profile.');
  }

  // Currency
  const rawCurrency = typeof input.currency === 'string' ? input.currency.trim().toUpperCase() : '';
  let currency: CurrencyCode = 'INR';
  if (ALLOWED_CURRENCIES.includes(rawCurrency as CurrencyCode)) {
    currency = rawCurrency as CurrencyCode;
  } else if (hints.currency) {
    currency = hints.currency;
  } else {
    currency = 'INR';
  }

  // Guest Count
  const numGuests = Number(input.guestCount);
  let guestCount = 150;
  if (Number.isFinite(numGuests) && numGuests > 0) {
    guestCount = Math.min(50000, Math.max(5, Math.round(numGuests)));
  } else if (hints.guestCount) {
    guestCount = hints.guestCount;
    missingInputAssumptions.push(`Extracted guest count (${guestCount} guests) from your natural-language prompt.`);
  } else {
    guestCount = eventType === 'Birthday' ? 60 : eventType === 'College festival' ? 500 : 150;
    missingInputAssumptions.push(
      `Guest count was missing or invalid; assumed ${guestCount} guests based on standard ${eventType.toLowerCase()} scale.`
    );
  }

  // Total Budget
  const numBudget = Number(input.budget);
  let totalBudget = currency === 'INR' ? 300000 : 8000;
  if (Number.isFinite(numBudget) && numBudget > 0) {
    totalBudget = Math.max(1000, Math.round(numBudget));
  } else if (hints.budget) {
    totalBudget = hints.budget;
    missingInputAssumptions.push(
      `Extracted total budget (${formatCurrency(totalBudget, currency)}) from your natural-language prompt.`
    );
  } else {
    totalBudget =
      currency === 'INR'
        ? eventType === 'Birthday'
          ? 85000
          : eventType === 'College festival'
          ? 450000
          : 350000
        : 8000;
    missingInputAssumptions.push(
      `Total budget was missing or invalid; assumed ${formatCurrency(totalBudget, currency)} for ${guestCount} guests.`
    );
  }

  // City
  const rawCity = typeof input.city === 'string' ? input.city.trim().slice(0, 80) : '';
  let city = 'Kolkata';
  if (rawCity) {
    city = rawCity;
  } else if (hints.city) {
    city = hints.city;
  } else {
    city = 'Kolkata';
    missingInputAssumptions.push('City/location was not specified; assumed metropolitan regional pricing (Kolkata).');
  }

  // Venue Setting
  const rawVenueType = typeof input.venueType === 'string' ? input.venueType.trim() : '';
  let venueType: VenueSetting = 'Indoor';
  if (rawVenueType === 'Indoor' || rawVenueType === 'Outdoor' || rawVenueType === 'Hybrid') {
    venueType = rawVenueType;
  } else if (hints.venueType) {
    venueType = hints.venueType;
  } else {
    venueType = 'Indoor';
  }

  // Event Date
  const refToday =
    typeof input.referenceToday === 'string' && !Number.isNaN(new Date(input.referenceToday).getTime())
      ? input.referenceToday
      : '2026-10-20';
  const rawDate = typeof input.eventDate === 'string' ? input.eventDate.trim() : '';
  let eventDate = '2026-12-18';
  if (rawDate && !Number.isNaN(new Date(rawDate).getTime())) {
    eventDate = new Date(rawDate).toISOString().slice(0, 10);
  } else {
    const defaultFuture = new Date(refToday);
    defaultFuture.setDate(defaultFuture.getDate() + 60);
    eventDate = defaultFuture.toISOString().slice(0, 10);
    missingInputAssumptions.push(`Target event date was not provided; scheduled 60 days out (${eventDate}) for milestone calculation.`);
  }

  const eventName = rawName || `${eventType} Celebration — ${city}`;
  const style =
    typeof input.style === 'string' && input.style.trim()
      ? input.style.trim().slice(0, 100)
      : 'Warm Heritage & Contemporary Comfort';
  const culturalTradition =
    typeof input.culturalTradition === 'string' && input.culturalTradition.trim()
      ? input.culturalTradition.trim().slice(0, 100)
      : rawPrompt.toLowerCase().includes('bengali')
      ? 'Bengali'
      : 'Indian Regional';
  const dietaryNotes =
    typeof input.dietaryNotes === 'string' && input.dietaryNotes.trim()
      ? input.dietaryNotes.trim().slice(0, 200)
      : 'Vegetarian & Non-Vegetarian';

  let priorities: string[] = ['Catering & Hospitality', 'Venue Comfort', 'Decoration & Atmosphere'];
  if (Array.isArray(input.priorities)) {
    const cleaned = input.priorities.map((p) => String(p || '').trim()).filter(Boolean);
    if (cleaned.length > 0) priorities = cleaned.slice(0, 6);
  } else if (typeof input.priorities === 'string' && input.priorities.trim()) {
    priorities = input.priorities
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      prompt: rawPrompt,
      eventName,
      eventType,
      eventDate,
      city,
      venueType,
      guestCount,
      totalBudget,
      currency,
      style,
      culturalTradition,
      dietaryNotes,
      priorities,
      referenceToday: refToday,
      missingInputAssumptions,
    },
  };
}

/**
 * Pure deterministic budget allocation engine.
 * Guarantees that all financial numbers are computed in application code, never negative,
 * include a protected Contingency reserve, and sum 100% exactly to totalBudget.
 */
export function computeDeterministicBudgetAllocations(
  totalBudget: number,
  eventType: EventType,
  rawAiCategories?: unknown[],
  guestCount: number = 150,
  eventDate: string = '2026-12-18'
): BudgetCategoryItem[] {
  const safeTotalBudget = Math.max(0, Math.round(Number(totalBudget) || 0));
  const safeGuests = Math.max(1, Math.round(Number(guestCount) || 150));
  const templateWeights = EVENT_TYPE_BUDGET_WEIGHTS[eventType] || EVENT_TYPE_BUDGET_WEIGHTS['Custom event'];

  // Extract valid AI category hints (names, notes, relative weight/share hints, must-have flags)
  // while NEVER trusting raw AI math directly without deterministic normalization.
  interface CandidateCategory {
    category: string;
    rawWeight: number;
    notes: string;
    isMustHave: boolean;
    isCustom: boolean;
  }

  let candidates: CandidateCategory[] = [];

  if (Array.isArray(rawAiCategories) && rawAiCategories.length >= 3) {
    for (const rawItem of rawAiCategories) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const obj = rawItem as Record<string, unknown>;
      const catName = typeof obj.category === 'string' ? obj.category.trim().slice(0, 80) : '';
      if (!catName) continue;

      // Accept either allocationPercent/weight or positive plannedAmount as a relative weight signal
      const rawPct = Number(obj.allocationPercent ?? obj.weight ?? 0);
      const rawAmt = Number(obj.plannedAmount ?? 0);
      let weightSignal = 0;
      if (Number.isFinite(rawPct) && rawPct > 0) {
        weightSignal = rawPct;
      } else if (Number.isFinite(rawAmt) && rawAmt > 0 && safeTotalBudget > 0) {
        weightSignal = (rawAmt / safeTotalBudget) * 100;
      }

      const matchedDefault = templateWeights.find(
        (t) => t.category.toLowerCase() === catName.toLowerCase()
      );
      if (weightSignal <= 0) {
        weightSignal = matchedDefault ? matchedDefault.weight * 100 : 8;
      }

      const notes =
        typeof obj.notes === 'string' && obj.notes.trim()
          ? obj.notes.trim().slice(0, 240)
          : matchedDefault?.defaultNote || `Allocated for ${safeGuests} guests`;

      candidates.push({
        category: catName,
        rawWeight: Math.max(1, Math.min(70, weightSignal)),
        notes,
        isMustHave:
          typeof obj.isMustHave === 'boolean'
            ? obj.isMustHave
            : matchedDefault?.isMustHave ??
              /venue|catering|equipment|contingency/i.test(catName),
        isCustom: !matchedDefault,
      });
    }
  }

  // Fallback to deterministic event-type template if AI categories were missing or invalid
  if (candidates.length < 3) {
    candidates = templateWeights.map((t) => ({
      category: t.category,
      rawWeight: t.weight * 100,
      notes: t.defaultNote,
      isMustHave: t.isMustHave,
      isCustom: false,
    }));
  }

  // Ensure a Contingency category exists with at least 5% weight
  const hasContingency = candidates.some((c) => c.category.toLowerCase().includes('contingency'));
  if (!hasContingency) {
    candidates.push({
      category: 'Contingency',
      rawWeight: 6,
      notes: 'Protected 6% reserve for unexpected guest surges or last-minute vendor addenda',
      isMustHave: true,
      isCustom: false,
    });
  } else {
    candidates = candidates.map((c) =>
      c.category.toLowerCase().includes('contingency')
        ? { ...c, rawWeight: Math.max(5, c.rawWeight), isMustHave: true }
        : c
    );
  }

  // Compute due date 14 days before eventDate
  const evTime = new Date(eventDate).getTime();
  const defaultDueDate = !Number.isNaN(evTime)
    ? new Date(evTime - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : '2026-12-01';

  const totalWeight = candidates.reduce((sum, c) => sum + c.rawWeight, 0) || 100;

  const budgetItems: BudgetCategoryItem[] = candidates.map((c, idx) => {
    const normalizedShare = c.rawWeight / totalWeight;
    const plannedAmount = Math.max(0, Math.round(safeTotalBudget * normalizedShare));
    const allocationPercent = Math.round(normalizedShare * 1000) / 10;

    return {
      id: `bcat_${idx + 1}_${c.category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      category: c.category,
      plannedAmount,
      quotedAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      vendorName: '',
      paymentDueDate: defaultDueDate,
      status: 'Estimated',
      notes: c.notes,
      isMustHave: c.isMustHave,
      isCustom: c.isCustom,
      allocationPercent,
    };
  });

  // Deterministic rounding reconciliation so sum(plannedAmount) === safeTotalBudget exactly
  const currentSum = budgetItems.reduce((sum, b) => sum + b.plannedAmount, 0);
  const roundingDelta = safeTotalBudget - currentSum;
  if (roundingDelta !== 0 && budgetItems.length > 0) {
    const contingencyIdx = budgetItems.findIndex((b) =>
      b.category.toLowerCase().includes('contingency')
    );
    const targetIdx = contingencyIdx >= 0 ? contingencyIdx : budgetItems.length - 1;
    budgetItems[targetIdx] = {
      ...budgetItems[targetIdx],
      plannedAmount: Math.max(0, budgetItems[targetIdx].plannedAmount + roundingDelta),
    };
  }

  return budgetItems;
}

/**
 * Deterministic helper for editing a single category's planned amount or adding/removing categories,
 * with optional automatic rebalancing of non-locked categories to keep totalPlanned === totalBudget.
 */
export function updateBudgetCategoryDeterministic(
  items: BudgetCategoryItem[],
  totalBudget: number,
  categoryId: string,
  newPlannedAmount: number,
  autoRebalanceOthers: boolean = false
): {
  updatedItems: BudgetCategoryItem[];
  totalPlanned: number;
  varianceFromBudget: number;
} {
  const safeBudget = Math.max(0, Math.round(Number(totalBudget) || 0));
  const safeNewAmount = Math.max(0, Math.round(Number(newPlannedAmount) || 0));

  const targetExists = items.some((i) => i.id === categoryId);
  if (!targetExists) {
    const totalPlanned = items.reduce((s, i) => s + i.plannedAmount, 0);
    return {
      updatedItems: items,
      totalPlanned,
      varianceFromBudget: safeBudget - totalPlanned,
    };
  }

  let updatedItems = items.map((item) =>
    item.id === categoryId
      ? {
          ...item,
          plannedAmount: safeNewAmount,
          allocationPercent: safeBudget > 0 ? Math.round((safeNewAmount / safeBudget) * 1000) / 10 : 0,
        }
      : { ...item }
  );

  if (autoRebalanceOthers && updatedItems.length > 1) {
    const remainingTarget = Math.max(0, safeBudget - safeNewAmount);
    const otherItems = updatedItems.filter((i) => i.id !== categoryId);
    const othersCurrentSum = otherItems.reduce((s, i) => s + i.plannedAmount, 0);

    if (othersCurrentSum > 0) {
      const ratio = remainingTarget / othersCurrentSum;
      updatedItems = updatedItems.map((item) => {
        if (item.id === categoryId) return item;
        const scaled = Math.max(0, Math.round(item.plannedAmount * ratio));
        return {
          ...item,
          plannedAmount: scaled,
          allocationPercent: safeBudget > 0 ? Math.round((scaled / safeBudget) * 1000) / 10 : 0,
        };
      });
    } else {
      const equalShare = Math.floor(remainingTarget / otherItems.length);
      updatedItems = updatedItems.map((item) =>
        item.id === categoryId
          ? item
          : {
              ...item,
              plannedAmount: equalShare,
              allocationPercent: safeBudget > 0 ? Math.round((equalShare / safeBudget) * 1000) / 10 : 0,
            }
      );
    }

    // Reconcile rounding on the last non-edited item
    const sumNow = updatedItems.reduce((s, i) => s + i.plannedAmount, 0);
    const diff = safeBudget - sumNow;
    if (diff !== 0) {
      const adjustIdx = updatedItems.findIndex(
        (i) => i.id !== categoryId && i.category.toLowerCase().includes('contingency')
      );
      const fallbackIdx = updatedItems.findIndex((i) => i.id !== categoryId);
      const idx = adjustIdx >= 0 ? adjustIdx : fallbackIdx;
      if (idx >= 0) {
        updatedItems[idx] = {
          ...updatedItems[idx],
          plannedAmount: Math.max(0, updatedItems[idx].plannedAmount + diff),
        };
      }
    }
  }

  const totalPlanned = updatedItems.reduce((s, i) => s + i.plannedAmount, 0);
  return {
    updatedItems,
    totalPlanned,
    varianceFromBudget: safeBudget - totalPlanned,
  };
}

/**
 * Builds a validated, cycle-free, dependency-aware timeline anchored to eventDate.
 * Resolves dependencies by ID or task title, removes dangling or circular dependencies,
 * enforces topological ordering (prerequisites have daysBeforeEvent >= dependent tasks),
 * and marks critical-path tasks.
 */
export function buildDependencyAwareTimeline(
  rawTasks: unknown[],
  eventDate: string,
  eventType: EventType = 'Wedding',
  referenceToday: string = '2026-10-20'
): {
  tasks: TimelineTaskItem[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const defaultTemplateTasks: {
    id: string;
    title: string;
    category: string;
    daysBeforeEvent: number;
    priority: TaskPriority;
    dependencies: string[];
    estimatedEffort: string;
    notes: string;
  }[] = [
    {
      id: 'task_1',
      title: `Lock event budget ceiling & ${eventType.toLowerCase()} scope`,
      category: 'Operations',
      daysBeforeEvent: 90,
      priority: 'High',
      dependencies: [],
      estimatedEffort: '2 hours',
      notes: 'Confirm guest capacity tier and protected 6% contingency reserve.',
    },
    {
      id: 'task_2',
      title: 'Shortlist and sign primary venue contract',
      category: 'Venue',
      daysBeforeEvent: 75,
      priority: 'High',
      dependencies: ['task_1'],
      estimatedEffort: '6 hours',
      notes: 'Verify generator backup, load-in window, and accessibility.',
    },
    {
      id: 'task_3',
      title: 'Conduct menu tasting & lock per-plate catering agreement',
      category: 'Catering',
      daysBeforeEvent: 50,
      priority: 'High',
      dependencies: ['task_2'],
      estimatedEffort: '4 hours',
      notes: 'Lock vegetarian/non-vegetarian split and plate buffer cutoff date.',
    },
    {
      id: 'task_4',
      title: 'Approve stage, lighting & photo booth elevation plan',
      category: 'Decoration',
      daysBeforeEvent: 35,
      priority: 'Medium',
      dependencies: ['task_2'],
      estimatedEffort: '3 hours',
      notes: 'Align floral palette and electrical load with venue coordinator.',
    },
    {
      id: 'task_5',
      title: 'Dispatch invitations and open household RSVP tracker',
      category: 'Guests',
      daysBeforeEvent: 30,
      priority: 'High',
      dependencies: ['task_2'],
      estimatedEffort: '3 hours',
      notes: 'Send bilingual WhatsApp/Email suite and track dietary preferences.',
    },
    {
      id: 'task_6',
      title: 'Lock final guaranteed plate count with caterer',
      category: 'Catering',
      daysBeforeEvent: 10,
      priority: 'High',
      dependencies: ['task_3', 'task_5'],
      estimatedEffort: '2 hours',
      notes: 'Confirm confirmed RSVPs + 5% safety buffer.',
    },
    {
      id: 'task_7',
      title: 'Execute final venue walkthrough & day-of run-of-show briefing',
      category: 'Operations',
      daysBeforeEvent: 3,
      priority: 'High',
      dependencies: ['task_4', 'task_6'],
      estimatedEffort: '3 hours',
      notes: 'Distribute vendor arrival schedule and emergency contact sheet.',
    },
  ];

  // Parse raw tasks if provided
  interface IntermediateTask {
    id: string;
    title: string;
    description: string;
    category: string;
    daysBeforeEvent: number;
    priority: TaskPriority;
    rawDeps: string[];
    estimatedEffort: string;
    notes: string;
  }

  const parsedTasks: IntermediateTask[] = [];
  if (Array.isArray(rawTasks) && rawTasks.length >= 3) {
    rawTasks.forEach((raw, idx) => {
      if (!raw || typeof raw !== 'object') return;
      const obj = raw as Record<string, unknown>;
      const title = typeof obj.title === 'string' ? obj.title.trim().slice(0, 140) : '';
      if (!title) return;

      const id =
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
          : `task_${idx + 1}`;
      const category =
        typeof obj.category === 'string' && obj.category.trim()
          ? obj.category.trim().slice(0, 60)
          : 'Operations';
      const rawDays = Number(obj.daysBeforeEvent);
      const daysBeforeEvent =
        Number.isFinite(rawDays) && rawDays >= 0
          ? Math.min(365, Math.max(1, Math.round(rawDays)))
          : Math.max(3, 60 - idx * 10);

      const rawPriority = typeof obj.priority === 'string' ? obj.priority.trim() : 'Medium';
      const priority: TaskPriority =
        rawPriority === 'High' || rawPriority === 'Medium' || rawPriority === 'Low'
          ? rawPriority
          : 'Medium';

      const rawDeps = Array.isArray(obj.dependencies)
        ? obj.dependencies.map((d) => String(d || '').trim()).filter(Boolean)
        : [];

      const estimatedEffort =
        typeof obj.estimatedEffort === 'string' && obj.estimatedEffort.trim()
          ? obj.estimatedEffort.trim().slice(0, 40)
          : '3 hours';
      const notes =
        typeof obj.notes === 'string' && obj.notes.trim()
          ? obj.notes.trim().slice(0, 240)
          : title;

      parsedTasks.push({
        id,
        title,
        description: notes,
        category,
        daysBeforeEvent,
        priority,
        rawDeps,
        estimatedEffort,
        notes,
      });
    });
  }

  const sourceList: IntermediateTask[] =
    parsedTasks.length >= 3
      ? parsedTasks
      : defaultTemplateTasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.notes,
          category: t.category,
          daysBeforeEvent: t.daysBeforeEvent,
          priority: t.priority,
          rawDeps: t.dependencies,
          estimatedEffort: t.estimatedEffort,
          notes: t.notes,
        }));

  // Ensure unique IDs
  const idMap = new Map<string, IntermediateTask>();
  const titleToIdMap = new Map<string, string>();
  sourceList.forEach((task, idx) => {
    let uniqueId = task.id;
    if (idMap.has(uniqueId)) {
      uniqueId = `task_${idx + 1}`;
    }
    task.id = uniqueId;
    idMap.set(uniqueId, task);
    titleToIdMap.set(task.title.toLowerCase(), uniqueId);
  });

  // Resolve dependencies (by ID or by title substring match) and strip self/dangling references
  const resolvedDepsMap = new Map<string, string[]>();
  for (const task of sourceList) {
    const validDeps: string[] = [];
    for (const rawDep of task.rawDeps) {
      let targetId: string | undefined;
      if (idMap.has(rawDep)) {
        targetId = rawDep;
      } else if (titleToIdMap.has(rawDep.toLowerCase())) {
        targetId = titleToIdMap.get(rawDep.toLowerCase());
      } else {
        // Substring match on title
        for (const [candidateTitle, candidateId] of titleToIdMap.entries()) {
          if (
            candidateTitle.includes(rawDep.toLowerCase()) ||
            rawDep.toLowerCase().includes(candidateTitle)
          ) {
            targetId = candidateId;
            break;
          }
        }
      }

      if (targetId && targetId !== task.id && !validDeps.includes(targetId)) {
        validDeps.push(targetId);
      } else if (!targetId) {
        warnings.push(`Removed unknown dependency "${rawDep}" on task "${task.title}".`);
      }
    }
    resolvedDepsMap.set(task.id, validDeps);
  }

  // If no task has any dependencies (e.g., AI omitted dependencies), wire sensible sequential dependencies
  const totalDepsCount = Array.from(resolvedDepsMap.values()).reduce((s, d) => s + d.length, 0);
  if (totalDepsCount === 0 && sourceList.length >= 2) {
    // Sort by daysBeforeEvent descending first so earliest tasks are prerequisites
    sourceList.sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);
    const rootVenueOrScope = sourceList[0];
    for (let i = 1; i < sourceList.length; i++) {
      resolvedDepsMap.set(sourceList[i].id, [
        i === sourceList.length - 1 ? sourceList[i - 1].id : rootVenueOrScope.id,
      ]);
    }
  }

  // Detect and break circular dependencies using DFS coloring (0 = unvisited, 1 = visiting, 2 = visited)
  const visitState = new Map<string, number>();
  function scrubCycles(taskId: string) {
    visitState.set(taskId, 1);
    const deps = resolvedDepsMap.get(taskId) || [];
    const cycleFreeDeps: string[] = [];
    for (const depId of deps) {
      const state = visitState.get(depId) || 0;
      if (state === 1) {
        warnings.push(`Detected and broke circular task dependency between "${taskId}" and "${depId}".`);
        continue;
      }
      if (state === 0) {
        scrubCycles(depId);
      }
      cycleFreeDeps.push(depId);
    }
    resolvedDepsMap.set(taskId, cycleFreeDeps);
    visitState.set(taskId, 2);
  }

  for (const task of sourceList) {
    if ((visitState.get(task.id) || 0) === 0) {
      scrubCycles(task.id);
    }
  }

  // Enforce chronological consistency: a dependent task must have daysBeforeEvent < prerequisite.daysBeforeEvent
  for (let pass = 0; pass < sourceList.length; pass++) {
    for (const task of sourceList) {
      const deps = resolvedDepsMap.get(task.id) || [];
      for (const depId of deps) {
        const prereq = idMap.get(depId);
        if (prereq && task.daysBeforeEvent >= prereq.daysBeforeEvent) {
          task.daysBeforeEvent = Math.max(1, prereq.daysBeforeEvent - 5);
        }
      }
    }
  }

  // Identify critical-path tasks (tasks that other tasks depend on, or High-priority final milestones)
  const dependedOnSet = new Set<string>();
  for (const deps of resolvedDepsMap.values()) {
    deps.forEach((d) => dependedOnSet.add(d));
  }

  const eventTime = !Number.isNaN(new Date(eventDate).getTime())
    ? new Date(eventDate).getTime()
    : new Date('2026-12-18').getTime();
  const todayTime = !Number.isNaN(new Date(referenceToday).getTime())
    ? new Date(referenceToday).getTime()
    : new Date('2026-10-20').getTime();

  // Sort chronologically (largest daysBeforeEvent first)
  const sortedTasks = [...sourceList].sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);

  const finalTasks: TimelineTaskItem[] = sortedTasks.map((t) => {
    const dueTime = eventTime - t.daysBeforeEvent * 24 * 60 * 60 * 1000;
    const leadWindowDays = Math.max(2, Math.round(t.daysBeforeEvent * 0.2));
    const startTime = dueTime - leadWindowDays * 24 * 60 * 60 * 1000;
    const dueDate = new Date(dueTime).toISOString().slice(0, 10);
    const startDate = new Date(startTime).toISOString().slice(0, 10);
    const deps = resolvedDepsMap.get(t.id) || [];
    const isCriticalPath = dependedOnSet.has(t.id) || (t.priority === 'High' && t.daysBeforeEvent <= 10);

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      startDate,
      dueDate,
      daysBeforeEvent: t.daysBeforeEvent,
      priority: t.priority,
      status: dueTime < todayTime ? 'In Progress' : 'Not Started',
      assignedUser: 'Event Owner',
      dependencies: deps,
      estimatedCost: 0,
      relatedVendor: '',
      notes: t.notes,
      estimatedEffort: t.estimatedEffort,
      isCriticalPath,
    };
  });

  return { tasks: finalTasks, warnings };
}

/**
 * Analyzes an existing list of TimelineTaskItems for unmet prerequisites,
 * chronological dependency conflicts, and critical path status.
 */
export function analyzeTimelineDependencies(tasks: TimelineTaskItem[]): {
  blockedTaskIds: string[];
  unmetPrerequisitesByTask: Record<string, string[]>;
  chronologicalConflicts: { taskId: string; taskTitle: string; prereqTitle: string }[];
  criticalPathTaskIds: string[];
} {
  const byId = new Map<string, TimelineTaskItem>();
  const byTitle = new Map<string, TimelineTaskItem>();
  for (const t of tasks) {
    byId.set(t.id, t);
    byTitle.set(t.title.toLowerCase(), t);
  }

  const blockedTaskIds: string[] = [];
  const unmetPrerequisitesByTask: Record<string, string[]> = {};
  const chronologicalConflicts: { taskId: string; taskTitle: string; prereqTitle: string }[] = [];
  const dependedOnIds = new Set<string>();

  for (const task of tasks) {
    const unmet: string[] = [];
    for (const depRef of task.dependencies || []) {
      const prereq = byId.get(depRef) || byTitle.get(depRef.toLowerCase());
      if (!prereq) continue;
      dependedOnIds.add(prereq.id);

      if (prereq.status !== 'Completed') {
        unmet.push(prereq.title);
      }

      if (task.dueDate && prereq.dueDate && task.dueDate < prereq.dueDate) {
        chronologicalConflicts.push({
          taskId: task.id,
          taskTitle: task.title,
          prereqTitle: prereq.title,
        });
      }
    }

    if (unmet.length > 0 && task.status !== 'Completed') {
      blockedTaskIds.push(task.id);
      unmetPrerequisitesByTask[task.id] = unmet;
    }
  }

  return {
    blockedTaskIds,
    unmetPrerequisitesByTask,
    chronologicalConflicts,
    criticalPathTaskIds: Array.from(dependedOnIds),
  };
}

/**
 * Scrubs any accidentally hallucinated phone numbers from AI text.
 */
export function scrubFabricatedContactInfo(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]\d{4,6}/g, '[Verified via Vendor Directory]')
    .trim();
}

/**
 * Validates, sanitizes, and normalizes any raw AI response (or fallback) into a
 * guaranteed ValidatedStructuredEventPlan with deterministic math and dependency-safe timelines.
 */
export function validateAndNormalizeAIEventPlan(
  rawAiResponse: unknown,
  input: ValidatedEventPlanInput
): ValidatedStructuredEventPlan {
  const validationWarnings: string[] = [...input.missingInputAssumptions];

  let parsedObj: Record<string, unknown> = {};
  if (typeof rawAiResponse === 'string') {
    const cleanedJson = rawAiResponse
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      const candidate = JSON.parse(cleanedJson);
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        parsedObj = candidate as Record<string, unknown>;
      } else {
        validationWarnings.push('AI response was not a JSON object; applied structured deterministic fallback.');
      }
    } catch {
      validationWarnings.push('AI response contained malformed JSON; applied structured deterministic fallback.');
    }
  } else if (rawAiResponse && typeof rawAiResponse === 'object' && !Array.isArray(rawAiResponse)) {
    parsedObj = rawAiResponse as Record<string, unknown>;
  } else if (rawAiResponse !== undefined && rawAiResponse !== null) {
    validationWarnings.push('AI response had invalid root type; applied structured deterministic fallback.');
  }

  // 1. Deterministic Budget Categories (100% of math happens in application code)
  const rawCategories = Array.isArray(parsedObj.budgetCategories) ? parsedObj.budgetCategories : undefined;
  const budgetCategories = computeDeterministicBudgetAllocations(
    input.totalBudget,
    input.eventType,
    rawCategories,
    input.guestCount,
    input.eventDate
  );

  // Check if AI tried to output unaligned budget numbers and log a validation warning
  if (Array.isArray(rawCategories) && rawCategories.length > 0) {
    const rawAiSum = rawCategories.reduce((sum, item) => {
      if (item && typeof item === 'object') {
        const val = Number((item as Record<string, unknown>).plannedAmount);
        return sum + (Number.isFinite(val) ? val : 0);
      }
      return sum;
    }, 0);
    if (rawAiSum > 0 && Math.abs(rawAiSum - input.totalBudget) > 1) {
      validationWarnings.push(
        `Reconciled AI category estimates (${formatCurrency(rawAiSum, input.currency)}) deterministically to match exact total budget (${formatCurrency(input.totalBudget, input.currency)}).`
      );
    }
  }

  // 2. Deterministic Quantitative Calculations for Realistic Assumptions
  const cateringCat = budgetCategories.find((b) => b.category.toLowerCase().includes('catering'));
  const venueCat = budgetCategories.find((b) => b.category.toLowerCase().includes('venue'));
  const contingencyCat = budgetCategories.find((b) => b.category.toLowerCase().includes('contingency'));
  const recommendedPlatesWithBuffer = Math.ceil(input.guestCount * 1.05);
  const estimatedTablesCount = Math.ceil(input.guestCount / 8);
  const perGuestAllocation = Math.round(input.totalBudget / Math.max(1, input.guestCount));
  const perPlateEstimate = cateringCat
    ? Math.round(cateringCat.plannedAmount / Math.max(1, recommendedPlatesWithBuffer))
    : Math.round((input.totalBudget * 0.34) / Math.max(1, recommendedPlatesWithBuffer));

  const deterministicAssumptions: string[] = [
    `Total budget of ${formatCurrency(input.totalBudget, input.currency)} across ${input.guestCount} guests yields an overall allocation of ${formatCurrency(perGuestAllocation, input.currency)} per guest.`,
    `Catering allocation (${formatCurrency(cateringCat?.plannedAmount || 0, input.currency)}) covers ${recommendedPlatesWithBuffer} plates (${input.guestCount} guests + 5% buffer) at ~${formatCurrency(perPlateEstimate, input.currency)} per plate (${input.dietaryNotes}).`,
    `Seating layout assumes ~${estimatedTablesCount} banquet round tables (8 guests/table) plus dedicated elder/accessibility lounge seating in ${input.city} (${input.venueType} setting).`,
    `Contingency reserve of ${formatCurrency(contingencyCat?.plannedAmount || 0, input.currency)} (${contingencyCat?.allocationPercent || 6}%) is held strictly unallocated for last-minute guest or weather adjustments.`,
  ];

  const aiAssumptions = Array.isArray(parsedObj.budgetAssumptions)
    ? parsedObj.budgetAssumptions
        .map((a) => scrubFabricatedContactInfo(String(a || '').trim()))
        .filter((a) => a.length > 10)
        .slice(0, 4)
    : [];

  const budgetAssumptions = [
    ...deterministicAssumptions,
    ...input.missingInputAssumptions,
    ...aiAssumptions,
  ].slice(0, 8);

  // 3. Cost-Saving Alternatives
  const defaultCostSavings = [
    `Source seasonal regional florals (tuberose, marigold, local roses) in ${input.city} instead of imported stems to reduce decoration spend by 20–25%.`,
    `Dispatch bilingual digital RSVP suites via WhatsApp and Email, printing keepsake cards only for senior family elders.`,
    `Lock the catering contract and guaranteed minimum headcount at least 30 days before ${input.eventDate} to avoid peak-season surge tariffs.`,
  ];
  const rawCostSavings = Array.isArray(parsedObj.costSavingAlternatives)
    ? parsedObj.costSavingAlternatives.map((c) => String(c || '').trim()).filter(Boolean)
    : [];
  const costSavingAlternatives = rawCostSavings.length >= 2 ? rawCostSavings.slice(0, 6) : defaultCostSavings;

  // 4. Dependency-Aware Timeline
  const rawTasks = Array.isArray(parsedObj.timelineTasks) ? parsedObj.timelineTasks : [];
  const { tasks: timelineTasks, warnings: timelineWarnings } = buildDependencyAwareTimeline(
    rawTasks,
    input.eventDate,
    input.eventType,
    input.referenceToday
  );
  validationWarnings.push(...timelineWarnings);

  // 5. Validated Vendor Requirements
  const defaultVendorSpecs: VendorRequirementSpec[] = [
    {
      category: 'Venues',
      requirements: `${input.venueType} venue in ${input.city} accommodating ${input.guestCount} guests (${estimatedTablesCount} dining tables) with generator backup and step-free access. Target budget: ${formatCurrency(venueCat?.plannedAmount || 0, input.currency)}.`,
      questionsToAsk: [
        'Is silent DG generator fuel included in the base rental tariff?',
        'What is the policy on outside decorators and sound cut-off timing?',
        'Are step-free ramps and ground-floor washrooms available for elderly guests?',
      ],
      bookingLeadDays: 75,
      priorityLevel: 'Critical',
      estimatedBudgetSharePercent: venueCat?.allocationPercent || 24,
    },
    {
      category: 'Caterers',
      requirements: `Full-service catering for ${recommendedPlatesWithBuffer} plates (${input.dietaryNotes}) with separate vegetarian and non-vegetarian counters and 1 waiter per 15 guests.`,
      questionsToAsk: [
        'What is the deadline for locking the final guaranteed plate count?',
        'Are bone-china crockery, live counter stalls, and drinking water stations included?',
        'How are Jain/vegan/allergy-safe plates labeled and served?',
      ],
      bookingLeadDays: 50,
      priorityLevel: 'Critical',
      estimatedBudgetSharePercent: cateringCat?.allocationPercent || 34,
    },
    {
      category: 'Decorators',
      requirements: `Stage/mandap backdrop, entrance floral archway, dining table centerpieces, and interactive photo booth tailored for ${input.style}.`,
      questionsToAsk: [
        'Can you share unedited photos of recent setups in this exact budget tier?',
        'Does the quote include warm LED stage lighting, trusses, and carpeting?',
        input.venueType === 'Outdoor'
          ? 'What is the waterproof hanger tent and wind-safety backup plan?'
          : 'What is the load-in window required before guest arrival?',
      ],
      bookingLeadDays: 35,
      priorityLevel: 'High',
      estimatedBudgetSharePercent: 14,
    },
    {
      category: 'Photographers',
      requirements: `Candid photography, traditional family portraits, and highlight reel coverage with dual-card backup.`,
      questionsToAsk: [
        'How many candid and traditional photographers will be on-site?',
        'What is the delivery timeline for edited high-resolution photos and highlight film?',
        'Are raw files or cloud gallery links included in the package?',
      ],
      bookingLeadDays: 45,
      priorityLevel: 'High',
      estimatedBudgetSharePercent: 8,
    },
  ];

  const rawVendors = Array.isArray(parsedObj.vendorRequirements) ? parsedObj.vendorRequirements : [];
  const vendorRequirements: VendorRequirementSpec[] =
    rawVendors.length >= 2
      ? rawVendors
          .map((v, idx) => {
            if (!v || typeof v !== 'object') return null;
            const obj = v as Record<string, unknown>;
            const category =
              typeof obj.category === 'string' && obj.category.trim()
                ? obj.category.trim().slice(0, 60)
                : defaultVendorSpecs[idx % defaultVendorSpecs.length].category;
            const requirements = scrubFabricatedContactInfo(
              typeof obj.requirements === 'string' && obj.requirements.trim()
                ? obj.requirements.trim().slice(0, 300)
                : defaultVendorSpecs[idx % defaultVendorSpecs.length].requirements
            );
            const questionsToAsk = Array.isArray(obj.questionsToAsk)
              ? obj.questionsToAsk
                  .map((q) => scrubFabricatedContactInfo(String(q || '').trim()))
                  .filter(Boolean)
                  .slice(0, 5)
              : defaultVendorSpecs[idx % defaultVendorSpecs.length].questionsToAsk;
            const rawLead = Number(obj.bookingLeadDays);
            const bookingLeadDays =
              Number.isFinite(rawLead) && rawLead > 0 ? Math.min(365, Math.round(rawLead)) : 45;
            const rawPrio = typeof obj.priorityLevel === 'string' ? obj.priorityLevel : '';
            const priorityLevel: VendorRequirementSpec['priorityLevel'] =
              rawPrio === 'Critical' || rawPrio === 'High' || rawPrio === 'Standard'
                ? rawPrio
                : idx < 2
                ? 'Critical'
                : 'High';

            const matchedCat = budgetCategories.find((b) =>
              b.category.toLowerCase().includes(category.toLowerCase().slice(0, 5))
            );

            return {
              category,
              requirements,
              questionsToAsk:
                questionsToAsk.length > 0
                  ? questionsToAsk
                  : defaultVendorSpecs[idx % defaultVendorSpecs.length].questionsToAsk,
              bookingLeadDays,
              priorityLevel,
              estimatedBudgetSharePercent: matchedCat?.allocationPercent || 10,
            };
          })
          .filter((v): v is VendorRequirementSpec => v !== null)
      : defaultVendorSpecs;

  // 6. Event-Specific Recommendations
  const defaultEventRecommendations: string[] = [
    `For a ${input.guestCount}-guest ${input.eventType.toLowerCase()} in ${input.city}, stagger buffet counter opening 20 minutes after stage photo sessions begin to prevent dining queue bottlenecks.`,
    input.culturalTradition.toLowerCase().includes('bengali')
      ? 'Incorporate traditional Rajnigandha (tuberose) and shola-pith stage craftsmanship paired with dedicated Mishti & live fish-fry/paneer starter stations.'
      : `Align ${input.culturalTradition} hospitality rituals with a dedicated family welcome desk and bilingual signage at the venue entrance.`,
    input.venueType === 'Outdoor'
      ? 'Mandate a weatherproof German hanger canopy option and acoustic curfew compliance (10:00 PM outdoor sound transition) in vendor contracts.'
      : 'Reserve front-row sofa seating near climate-controlled zones for senior elders and guests with mobility needs.',
    `Hold 25% of decorator and caterer balance payments until day-of setup handover (3 hours prior to start time).`,
  ];

  const rawRecs = Array.isArray(parsedObj.eventSpecificRecommendations)
    ? parsedObj.eventSpecificRecommendations
        .map((r) => scrubFabricatedContactInfo(String(r || '').trim()))
        .filter((r) => r.length > 8)
    : [];
  const eventSpecificRecommendations =
    rawRecs.length >= 2 ? rawRecs.slice(0, 6) : defaultEventRecommendations;

  // 7. Theme & Overview Normalization
  const rawOverview =
    parsedObj.eventOverview && typeof parsedObj.eventOverview === 'object'
      ? (parsedObj.eventOverview as Record<string, unknown>)
      : {};
  const rawTheme =
    parsedObj.theme && typeof parsedObj.theme === 'object'
      ? (parsedObj.theme as Record<string, unknown>)
      : {};
  const rawGuestPlan =
    parsedObj.guestPlan && typeof parsedObj.guestPlan === 'object'
      ? (parsedObj.guestPlan as Record<string, unknown>)
      : {};
  const rawNextActions =
    parsedObj.nextActions && typeof parsedObj.nextActions === 'object'
      ? (parsedObj.nextActions as Record<string, unknown>)
      : {};

  const summaryText =
    typeof rawOverview.summary === 'string' && rawOverview.summary.trim().length > 15
      ? scrubFabricatedContactInfo(rawOverview.summary.trim())
      : `Structured ${input.eventType.toLowerCase()} plan in ${input.city} (${input.venueType} venue) for ${input.guestCount} guests with a deterministic ${formatCurrency(input.totalBudget, input.currency)} budget (${formatCurrency(perGuestAllocation, input.currency)}/guest), dependency-verified timeline milestones, and ${input.culturalTradition} hospitality details.`;

  const allowedStyles: ThemeStyleCategory[] = [
    'Traditional',
    'Modern',
    'Minimalist',
    'Luxury',
    'Rustic',
    'Floral',
    'Sustainable',
    'Custom',
  ];
  const styleCategory: ThemeStyleCategory = allowedStyles.includes(
    rawTheme.styleCategory as ThemeStyleCategory
  )
    ? (rawTheme.styleCategory as ThemeStyleCategory)
    : 'Traditional';

  const rawRisks = Array.isArray(parsedObj.risks) ? parsedObj.risks : [];
  const risks =
    rawRisks.length >= 2
      ? rawRisks
          .map((r) => {
            if (!r || typeof r !== 'object') return null;
            const ro = r as Record<string, unknown>;
            return {
              riskType: String(ro.riskType || 'Operational Risk').trim(),
              impact: String(ro.impact || 'Schedule or budget variance').trim(),
              mitigation: String(ro.mitigation || 'Maintain 6% contingency reserve and backup vendor list').trim(),
            };
          })
          .filter((r): r is { riskType: string; impact: string; mitigation: string } => r !== null)
      : [
          {
            riskType: 'Guest Count Surge (+10–15%)',
            impact: 'Catering plate shortage and dining table congestion',
            mitigation: `Pre-negotiate a 10% flexible plate buffer rate (${recommendedPlatesWithBuffer}+ plates) in the catering contract.`,
          },
          {
            riskType: input.venueType === 'Outdoor' ? 'Unseasonal Rain or Wind' : 'Transit & Arrival Bottlenecks',
            impact: 'Delayed ceremony start and entrance crowding',
            mitigation:
              input.venueType === 'Outdoor'
                ? 'Include a 48-hour waterproof canopy activation clause and indoor foyer backup.'
                : 'Arrange covered valet drop-off, umbrella escorts, and staggered welcome drink counters.',
          },
          {
            riskType: 'Vendor Setup Delay on Event Day',
            impact: 'Late stage or lighting readiness before guest arrival',
            mitigation: 'Enforce a T-3 hours handover milestone in the timeline and tie 25% balance payment to on-time completion.',
          },
        ];

  return {
    eventOverview: {
      title:
        typeof rawOverview.title === 'string' && rawOverview.title.trim()
          ? rawOverview.title.trim().slice(0, 140)
          : input.eventName,
      eventType: input.eventType,
      summary: summaryText,
      guestCount: input.guestCount,
      location: input.city,
      venueType: input.venueType,
      eventDate: input.eventDate,
      totalBudget: input.totalBudget,
      currency: input.currency,
      perGuestAllocation,
      priorities: input.priorities,
    },
    theme: {
      name:
        typeof rawTheme.name === 'string' && rawTheme.name.trim()
          ? rawTheme.name.trim().slice(0, 100)
          : input.culturalTradition.toLowerCase().includes('bengali')
          ? 'Zamindari Rajbari & Tuberose Heritage'
          : `${input.style} Celebration Palette`,
      styleCategory,
      description:
        typeof rawTheme.description === 'string' && rawTheme.description.trim()
          ? rawTheme.description.trim()
          : `Warm ivory drapery paired with deep emerald foliage, artisan brass lamps, and seasonal botanicals tailored for a ${input.venueType.toLowerCase()} venue in ${input.city}.`,
      colorPalette:
        Array.isArray(rawTheme.colorPalette) && rawTheme.colorPalette.length >= 3
          ? rawTheme.colorPalette.map((c) => String(c)).slice(0, 6)
          : ['#047857', '#D4AF65', '#FAF8F2', '#991B1B', '#1F2937'],
      decorationDirection:
        typeof rawTheme.decorationDirection === 'string' && rawTheme.decorationDirection.trim()
          ? rawTheme.decorationDirection.trim()
          : 'Fresh local florals (tuberose, marigold, white roses), handloom textile accents, and brass urli bowls.',
      lightingIdeas:
        typeof rawTheme.lightingIdeas === 'string' && rawTheme.lightingIdeas.trim()
          ? rawTheme.lightingIdeas.trim()
          : '2700K warm Edison fairy canopies with focused pin-spots on the stage and photo booth.',
      entranceConcept:
        typeof rawTheme.entranceConcept === 'string' && rawTheme.entranceConcept.trim()
          ? rawTheme.entranceConcept.trim()
          : 'Floral archway with traditional brass lamps, bilingual welcome easel, and refresher station.',
      tableSetup:
        typeof rawTheme.tableSetup === 'string' && rawTheme.tableSetup.trim()
          ? rawTheme.tableSetup.trim()
          : `Ivory linen banquet rounds (${estimatedTablesCount} tables) with low floral centerpieces and printed menu cards.`,
      photoBoothConcept:
        typeof rawTheme.photoBoothConcept === 'string' && rawTheme.photoBoothConcept.trim()
          ? rawTheme.photoBoothConcept.trim()
          : 'Architectural heritage frame backdrop with warm neon/brass crest and instant guestbook prints.',
      guestExperience:
        typeof rawTheme.guestExperience === 'string' && rawTheme.guestExperience.trim()
          ? rawTheme.guestExperience.trim()
          : 'Smooth arrival reception, dedicated senior-citizen lounge seating, and acoustic instrumental welcome.',
    },
    budgetCategories,
    budgetAssumptions,
    costSavingAlternatives,
    timelineTasks,
    vendorRequirements,
    eventSpecificRecommendations,
    guestPlan: {
      rsvpStrategy:
        typeof rawGuestPlan.rsvpStrategy === 'string' && rawGuestPlan.rsvpStrategy.trim()
          ? rawGuestPlan.rsvpStrategy.trim()
          : 'Dispatch digital save-the-dates 30 days prior, followed by household WhatsApp/phone RSVP confirmation 12 days before the event.',
      cateringEstimateNotes:
        typeof rawGuestPlan.cateringEstimateNotes === 'string' && rawGuestPlan.cateringEstimateNotes.trim()
          ? rawGuestPlan.cateringEstimateNotes.trim()
          : `Plan for ${input.guestCount} invited guests + 5% safety buffer = ${recommendedPlatesWithBuffer} total plates (${input.dietaryNotes}).`,
      seatingConsiderations:
        typeof rawGuestPlan.seatingConsiderations === 'string' && rawGuestPlan.seatingConsiderations.trim()
          ? rawGuestPlan.seatingConsiderations.trim()
          : `Configure ${estimatedTablesCount} round tables (8 pax each) with 5-foot service aisles and front lounge sofas for elders.`,
      accessibilityNotes:
        typeof rawGuestPlan.accessibilityNotes === 'string' && rawGuestPlan.accessibilityNotes.trim()
          ? rawGuestPlan.accessibilityNotes.trim()
          : 'Verify step-free ramp access at main drop-off, elevator/ground-floor washrooms, and clear acoustic zones.',
      recommendedPlatesWithBuffer,
      estimatedTablesCount,
    },
    risks,
    nextActions: {
      immediate:
        Array.isArray(rawNextActions.immediate) && rawNextActions.immediate.length > 0
          ? rawNextActions.immediate.map((s) => String(s)).slice(0, 4)
          : [
              `Lock ${formatCurrency(input.totalBudget, input.currency)} budget ceiling and 6% contingency reserve`,
              `Shortlist 3 ${input.venueType.toLowerCase()} venues in ${input.city} for ${input.eventDate}`,
            ],
      nextWeek:
        Array.isArray(rawNextActions.nextWeek) && rawNextActions.nextWeek.length > 0
          ? rawNextActions.nextWeek.map((s) => String(s)).slice(0, 4)
          : [
              `Schedule catering tasting for ${recommendedPlatesWithBuffer} plates (${input.dietaryNotes})`,
              'Compile household guest list and dietary/accessibility tags',
            ],
      finalDays:
        Array.isArray(rawNextActions.finalDays) && rawNextActions.finalDays.length > 0
          ? rawNextActions.finalDays.map((s) => String(s)).slice(0, 4)
          : [
              'Confirm final guaranteed plate count with caterer (T-10 days)',
              'Conduct final venue walkthrough and vendor run-of-show briefing (T-3 days)',
            ],
    },
    validationWarnings,
  };
}

function parseJsonSafeObject(rawInput: unknown): Record<string, unknown> {
  if (typeof rawInput === 'string') {
    const cleaned = rawInput
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  } else if (rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)) {
    return rawInput as Record<string, unknown>;
  }
  return {};
}

export function validateAndNormalizeThemeBoard(
  rawResponse: unknown,
  input: {
    eventType?: string;
    styleCategory?: string;
    colorPreferences?: string;
    venueType?: string;
    season?: string;
    budget?: number;
    culturalStyle?: string;
    mood?: string;
  }
) {
  const obj = parseJsonSafeObject(rawResponse);
  const allowedStyles: ThemeStyleCategory[] = [
    'Traditional',
    'Modern',
    'Minimalist',
    'Luxury',
    'Rustic',
    'Floral',
    'Sustainable',
    'Custom',
  ];
  const styleCategory: ThemeStyleCategory = allowedStyles.includes(
    (obj.styleCategory || input.styleCategory) as ThemeStyleCategory
  )
    ? ((obj.styleCategory || input.styleCategory) as ThemeStyleCategory)
    : 'Traditional';

  const defaultPalette = [
    { name: 'Deep Emerald', hex: '#047857' },
    { name: 'Champagne Gold', hex: '#D4AF65' },
    { name: 'Warm Ivory', hex: '#FAF8F2' },
    { name: 'Sindoor Crimson', hex: '#991B1B' },
    { name: 'Charcoal Slate', hex: '#1F2937' },
  ];

  let colorPalette = defaultPalette;
  if (Array.isArray(obj.colorPalette) && obj.colorPalette.length >= 3) {
    const validSwatches = obj.colorPalette
      .map((s) => {
        if (!s || typeof s !== 'object') return null;
        const sw = s as Record<string, unknown>;
        const name = typeof sw.name === 'string' && sw.name.trim() ? sw.name.trim().slice(0, 40) : 'Accent';
        const rawHex = typeof sw.hex === 'string' ? sw.hex.trim() : '';
        const hex = /^#[0-9A-Fa-f]{6}$/.test(rawHex) ? rawHex : '#047857';
        return { name, hex };
      })
      .filter((s): s is { name: string; hex: string } => s !== null);
    if (validSwatches.length >= 3) {
      colorPalette = validSwatches.slice(0, 6);
    }
  }

  const pickStr = (val: unknown, fallback: string) =>
    typeof val === 'string' && val.trim().length > 4
      ? scrubFabricatedContactInfo(val.trim().slice(0, 500))
      : fallback;

  return {
    title: pickStr(
      obj.title,
      `${styleCategory} ${input.culturalStyle || 'Heritage'} Botanicals`
    ),
    styleCategory,
    description: pickStr(
      obj.description,
      `An atmospheric ${input.mood || 'warm and celebratory'} design pairing architectural drapery, artisan brass accents, and lush seasonal botanicals suited for ${input.venueType || 'indoor'} venues.`
    ),
    colorPalette,
    typography: pickStr(
      obj.typography,
      'Cormorant Garamond Display headers paired with Plus Jakarta Sans menus and signage.'
    ),
    decorationIdeas: pickStr(
      obj.decorationIdeas,
      'Layered muslin and raw silk draping with suspended brass bells and woven cane accents.'
    ),
    floralArrangements: pickStr(
      obj.floralArrangements,
      'Cascading garlands of fragrant tuberose (rajnigandha), red roses, and eucalyptus foliage.'
    ),
    lightingIdeas: pickStr(
      obj.lightingIdeas,
      'Warm 2700K chandelier clusters, fairy-light curtain backdrops, and pathway lanterns.'
    ),
    tableSettings: pickStr(
      obj.tableSettings,
      'Ivory linen runners, brushed gold chargers, handwritten place cards, and low terracotta floral bowls.'
    ),
    entranceDesign: pickStr(
      obj.entranceDesign,
      'Archway framed in fresh foliage with traditional brass urli bowls floating marigold petals and candles.'
    ),
    stageConcept: pickStr(
      obj.stageConcept,
      'Asymmetric curved architectural arches with recessed warm LED grazing and plush ivory lounge seating.'
    ),
    photoBoothConcept: pickStr(
      obj.photoBoothConcept,
      'Framed vintage courtyard jharokha window with custom neon/brass monogram and instant print props.'
    ),
    invitationDirection: pickStr(
      obj.invitationDirection,
      'Deckle-edged ivory stationery with blind debossed botanical crest and gold foil typography.'
    ),
    budgetAlternatives: pickStr(
      obj.budgetAlternatives,
      'Substitute imported blooms with dense local marigold and tuberose clusters; concentrate floral density on the main stage and entrance arch.'
    ),
  };
}

export function validateAndNormalizeInvitation(
  rawResponse: unknown,
  input: {
    eventName: string;
    hostNames?: string;
    date: string;
    time?: string;
    venue: string;
    rsvpContact?: string;
    language?: string;
    formality?: string;
    theme?: string;
    dressCode?: string;
    specialInstructions?: string;
  }
) {
  const obj = parseJsonSafeObject(rawResponse);
  const regionalGreeting =
    input.language === 'Bengali'
      ? 'শুভ আমন্ত্রণ (Shubho Amontron) — সাদর আমন্ত্রণ জানাই।'
      : input.language === 'Hindi'
      ? 'शुभ निमंत्रण — सपरिवार पधारने का हार्दिक अनुरोध।'
      : 'With joyful hearts and warm regards, we invite you to celebrate with us.';

  const hostNames = input.hostNames?.trim() || 'Together with our families';
  const timeStr = input.time?.trim() || '7:00 PM onwards';
  const dressCode = input.dressCode?.trim() || 'Traditional / Festive';
  const rsvpContact = input.rsvpContact?.trim() || 'Kindly confirm attendance';
  const specialInstructions = input.specialInstructions?.trim() || '';

  const pickText = (val: unknown, fallback: string) =>
    typeof val === 'string' && val.trim().length > 10 ? val.trim().slice(0, 2000) : fallback;

  return {
    formalCard: pickText(
      obj.formalCard,
      `${regionalGreeting}\n\n${hostNames}\ncordially invite you to celebrate\n${input.eventName}\n\nDate: ${input.date}\nTime: ${timeStr}\nVenue: ${input.venue}\n\nDress Code: ${dressCode}\n${specialInstructions ? `Note: ${specialInstructions}\n` : ''}RSVP: ${rsvpContact}`
    ),
    casualVersion: pickText(
      obj.casualVersion,
      `We're celebrating ${input.eventName}! Join ${hostNames} on ${input.date} at ${timeStr} at ${input.venue}. Dress code: ${dressCode}. ${specialInstructions} Let us know if you can make it (${rsvpContact})!`
    ),
    shortMessage: pickText(
      obj.shortMessage,
      `You're invited to ${input.eventName} hosted by ${hostNames} on ${input.date} (${timeStr}) at ${input.venue}. RSVP: ${rsvpContact}.`
    ),
    whatsappMessage: pickText(
      obj.whatsappMessage,
      `✨ *Invitation: ${input.eventName}* ✨\n\n${regionalGreeting}\n\n*Hosted by:* ${hostNames}\n📅 *Date:* ${input.date}\n🕖 *Time:* ${timeStr}\n📍 *Venue:* ${input.venue}\n👗 *Dress Code:* ${dressCode}\n\n${specialInstructions ? `_${specialInstructions}_\n\n` : ''}Please reply to confirm your RSVP (${rsvpContact}).\nWe look forward to celebrating with you!`
    ),
    emailSubject: pickText(obj.emailSubject, `Invitation: ${input.eventName} on ${input.date}`),
    emailBody: pickText(
      obj.emailBody,
      `Dear Friends and Family,\n\n${regionalGreeting}\n\n${hostNames} would be delighted by your presence at ${input.eventName}.\n\nEvent Details:\n- Date: ${input.date}\n- Time: ${timeStr}\n- Venue: ${input.venue}\n- Theme / Attire: ${input.theme || 'Celebration'} (${dressCode})\n${specialInstructions ? `- Note: ${specialInstructions}\n` : ''}\nKindly RSVP via ${rsvpContact}.\n\nWarm regards,\n${hostNames}`
    ),
    socialAnnouncement: pickText(
      obj.socialAnnouncement,
      `Counting down to ${input.eventName} on ${input.date} at ${input.venue}! Grateful to celebrate this milestone surrounded by family and friends.`
    ),
    regionalScriptNote:
      typeof obj.regionalScriptNote === 'string' && obj.regionalScriptNote.trim()
        ? obj.regionalScriptNote.trim().slice(0, 200)
        : regionalGreeting,
  };
}

export function validateAndNormalizeWhatIfAnalysis(
  rawResponse: unknown,
  input: {
    prompt?: string;
    currentBudget?: number;
    proposedBudget?: number;
    currentGuests?: number;
    proposedGuests?: number;
    currency?: string;
  }
) {
  const obj = parseJsonSafeObject(rawResponse);
  const cur = (input.currency || 'INR') as CurrencyCode;
  const curBud = Number(input.currentBudget) || 0;
  const propBud = Number(input.proposedBudget) || 0;
  const curGuests = Number(input.currentGuests) || 0;
  const propGuests = Number(input.proposedGuests) || 0;

  const tradeoffs = Array.isArray(obj.tradeoffs)
    ? obj.tradeoffs.map((t) => scrubFabricatedContactInfo(String(t || '').trim())).filter(Boolean).slice(0, 5)
    : [];
  const recommendations = Array.isArray(obj.recommendations)
    ? obj.recommendations.map((r) => scrubFabricatedContactInfo(String(r || '').trim())).filter(Boolean).slice(0, 5)
    : [];

  return {
    tradeoffs:
      tradeoffs.length > 0
        ? tradeoffs
        : [
            `Budget shifts from ${formatCurrency(curBud, cur)} to ${formatCurrency(propBud, cur)} based on deterministic per-guest and category scaling.`,
            `Guest capacity shifts from ${curGuests} to ${propGuests}, directly impacting catering plate guarantees, seating tables, and service staff ratios.`,
          ],
    recommendations:
      recommendations.length > 0
        ? recommendations
        : [
            'Re-confirm minimum guaranteed plate counts with the caterer at least 10 days prior.',
            'Keep the 6% contingency buffer intact before committing to non-essential decor upgrades.',
          ],
    riskNote:
      typeof obj.riskNote === 'string' && obj.riskNote.trim()
        ? scrubFabricatedContactInfo(obj.riskNote.trim().slice(0, 400))
        : 'All cost changes are deterministic projections based on current category allocations; verify final written vendor addenda before applying.',
  };
}

