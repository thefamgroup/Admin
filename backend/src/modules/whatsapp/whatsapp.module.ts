import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaSession } from './entities/wa-session.entity';
import { WhatsAppService } from './whatsapp.service';
import { BotService } from './bot.service';
import { WhatsAppController } from './whatsapp.controller';
import { InboxModule } from '../inbox/inbox.module';
import { TeamModule } from '../team/team.module';
import { BookingsModule } from '../bookings/bookings.module';
import { SettingsModule } from '../settings/settings.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaSession]),
    forwardRef(() => InboxModule),
    TeamModule,
    forwardRef(() => BookingsModule),
    SettingsModule,
    LeadsModule,
  ],
  providers: [WhatsAppService, BotService],
  exports: [WhatsAppService],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}
