// inbox.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus } from './entities/message.entity';
import { CreateMessageDto, UpdateMessageDto } from './dto/message.dto';

@Injectable()
export class InboxService {
  constructor(@InjectRepository(Message) private repo: Repository<Message>) {}
  findAll(status?: MessageStatus) {
    return this.repo.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' } });
  }
  async findOne(id: string) {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Message not found');
    return m;
  }
  create(dto: CreateMessageDto) { return this.repo.save(this.repo.create(dto)); }
  async update(id: string, dto: UpdateMessageDto) {
    const m = await this.findOne(id);
    Object.assign(m, dto);
    return this.repo.save(m);
  }
  async markRead(id: string) { return this.update(id, { status: MessageStatus.READ }); }
  getUnreadCount() { return this.repo.count({ where: { status: MessageStatus.UNREAD } }); }
}
