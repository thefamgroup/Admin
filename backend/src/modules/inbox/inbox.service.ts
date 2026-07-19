import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Message, MessageStatus } from './entities/message.entity';
import { CreateMessageDto, UpdateMessageDto } from './dto/message.dto';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);
  private readonly adminEmail: string;
  private readonly resendKey: string;

  constructor(
    @InjectRepository(Message) private repo: Repository<Message>,
    @Inject(forwardRef(() => WhatsAppService))
    private wa: WhatsAppService,
    config: ConfigService,
  ) {
    this.adminEmail = config.get('ADMIN_EMAIL', 'info@thefamgroup.uk');
    this.resendKey  = config.get('RESEND_API_KEY', '');
  }

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

  findByPhone(phone: string) {
    const clean = phone.replace(/\D/g, '');
    return this.repo.find({
      where: [{ senderPhone: Like(`%${clean}`) }, { waFrom: Like(`%${clean}`) }],
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async create(dto: CreateMessageDto) {
    const msg = await this.repo.save(this.repo.create(dto));
    this.sendEmailNotification(msg).catch(() => {});
    return msg;
  }

  async update(id: string, dto: UpdateMessageDto) {
    const m = await this.findOne(id);
    Object.assign(m, dto);
    return this.repo.save(m);
  }

  async markRead(id: string) {
    return this.update(id, { status: MessageStatus.READ });
  }

  async assign(id: string, assignedTo: string) {
    return this.update(id, { assignedTo } as any);
  }

  getUnreadCount() {
    return this.repo.count({ where: { status: MessageStatus.UNREAD } });
  }

  async appendToThread(messageId: string, text: string): Promise<void> {
    try {
      const m = await this.findOne(messageId);
      m.body = `${m.body}\n\n---\n${text}`;
      await this.repo.save(m);
    } catch {
      // Message may have been deleted — ignore
    }
  }

  async replyViaWhatsApp(messageId: string, replyText: string): Promise<{ sent: boolean }> {
    const m = await this.findOne(messageId);
    if (!m.waFrom) return { sent: false };
    const sent = await this.wa.sendText(m.waFrom, `💬 *thefamgroup:* ${replyText}`);
    if (sent) {
      await this.appendToThread(messageId, `[Agent reply]: ${replyText}`);
      await this.update(messageId, { status: MessageStatus.REPLIED });
    }
    return { sent };
  }

  private async sendEmailNotification(msg: Message): Promise<void> {
    if (!this.resendKey) return;
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.resendKey}`,
        },
        body: JSON.stringify({
          from: 'thefamgroup Inbox <notifications@thefamgroup.uk>',
          to: [this.adminEmail],
          subject: `📬 New ${msg.source} message from ${msg.senderName}`,
          html: `<div style="font-family:sans-serif;max-width:600px">
            <h2 style="color:#3a7d44">New message in your inbox</h2>
            <p><strong>From:</strong> ${msg.senderName}</p>
            <p><strong>Source:</strong> ${msg.source}</p>
            ${msg.subject ? `<p><strong>Subject:</strong> ${msg.subject}</p>` : ''}
            <p><strong>Message:</strong></p>
            <blockquote style="border-left:4px solid #3a7d44;padding-left:12px;color:#444">
              ${msg.body.replace(/\n/g, '<br>')}
            </blockquote>
            <p><a href="https://admin-x4wx.onrender.com/admin/inbox" style="background:#3a7d44;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">Open Inbox</a></p>
          </div>`,
        }),
      });
    } catch (err) {
      this.logger.warn(`[Inbox] Email notification failed: ${err}`);
    }
  }
}
