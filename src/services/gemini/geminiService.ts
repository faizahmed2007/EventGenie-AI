import type { ThemeBoardItem } from '../../types/event';

export interface GenerateEventPlanInput {
  prompt?: string;
  eventName?: string;
  eventType?: string;
  eventDate?: string;
  city?: string;
  venueType?: string;
  guestCount?: number;
  budget?: number;
  currency?: string;
  style?: string;
  culturalTradition?: string;
  dietaryNotes?: string;
  priorities?: string[];
}

export async function generateEventPlanViaServer(input: GenerateEventPlanInput) {
  const response = await fetch('/api/gemini/event-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to generate event plan' }));
    throw new Error(err.error || 'Failed to generate event plan');
  }
  return response.json();
}

export async function generateThemeBoardViaServer(input: {
  eventType: string;
  styleCategory: string;
  colorPreferences: string;
  venueType: string;
  season: string;
  budget: number;
  culturalStyle: string;
  mood: string;
}): Promise<{ source: string; themeBoard: Omit<ThemeBoardItem, 'id'> }> {
  const response = await fetch('/api/gemini/theme-board', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error('Failed to generate theme concept');
  }
  return response.json();
}

export async function generateInvitationViaServer(input: {
  eventName: string;
  hostNames: string;
  date: string;
  time: string;
  venue: string;
  rsvpContact: string;
  language: string;
  formality: string;
  theme: string;
  dressCode: string;
  specialInstructions: string;
}) {
  const response = await fetch('/api/gemini/invitation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to generate invitation' }));
    throw new Error(err.error || 'Failed to generate invitation');
  }
  return response.json();
}

export async function analyzeWhatIfViaServer(input: {
  prompt: string;
  currentBudget: number;
  proposedBudget: number;
  currentGuests: number;
  proposedGuests: number;
  currency: string;
}) {
  const response = await fetch('/api/gemini/what-if', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error('Failed to analyze scenario');
  }
  return response.json();
}
