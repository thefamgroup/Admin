import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { BookingsService } from '../bookings/bookings.service';
import { SettingsService } from '../settings/settings.service';
import { ServiceType } from '../bookings/entities/booking.entity';

function mapServiceType(interest?: string): ServiceType {
  if (!interest) return ServiceType.REGULAR;
  const s = interest.toLowerCase();
  if (s.includes('deep')) return ServiceType.DEEP;
  if (s.includes('tenancy') || s.includes('eot')) return ServiceType.EOT;
  if (s.includes('move')) return ServiceType.MOVE_IN_OUT;
  if (s.includes('office') || s.includes('commercial')) return ServiceType.OFFICE;
  if (s.includes('construct') || s.includes('build')) return ServiceType.POST_CONSTRUCTION;
  if (s.includes('airbnb') || s.includes('short-let')) return ServiceType.AIRBNB;
  if (s.includes('industrial')) return ServiceType.INDUSTRIAL;
  return ServiceType.REGULAR;
}

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private repo: Repository<Lead>,
    private readonly bookingsSvc: BookingsService,
    private readonly settingsSvc: SettingsService,
  ) {}

  findAll(status?: LeadStatus) {
    return this.repo.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const l = await this.repo.findOne({ where: { id } });
    if (!l) throw new NotFoundException('Lead not found');
    return l;
  }

  findByPhone(phone: string) {
    const clean = phone.replace(/\D/g, '');
    return this.repo.find({
      where: { phone: Like(`%${clean}`) },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  create(dto: CreateLeadDto) { return this.repo.save(this.repo.create(dto)); }

  async update(id: string, dto: UpdateLeadDto) {
    const l = await this.findOne(id);
    Object.assign(l, dto);
    return this.repo.save(l);
  }

  async remove(id: string) { return this.repo.remove(await this.findOne(id)); }

  async markWon(id: string) {
    const lead = await this.findOne(id);
    lead.status = LeadStatus.WON;
    await this.repo.save(lead);

    const autoConvert = await this.settingsSvc.get('booking.auto_convert');
    if (autoConvert === 'true') {
      const booking = await this.convertToBooking(id);
      return { lead, bookingCreated: true, booking };
    }
    return { lead, bookingCreated: false };
  }

  async convertToBooking(id: string) {
    const lead = await this.findOne(id);
    const booking = await this.bookingsSvc.create({
      clientName: lead.name,
      clientEmail: lead.email || '',
      clientPhone: lead.phone || '',
      address: lead.address || 'TBC — please update',
      serviceType: mapServiceType(lead.serviceInterest),
      price: lead.estimatedValue ? Number(lead.estimatedValue) : undefined,
      notes: [
        lead.notes,
        `Converted from lead. Service interest: ${lead.serviceInterest || 'not specified'}`,
      ].filter(Boolean).join('\n'),
      sourceLeadId: lead.id,
    } as any);

    // Mark the lead as won if it isn't already
    if (lead.status !== LeadStatus.WON) {
      lead.status = LeadStatus.WON;
      await this.repo.save(lead);
    }

    return booking;
  }

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
