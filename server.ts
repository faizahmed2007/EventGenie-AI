import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  validateEventPlanInput,
  validateAndNormalizeAIEventPlan,
  validateAndNormalizeThemeBoard,
  validateAndNormalizeInvitation,
  validateAndNormalizeWhatIfAnalysis,
} from './src/utils/planningEngine.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = 'gemini-3-flash-preview';

// Enforce request size limit for AI privacy and security (Section 26)
app.use(express.json({ limit: '250kb' }));

// Simple per-IP rate limiter for AI endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 30;
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY.trim() !== ''
  );
  res.json({ status: 'ok', geminiConfigured: hasKey });
});

// 1. Validated, Structured AI Event Plan Generator (Deterministic Math + Dependency-Aware Timeline)
app.post('/api/gemini/event-plan', async (req, res) => {
  const ip = req.ip || 'local';
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute before generating another plan.' });
    return;
  }

  const validation = validateEventPlanInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.errors[0], errors: validation.errors });
    return;
  }

  const input = validation.normalized;
  const ai = getGenAIClient();

  if (ai) {
    try {
      const userContext = `
Event Prompt: ${input.prompt}
Event Name: ${input.eventName}
Event Type: ${input.eventType}
Target Date: ${input.eventDate}
Location: ${input.city} (${input.venueType} Venue)
Guest Count: ${input.guestCount}
Total Budget: ${input.currency} ${input.totalBudget}
Style: ${input.style}
Cultural Tradition: ${input.culturalTradition}
Dietary Notes: ${input.dietaryNotes}
Priorities: ${input.priorities.join(', ')}
      `.trim();

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Generate a structured, culturally aware event plan for the following celebration.
IMPORTANT RULES:
1. For budgetCategories, provide relative allocationPercent weights (0-100) and realistic scope notes; application code will deterministically calculate exact currency amounts.
2. For timelineTasks, provide unique task IDs (e.g. "task_1", "task_2") and explicit prerequisite task IDs in "dependencies" so the timeline forms a valid dependency graph.
3. For vendorRequirements, include bookingLeadDays, priorityLevel ("Critical", "High", or "Standard"), requirements, and screening questionsToAsk. Never fabricate vendor phone numbers or street addresses.
4. Provide eventSpecificRecommendations tailored to the event type, city, venue setting, and cultural tradition.

${userContext}`,
        config: {
          systemInstruction:
            'You are EventGenie AI, an expert event architect. Return a practical, culturally respectful, realistic event plan in valid JSON matching the schema. Never invent fake vendor phone numbers or fake street addresses.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              eventOverview: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  eventType: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  priorities: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'eventType', 'summary', 'priorities'],
              },
              theme: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  styleCategory: { type: Type.STRING },
                  description: { type: Type.STRING },
                  colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
                  decorationDirection: { type: Type.STRING },
                  lightingIdeas: { type: Type.STRING },
                  entranceConcept: { type: Type.STRING },
                  tableSetup: { type: Type.STRING },
                  photoBoothConcept: { type: Type.STRING },
                  guestExperience: { type: Type.STRING },
                },
                required: [
                  'name',
                  'styleCategory',
                  'description',
                  'colorPalette',
                  'decorationDirection',
                  'lightingIdeas',
                  'entranceConcept',
                  'tableSetup',
                  'photoBoothConcept',
                  'guestExperience',
                ],
              },
              budgetCategories: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    allocationPercent: { type: Type.NUMBER },
                    isMustHave: { type: Type.BOOLEAN },
                    notes: { type: Type.STRING },
                  },
                  required: ['category', 'allocationPercent', 'isMustHave', 'notes'],
                },
              },
              budgetAssumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              costSavingAlternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
              timelineTasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    daysBeforeEvent: { type: Type.NUMBER },
                    priority: { type: Type.STRING },
                    dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    estimatedEffort: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'title',
                    'category',
                    'daysBeforeEvent',
                    'priority',
                    'dependencies',
                    'estimatedEffort',
                    'notes',
                  ],
                },
              },
              vendorRequirements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    requirements: { type: Type.STRING },
                    questionsToAsk: { type: Type.ARRAY, items: { type: Type.STRING } },
                    bookingLeadDays: { type: Type.NUMBER },
                    priorityLevel: { type: Type.STRING },
                  },
                  required: ['category', 'requirements', 'questionsToAsk', 'bookingLeadDays', 'priorityLevel'],
                },
              },
              eventSpecificRecommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              guestPlan: {
                type: Type.OBJECT,
                properties: {
                  rsvpStrategy: { type: Type.STRING },
                  cateringEstimateNotes: { type: Type.STRING },
                  seatingConsiderations: { type: Type.STRING },
                  accessibilityNotes: { type: Type.STRING },
                },
                required: ['rsvpStrategy', 'cateringEstimateNotes', 'seatingConsiderations', 'accessibilityNotes'],
              },
              risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    riskType: { type: Type.STRING },
                    impact: { type: Type.STRING },
                    mitigation: { type: Type.STRING },
                  },
                  required: ['riskType', 'impact', 'mitigation'],
                },
              },
              nextActions: {
                type: Type.OBJECT,
                properties: {
                  immediate: { type: Type.ARRAY, items: { type: Type.STRING } },
                  nextWeek: { type: Type.ARRAY, items: { type: Type.STRING } },
                  finalDays: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['immediate', 'nextWeek', 'finalDays'],
              },
            },
            required: [
              'eventOverview',
              'theme',
              'budgetCategories',
              'budgetAssumptions',
              'costSavingAlternatives',
              'timelineTasks',
              'vendorRequirements',
              'eventSpecificRecommendations',
              'guestPlan',
              'risks',
              'nextActions',
            ],
          },
        },
      });

      const validatedPlan = validateAndNormalizeAIEventPlan(response.text || '{}', input);
      res.json({ source: 'gemini', plan: validatedPlan });
      return;
    } catch (error) {
      console.error('Gemini event-plan error, falling back to validated structured engine:', error);
    }
  }

  // Deterministic high-precision structured plan when API key is not configured or on fallback
  const fallbackPlan = validateAndNormalizeAIEventPlan({}, input);
  res.json({
    source: 'structured-engine',
    plan: fallbackPlan,
  });
});

// 2. Visual Theme Studio Generator
app.post('/api/gemini/theme-board', async (req, res) => {
  const ip = req.ip || 'local';
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute before generating another theme.' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { eventType, styleCategory, colorPreferences, venueType, season, budget, culturalStyle, mood } = body;
  const ai = getGenAIClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Create a visual event theme concept for a ${eventType || 'Celebration'} with style "${styleCategory || 'Traditional'}", colors "${colorPreferences || 'Emerald & Gold'}", venue "${venueType || 'Indoor'}", season "${season || 'Winter'}", cultural style "${culturalStyle || 'Indian'}", mood "${mood || 'Warm & Regal'}", budget "${budget || '500000'}".`,
        config: {
          systemInstruction: 'You are DreamBoard AI inside EventGenie AI. Return a detailed, cohesive visual theme board in JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              styleCategory: { type: Type.STRING },
              description: { type: Type.STRING },
              colorPalette: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    hex: { type: Type.STRING },
                  },
                  required: ['name', 'hex'],
                },
              },
              typography: { type: Type.STRING },
              decorationIdeas: { type: Type.STRING },
              floralArrangements: { type: Type.STRING },
              lightingIdeas: { type: Type.STRING },
              tableSettings: { type: Type.STRING },
              entranceDesign: { type: Type.STRING },
              stageConcept: { type: Type.STRING },
              photoBoothConcept: { type: Type.STRING },
              invitationDirection: { type: Type.STRING },
              budgetAlternatives: { type: Type.STRING },
            },
            required: [
              'title',
              'styleCategory',
              'description',
              'colorPalette',
              'typography',
              'decorationIdeas',
              'floralArrangements',
              'lightingIdeas',
              'tableSettings',
              'entranceDesign',
              'stageConcept',
              'photoBoothConcept',
              'invitationDirection',
              'budgetAlternatives',
            ],
          },
        },
      });
      const normalizedTheme = validateAndNormalizeThemeBoard(response.text || '{}', body);
      res.json({ source: 'gemini', themeBoard: normalizedTheme });
      return;
    } catch (error) {
      console.error('Gemini theme-board error:', error);
    }
  }

  res.json({
    source: 'structured-engine',
    themeBoard: validateAndNormalizeThemeBoard({}, body),
  });
});

// 3. Invitation Wording Generator
app.post('/api/gemini/invitation', async (req, res) => {
  const ip = req.ip || 'local';
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute before generating another invitation.' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { eventName, hostNames, date, time, venue, rsvpContact, language, formality, theme, dressCode, specialInstructions } = body;
  if (!eventName || !date || !venue) {
    res.status(400).json({ error: 'Event name, date, and venue are required so we never invent missing event details.' });
    return;
  }

  const ai = getGenAIClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Generate invitation wording using ONLY these exact facts (never invent dates, addresses, or contacts):
Event Name: ${eventName}
Host Names: ${hostNames || 'The Host Family'}
Date: ${date}
Time: ${time || '7:00 PM onwards'}
Venue: ${venue}
RSVP Contact: ${rsvpContact || 'Kindly RSVP to the hosts'}
Language: ${language || 'English'}
Formality: ${formality || 'Formal'}
Theme: ${theme || 'Classic Celebration'}
Dress Code: ${dressCode || 'Traditional / Festive Attire'}
Special Instructions: ${specialInstructions || 'Your presence and blessings are our greatest gift.'}`,
        config: {
          systemInstruction: 'Generate authentic, warm invitation suites in JSON. If Bengali or Hindi is requested, include culturally authentic script alongside English.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              formalCard: { type: Type.STRING },
              casualVersion: { type: Type.STRING },
              shortMessage: { type: Type.STRING },
              whatsappMessage: { type: Type.STRING },
              emailSubject: { type: Type.STRING },
              emailBody: { type: Type.STRING },
              socialAnnouncement: { type: Type.STRING },
              regionalScriptNote: { type: Type.STRING },
            },
            required: ['formalCard', 'casualVersion', 'shortMessage', 'whatsappMessage', 'emailSubject', 'emailBody', 'socialAnnouncement', 'regionalScriptNote'],
          },
        },
      });
      const normalizedInvitation = validateAndNormalizeInvitation(response.text || '{}', body);
      res.json({ source: 'gemini', invitation: normalizedInvitation });
      return;
    } catch (error) {
      console.error('Gemini invitation error:', error);
    }
  }

  res.json({
    source: 'structured-engine',
    invitation: validateAndNormalizeInvitation({}, body),
  });
});

// 4. What-If Scenario Trade-off Explainer
app.post('/api/gemini/what-if', async (req, res) => {
  const ip = req.ip || 'local';
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute before running another scenario.' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { prompt, currentBudget, proposedBudget, currentGuests, proposedGuests, currency } = body;
  const ai = getGenAIClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Analyze this What-If event scenario: "${prompt || 'Budget and guest capacity adjustment'}".
Original Budget: ${currency || 'INR'} ${currentBudget}, Proposed Budget: ${currency || 'INR'} ${proposedBudget}.
Original Guests: ${currentGuests}, Proposed Guests: ${proposedGuests}.
Explain the trade-offs, operational impacts, and recommended mitigation actions.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tradeoffs: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              riskNote: { type: Type.STRING },
            },
            required: ['tradeoffs', 'recommendations', 'riskNote'],
          },
        },
      });
      const normalizedAnalysis = validateAndNormalizeWhatIfAnalysis(response.text || '{}', body);
      res.json({ source: 'gemini', analysis: normalizedAnalysis });
      return;
    } catch (error) {
      console.error('Gemini what-if error:', error);
    }
  }

  res.json({
    source: 'structured-engine',
    analysis: validateAndNormalizeWhatIfAnalysis({}, body),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EventGenie AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
