export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

export type EventType =
  | 'Wedding'
  | 'Engagement'
  | 'Birthday'
  | 'Anniversary'
  | 'Baby shower'
  | 'Graduation'
  | 'College festival'
  | 'Corporate event'
  | 'Community gathering'
  | 'Cultural or religious celebration'
  | 'Fundraiser'
  | 'Custom event';

export type EventStatus = 'Planning' | 'In Progress' | 'Ready' | 'Completed' | 'Archived';

export type VenueSetting = 'Indoor' | 'Outdoor' | 'Hybrid';

export type BudgetStatus = 'Estimated' | 'Quoted' | 'Confirmed' | 'Paid' | 'Overdue';

export interface BudgetCategoryItem {
  id: string;
  category: string;
  plannedAmount: number;
  quotedAmount: number;
  actualAmount: number;
  paidAmount: number;
  vendorName: string;
  paymentDueDate: string;
  status: BudgetStatus;
  notes: string;
  isMustHave?: boolean;
  isCustom?: boolean;
  allocationPercent?: number;
}

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Blocked' | 'Cancelled';
export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface TimelineTaskItem {
  id: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  dueDate: string;
  daysBeforeEvent: number;
  priority: TaskPriority;
  status: TaskStatus;
  assignedUser: string;
  dependencies: string[];
  estimatedCost: number;
  relatedVendor: string;
  notes: string;
  estimatedEffort?: string;
  isCriticalPath?: boolean;
}

export type VendorBookingStatus =
  | 'Researching'
  | 'Contacted'
  | 'Inquiry'
  | 'Quote Received'
  | 'Negotiating'
  | 'Shortlisted'
  | 'Pending'
  | 'Booked'
  | 'Completed'
  | 'Rejected';

export type ContractStatus = 'Signed' | 'Pending' | 'Draft' | 'Not Required';

export interface VendorItem {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  category: string;
  quotedAmount: number;
  finalPrice: number;
  advancePaid: number;
  availabilityStatus: 'Available' | 'Tentative' | 'Unavailable';
  bookingStatus: VendorBookingStatus;
  contractStatus?: ContractStatus;
  rating: number;
  servicesIncluded: string;
  additionalFees: number;
  cancellationTerms: string;
  paymentSchedule: string;
  followUpDate: string;
  notes: string;
  isDemoIllustrative?: boolean;
}

export interface VendorRequirementSpec {
  category: string;
  requirements: string;
  questionsToAsk: string[];
  bookingLeadDays: number;
  priorityLevel: 'Critical' | 'High' | 'Standard';
  estimatedBudgetSharePercent: number;
}

export type RsvpStatus = 'Not Invited' | 'Invited' | 'Pending' | 'Accepted' | 'Declined' | 'Waitlisted';

export interface GuestItem {
  id: string;
  fullName: string;
  household: string;
  contact: string;
  invitationStatus: 'Not Sent' | 'Sent' | 'Delivered';
  rsvpStatus: RsvpStatus;
  attendeeCount: number;
  mealPreference: 'Vegetarian' | 'Non-Vegetarian' | 'Jain' | 'Vegan' | 'Kids';
  dietaryRestrictions: string;
  accessibilityRequirements: string;
  seatingGroup: string;
  notes: string;
  source: 'Manual Entry' | 'CSV Import' | 'Online RSVP';
}

export type ThemeStyleCategory =
  | 'Traditional'
  | 'Modern'
  | 'Minimalist'
  | 'Luxury'
  | 'Rustic'
  | 'Floral'
  | 'Sustainable'
  | 'Custom';

export interface ThemeColorSwatch {
  name: string;
  hex: string;
}

export interface ThemeBoardItem {
  id: string;
  title: string;
  styleCategory: ThemeStyleCategory;
  description: string;
  colorPalette: ThemeColorSwatch[];
  typography: string;
  decorationIdeas: string;
  floralArrangements: string;
  lightingIdeas: string;
  tableSettings: string;
  entranceDesign: string;
  stageConcept: string;
  photoBoothConcept: string;
  invitationDirection: string;
  budgetAlternatives: string;
  illustrationAsset?: string;
}

export interface InvitationSuite {
  eventName: string;
  hostNames: string;
  date: string;
  time: string;
  venue: string;
  rsvpContact: string;
  language: 'English' | 'Bengali' | 'Hindi';
  formality: 'Formal' | 'Casual';
  theme: string;
  dressCode: string;
  specialInstructions: string;
  accentColor: string;
  formalCard: string;
  casualVersion: string;
  shortMessage: string;
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
  socialAnnouncement: string;
  regionalScriptNote: string;
}

export interface WhatIfScenarioItem {
  id: string;
  name: string;
  prompt: string;
  proposedGuestCount: number;
  proposedTotalBudget: number;
  proposedVenueType: VenueSetting;
  proposedEventDate: string;
  categoryAdjustments: {
    category: string;
    originalPlanned: number;
    proposedPlanned: number;
    delta: number;
    reason: string;
  }[];
  affectedTasks: string[];
  tradeoffs: string[];
  recommendations: string[];
  assumptionsLabel: string;
}

export interface CulturalCeremonyFunction {
  id: string;
  name: string;
  enabled: boolean;
  date: string;
  timeSlot: string;
  venueRequirement: string;
  guestCount: number;
  decorationConcept: string;
  cateringNotes: string;
  attireChecklist: string[];
  vendorRequirements: string[];
  budgetAllocation: number;
  familyTasks: string[];
}

export interface BirthdayPartyConfig {
  honoreeName: string;
  ageGroup: 'Kids (1-12)' | 'Teen (13-19)' | 'Young Adult (20-35)' | 'Milestone (40/50/60+)';
  isSurprise: boolean;
  interests: string;
  preferredColors: string;
  venueScale: 'Small Home Celebration' | 'Banquet / Lounge Venue' | 'Outdoor Garden';
  cakeFlavorAndDesign: string;
  gamesAndActivities: string[];
  musicAndEntertainment: string;
  photoBoothIdea: string;
  partyFavors: string;
  decorShoppingChecklist: { item: string; checked: boolean }[];
  indoorBackupPlan: string;
}

export interface SponsorRecord {
  id: string;
  sponsorName: string;
  contactDetails: string;
  tierPackage: 'Title' | 'Platinum' | 'Gold' | 'Silver' | 'In-Kind';
  amountPledged: number;
  amountReceived: number;
  deliverables: string;
  logoPromotionStatus: 'Pending' | 'Approved' | 'Displayed';
  followUpStatus: 'Prospect' | 'Pledged' | 'Invoiced' | 'Paid';
}

export interface CommunityEventConfig {
  subType:
    | 'College Festival'
    | 'Technical Hackathon'
    | 'Academic Seminar'
    | 'Cultural Program'
    | 'NGO Drive'
    | 'Neighborhood Utsav'
    | 'Fundraiser';
  expectedRegistrations: number;
  confirmedRegistrations: number;
  committees: { id: string; role: string; leadName: string; volunteersCount: number; status: string }[];
  stageAndEquipmentChecklist: { item: string; checked: boolean }[];
  safetyAndAccessibilityChecklist: { item: string; checked: boolean }[];
  promotionChecklist: { item: string; checked: boolean }[];
  speakers: { id: string; name: string; topic: string; timeSlot: string; confirmed: boolean }[];
  sponsors: SponsorRecord[];
}

export type TeamRole = 'Owner' | 'Administrator' | 'Editor' | 'Viewer';

export interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  assignedTasksCount: number;
  joinedAt: string;
}

export interface CommentItem {
  id: string;
  authorName: string;
  authorRole: TeamRole;
  text: string;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  actorName: string;
  action: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'deadline' | 'budget' | 'vendor' | 'rsvp' | 'milestone';
  read: boolean;
  dueDate: string;
}

export interface PostEventReviewData {
  finalAttendance: number;
  lessonsLearned: string;
  vendorPerformanceNotes: { vendorName: string; rating: number; review: string }[];
  unresolvedExpensesNotes: string;
  thankYouDraft: string;
  executiveSummary: string;
  photoHighlightsNote: string;
}

export interface AIProposalSection {
  summary: string;
  budgetAssumptions: string[];
  costSavingAlternatives: string[];
  vendorQuestions: {
    category: string;
    questions: string[];
    requirements?: string;
    bookingLeadDays?: number;
    priorityLevel?: 'Critical' | 'High' | 'Standard';
  }[];
  eventSpecificRecommendations?: string[];
  rsvpStrategy: string;
  cateringEstimateNotes: string;
  seatingConsiderations: string;
  accessibilityNotes: string;
  risks: { riskType: string; impact: string; mitigation: string }[];
  nextActions: {
    immediate: string[];
    nextWeek: string[];
    finalDays: string[];
  };
}

export interface EventPlanWorkspace {
  id: string;
  ownerId: string;
  isDemo?: boolean;
  title: string;
  eventType: EventType;
  status: EventStatus;
  eventDate: string;
  startTime: string;
  endTime: string;
  city: string;
  venueName: string;
  venueType: VenueSetting;
  guestCount: number;
  totalBudget: number;
  currency: CurrencyCode;
  language: 'English' | 'Bengali' | 'Hindi';
  stylePreference: string;
  culturalTradition: string;
  dietaryRequirements: string;
  accessibilityRequirements: string;
  specialRequests: string;
  priorities: string[];
  budgetFlexibility: 'Strict' | 'Moderate (+10%)' | 'Flexible';
  sustainabilityPreference: string;
  aiProposal: AIProposalSection;
  budgetItems: BudgetCategoryItem[];
  tasks: TimelineTaskItem[];
  vendors: VendorItem[];
  guests: GuestItem[];
  themes: ThemeBoardItem[];
  activeThemeId: string;
  invitation: InvitationSuite;
  scenarios: WhatIfScenarioItem[];
  culturalTraditionType: 'Bengali' | 'Punjabi' | 'South Indian' | 'Gujarati' | 'Marathi' | 'Intercultural' | 'Custom';
  culturalFunctions: CulturalCeremonyFunction[];
  birthdayConfig: BirthdayPartyConfig;
  communityConfig: CommunityEventConfig;
  teamMembers: TeamMemberItem[];
  comments: CommentItem[];
  activityLog: ActivityLogItem[];
  notifications: NotificationItem[];
  postEventReview: PostEventReviewData;
  updatedAt: string;
}

export interface UserProfileSettings {
  uid: string;
  name: string;
  email: string;
  currency: CurrencyCode;
  country: string;
  timezone: string;
  reminderLeadDays: number;
  aiPrivacyConsent: boolean;
}
