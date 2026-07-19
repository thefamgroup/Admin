import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quote]), forwardRef(() => WhatsAppModule)],
  providers: [QuotesService],
  controllers: [QuotesController],
  exports: [QuotesService],
})
export class QuotesModule {}
