// dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service';
import { QuotesService } from '../quotes/quotes.service';
import { LeadsService } from '../leads/leads.service';
import { InboxService } from '../inbox/inbox.service';
import { TeamService } from '../team/team.service';

@Injectable()
export class DashboardService {
  constructor(
    private bookings: BookingsService,
    private quotes: QuotesService,
    private leads: LeadsService,
    private inbox: InboxService,
    private team: TeamService,
  ) {}

  async getStats() {
    const [bookingStats, quoteStats, leadStats, unreadMessages, teamStats] = await Promise.all([
      this.bookings.getStats(),
      this.quotes.getStats(),
      this.inbox.getUnreadCount(),
      this.inbox.getUnreadCount(),
      this.team.getStats(),
    ]);

    return {
      bookings: bookingStats,
      quotes: quoteStats,
      leads: leadStats,
      inbox: { unread: unreadMessages },
      team: teamStats,
      updatedAt: new Date().toISOString(),
    };
  }
}
