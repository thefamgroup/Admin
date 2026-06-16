import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote, QuoteStatus } from './entities/quote.entity';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';

@Injectable()
export class QuotesService {
  constructor(@InjectRepository(Quote) private repo: Repository<Quote>) {}

  findAll(status?: QuoteStatus) {
    return this.repo.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const q = await this.repo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Quote not found');
    return q;
  }

  create(dto: CreateQuoteDto) { return this.repo.save(this.repo.create(dto)); }

  async update(id: string, dto: UpdateQuoteDto) {
    const q = await this.findOne(id);
    if (dto.status === QuoteStatus.PAID && !q.paidAt) (q as any).paidAt = new Date();
    if (dto.status === QuoteStatus.SENT && !q.sentAt) (q as any).sentAt = new Date();
    Object.assign(q, dto);
    return this.repo.save(q);
  }

  async remove(id: string) { return this.repo.remove(await this.findOne(id)); }

  async getStats() {
    const [total, paid, pending, overdue] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: QuoteStatus.PAID } }),
      this.repo.count({ where: { status: QuoteStatus.SENT } }),
      this.repo.count({ where: { status: QuoteStatus.OVERDUE } }),
    ]);
    const revenue = await this.repo
      .createQueryBuilder('q').select('SUM(q.total)', 'sum')
      .where('q.status = :s', { s: QuoteStatus.PAID }).getRawOne();
    return { total, paid, pending, overdue, totalRevenue: Number(revenue?.sum ?? 0) };
  }
}
