import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus } from './entities/message.entity';
import { CreateMessageDto, UpdateMessageDto } from './dto/message.dto';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class InboxService {
  constructor(
    @InjectRepository(Message) private repo: Repository<Message>,
    @Inject(forwardRef(() => WhatsAppService))
    private wa: WhatsAppService,
  ) {}

  findAll(status?: MessageStatus) {
    return this.repo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Message not found');
    return m;
  }

  create(dto: CreateMessageDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateMessageDto) {
    const m = await this.findOne(id);
    Object.assign(m, dto);
    return this.repo.save(m);
  }

  async markRead(id: string) {
    return this.update(id, { status: MessageStatus.READ });
  }

  getUnreadCount() {
    return this.repo.count({ where: { status: MessageStatus.UNREAD } });
  }

  // Append a note to a thread message body
  async appendToThread(messageId: string, text: string): Promise<void> {
    try {
      const m = await this.findOne(messageId);
      m.body = `${m.body}\n\n---\n${text}`;
      await this.repo.save(m);
    } catch {
      // Message may have been deleted — ignore
    }
  }

  // Reply to a WhatsApp conversation from the inbox
  async replyViaWhatsApp(messageId: string, replyText: string): Promise<{ sent: boolean }> {
    const m = await this.findOne(messageId);
    if (!m.waFrom) {
      return { sent: false };
    }
    const sent = await this.wa.sendText(m.waFrom, `💬 *thefamgroup:* ${replyText}`);
    if (sent) {
      await this.appendToThread(messageId, `[Agent reply]: ${replyText}`);
      await this.update(messageId, { status: MessageStatus.REPLIED });
    }
    return { sent };
  }
}
