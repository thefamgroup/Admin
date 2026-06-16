import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { UpsertSettingDto, BulkUpsertDto } from './dto/setting.dto';

const DEFAULTS: Omit<Setting, 'id' | 'updatedAt'>[] = [
  // Business
  { key: 'business.name',       value: 'thefamgroup',              label: 'Business Name',     group: 'business' },
  { key: 'business.email',      value: 'thefamgrouphq@gmail.com',  label: 'Business Email',    group: 'business' },
  { key: 'business.phone',      value: '07769240184',              label: 'WhatsApp / Phone',  group: 'business' },
  { key: 'business.website',    value: 'www.thefamgroup.co.uk',    label: 'Website',           group: 'business' },
  { key: 'business.address',    value: 'Manchester & Crewe, UK',   label: 'Service Areas',     group: 'business' },
  // Notifications
  { key: 'notify.newBooking',   value: 'true',  label: 'New Booking Alert',    group: 'notifications' },
  { key: 'notify.newLead',      value: 'true',  label: 'New Lead Alert',       group: 'notifications' },
  { key: 'notify.newMessage',   value: 'true',  label: 'New Message Alert',    group: 'notifications' },
  { key: 'notify.quoteOverdue', value: 'true',  label: 'Overdue Quote Alert',  group: 'notifications' },
  // Pricing defaults
  { key: 'pricing.currency',    value: 'GBP',   label: 'Currency',             group: 'pricing' },
  { key: 'pricing.vat',         value: 'false', label: 'Charge VAT',           group: 'pricing' },
  { key: 'pricing.depositPct',  value: '50',    label: 'Deposit % for large jobs', group: 'pricing' },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(@InjectRepository(Setting) private repo: Repository<Setting>) {}

  async onModuleInit() {
    for (const d of DEFAULTS) {
      const exists = await this.repo.findOne({ where: { key: d.key } });
      if (!exists) await this.repo.save(this.repo.create(d));
    }
  }

  async findAll(group?: string) {
    return group
      ? this.repo.find({ where: { group } })
      : this.repo.find({ order: { group: 'ASC', key: 'ASC' } });
  }

  async get(key: string): Promise<string | null> {
    const s = await this.repo.findOne({ where: { key } });
    return s?.value ?? null;
  }

  async upsert(dto: UpsertSettingDto) {
    const existing = await this.repo.findOne({ where: { key: dto.key } });
    if (existing) {
      Object.assign(existing, dto);
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create(dto));
  }

  async bulkUpsert(dto: BulkUpsertDto) {
    return Promise.all(dto.settings.map((s) => this.upsert(s)));
  }
}
