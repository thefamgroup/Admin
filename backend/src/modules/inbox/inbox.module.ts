import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { InboxService } from './inbox.service';
import { InboxController } from './inbox.controller';
import { InboxGateway } from './inbox.gateway';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    forwardRef(() => WhatsAppModule),
  ],
  providers: [InboxGateway, InboxService],
  controllers: [InboxController],
  exports: [InboxService],
})
export class InboxModule {}
