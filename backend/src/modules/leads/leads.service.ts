// leads.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';

@Injectable()
export class LeadsService {
  constructor(@InjectRepository(Lead) private repo: Repository<Lead>) {}

  findAll(status?: LeadStatus) {
    return this.repo.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const l = await this.repo.findOne({ where: { id } });
    if (!l) throw new NotFoundException('Lead not found');
    return l;
  }

  create(dto: CreateLeadDto) { return this.repo.save(this.repo.create(dto)); }

  async update(id: string, dto: UpdateLeadDto) {
    const l = await this.findOne(id);
    Object.assign(l, dto);
    return this.repo.save(l);
  }

  async remove(id: string) { return this.repo.remove(await this.findOne(id)); }

  async getKanban() {
    const statuses = Object.values(LeadStatus);
    const results = await Promise.all(
      statuses.map(async (s) => ({
        status: s,
        leads: await this.repo.find({ where: { status: s }, order: { createdAt: 'DESC' } }),
      }))
    );
    return results;
  }

  async getStats() {
    const counts = await Promise.all(
      Object.values(LeadStatus).map(async (s) => ({ status: s, count: await this.repo.count({ where: { status: s } }) }))
    );
    const total = await this.repo.count();
    return { total, byStatus: counts };
  }
}
