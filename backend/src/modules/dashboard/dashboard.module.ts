import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { BookingsModule } from '../bookings/bookings.module';
import { QuotesModule } from '../quotes/quotes.module';
import { LeadsModule } from '../leads/leads.module';
import { InboxModule } from '../inbox/inbox.module';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [BookingsModule, QuotesModule, LeadsModule, InboxModule, TeamModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
