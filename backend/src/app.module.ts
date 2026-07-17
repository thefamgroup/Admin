import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { LeadsModule } from './modules/leads/leads.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { TeamModule } from './modules/team/team.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting — OWASP A05
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production' || config.get('SYNCHRONIZE_DB') === 'true',
        logging: config.get('NODE_ENV') === 'development',
        ssl: { rejectUnauthorized: false },
      }),
    }),

    // Feature modules
    AuthModule,
    DashboardModule,
    BookingsModule,
    QuotesModule,
    LeadsModule,
    InboxModule,
    TeamModule,
    SettingsModule,
    WhatsAppModule,
  ],
})
export class AppModule {}
