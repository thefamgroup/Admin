// ── Auth ──────────────────────────────────────────────────────────
export interface AuthUser {
  id: string; email: string; firstName: string; lastName: string; role: string;
}
export interface LoginResponse { accessToken: string; user: AuthUser }

// ── Bookings ──────────────────────────────────────────────────────
export type BookingStatus = 'pending'|'confirmed'|'in_progress'|'completed'|'cancelled'
export type ServiceType   = 'regular'|'deep'|'eot'|'move_in_out'|'office'|'post_construction'|'airbnb'|'industrial'
export interface Booking {
  id: string; clientName: string; clientEmail: string; clientPhone: string;
  address: string; postcode?: string; serviceType: ServiceType; status: BookingStatus;
  scheduledAt: string; price?: number; assignedTo?: string; notes?: string;
  depositPaid: boolean; createdAt: string; updatedAt: string;
}
export interface BookingStats { total: number; pending: number; confirmed: number; completed: number }

// ── Quotes ────────────────────────────────────────────────────────
export type QuoteStatus = 'draft'|'sent'|'accepted'|'declined'|'paid'|'overdue'
export interface Quote {
  id: string; clientName: string; clientEmail: string; clientPhone: string;
  serviceType: string; propertySize: string; status: QuoteStatus;
  subtotal: number; addonsTotal: number; total: number;
  addons?: { name: string; price: number }[]; notes?: string;
  stripePaymentLink?: string; sentAt?: string; paidAt?: string;
  dueDate?: string; createdAt: string; updatedAt: string;
}
export interface QuoteStats { total: number; paid: number; pending: number; overdue: number; totalRevenue: number }

// ── Leads ─────────────────────────────────────────────────────────
export type LeadStatus = 'new'|'contacted'|'quoted'|'won'|'lost'
export type LeadSource = 'website'|'whatsapp'|'email'|'phone'|'referral'
export interface Lead {
  id: string; name: string; email?: string; phone?: string; address?: string;
  serviceInterest?: string; propertyType?: string; status: LeadStatus;
  source: LeadSource; estimatedValue?: number; notes?: string;
  assignedTo?: string; followUpAt?: string; createdAt: string; updatedAt: string;
}

// ── Inbox ─────────────────────────────────────────────────────────
export type MessageSource = 'whatsapp'|'email'|'web'
export type MessageStatus = 'unread'|'read'|'replied'|'archived'
export interface Message {
  id: string; senderName: string; senderEmail?: string; senderPhone?: string;
  source: MessageSource; status: MessageStatus; body: string;
  subject?: string; threadId?: string; assignedTo?: string;
  waFrom?: string; createdAt: string;
}

// ── Team ──────────────────────────────────────────────────────────
export type MemberRole   = 'cleaner'|'supervisor'|'driver'
export type MemberStatus = 'active'|'inactive'|'on_leave'
export interface TeamMember {
  id: string; firstName: string; lastName: string; email: string; phone?: string;
  role: MemberRole; status: MemberStatus; hourlyRate: number;
  dbsChecked: boolean; dbsExpiry?: string; address?: string;
  notes?: string; whatsappPhone?: string;
  totalJobsCompleted: number; totalJobsSent: number; totalJobsCancelled: number; rating: number;
  createdAt: string; updatedAt: string;
}

// ── Dashboard ─────────────────────────────────────────────────────
export interface DashboardStats {
  bookings: BookingStats;
  quotes: QuoteStats;
  leads: { total: number; byStatus: { status: string; count: number }[] };
  inbox: { unread: number };
  team: { total: number; active: number; inactive: number; dbsExpiring: number };
  updatedAt: string;
}

// ── Pagination ────────────────────────────────────────────────────
export interface Paginated<T> { items: T[]; total: number; page: number; limit: number; pages: number }
