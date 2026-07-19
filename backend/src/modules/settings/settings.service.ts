import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { UpsertSettingDto, BulkUpsertDto } from './dto/setting.dto';

const DEFAULTS: Omit<Setting, 'id' | 'updatedAt'>[] = [
  // Business
  { key: 'business.name',       value: 'thefamgroup',              label: 'Business Name',     group: 'business' },
  { key: 'business.email',      value: 'info@thefamgroup.uk',  label: 'Business Email',    group: 'business' },
  { key: 'business.phone',      value: '07767759013',              label: 'WhatsApp / Phone',  group: 'business' },
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
  // Quote calculator — base prices per service type (£)
  { key: 'calculator.base.regular',          value: '60',  label: 'Regular Home Clean',     group: 'calculator' },
  { key: 'calculator.base.deep',             value: '140', label: 'Deep Clean',              group: 'calculator' },
  { key: 'calculator.base.eot',              value: '149', label: 'End of Tenancy',          group: 'calculator' },
  { key: 'calculator.base.moveout',          value: '155', label: 'Move In/Out',             group: 'calculator' },
  { key: 'calculator.base.office',           value: '95',  label: 'Office Clean',            group: 'calculator' },
  { key: 'calculator.base.postconstruction', value: '200', label: 'Post-Build Clean',        group: 'calculator' },
  { key: 'calculator.base.airbnb',           value: '75',  label: 'Airbnb / Short-Let',      group: 'calculator' },
  // Size multipliers
  { key: 'calculator.size.studio', value: '1',    label: 'Studio',  group: 'calculator' },
  { key: 'calculator.size.1bed',   value: '1.1',  label: '1 Bed',   group: 'calculator' },
  { key: 'calculator.size.2bed',   value: '1.35', label: '2 Bed',   group: 'calculator' },
  { key: 'calculator.size.3bed',   value: '1.65', label: '3 Bed',   group: 'calculator' },
  { key: 'calculator.size.4bed',   value: '2.1',  label: '4 Bed+',  group: 'calculator' },
  // Frequency multipliers
  { key: 'calculator.freq.one-off',      value: '1',    label: 'One-Off',      group: 'calculator' },
  { key: 'calculator.freq.weekly',       value: '0.80', label: 'Weekly',       group: 'calculator' },
  { key: 'calculator.freq.fortnightly',  value: '0.85', label: 'Fortnightly',  group: 'calculator' },
  { key: 'calculator.freq.monthly',      value: '0.90', label: 'Monthly',      group: 'calculator' },
  // Condition multipliers
  { key: 'calculator.cond.light',      value: '0.90', label: 'Light',       group: 'calculator' },
  { key: 'calculator.cond.average',    value: '1.0',  label: 'Average',     group: 'calculator' },
  { key: 'calculator.cond.heavy',      value: '1.28', label: 'Heavy',       group: 'calculator' },
  { key: 'calculator.cond.very-heavy', value: '1.55', label: 'Very Heavy',  group: 'calculator' },
  // Add-on prices (£)
  { key: 'calculator.addon.oven',       value: '45', label: 'Oven Clean',        group: 'calculator' },
  { key: 'calculator.addon.fridge',     value: '25', label: 'Fridge/Freezer',    group: 'calculator' },
  { key: 'calculator.addon.windows',    value: '30', label: 'Interior Windows',  group: 'calculator' },
  { key: 'calculator.addon.carpet',     value: '40', label: 'Carpet/Room',       group: 'calculator' },
  { key: 'calculator.addon.upholstery', value: '55', label: 'Upholstery',        group: 'calculator' },
  { key: 'calculator.addon.laundry',    value: '20', label: 'Laundry & Ironing', group: 'calculator' },
  { key: 'calculator.addon.cupboards',  value: '35', label: 'Inside Cupboards',  group: 'calculator' },
  { key: 'calculator.addon.sameday',    value: '25', label: 'Same-Day Priority', group: 'calculator' },
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

  async getPricingConfig() {
    const rows = await this.repo.find({ where: { group: 'calculator' } });
    const val = (key: string, fallback: number) =>
      parseFloat(rows.find((r) => r.key === key)?.value ?? String(fallback));

    return {
      BASE_PRICES: {
        regular: val('calculator.base.regular', 60),
        deep: val('calculator.base.deep', 140),
        eot: val('calculator.base.eot', 149),
        moveout: val('calculator.base.moveout', 155),
        office: val('calculator.base.office', 95),
        postconstruction: val('calculator.base.postconstruction', 200),
        airbnb: val('calculator.base.airbnb', 75),
      },
      SIZE_MULT: {
        studio: val('calculator.size.studio', 1),
        '1bed': val('calculator.size.1bed', 1.1),
        '2bed': val('calculator.size.2bed', 1.35),
        '3bed': val('calculator.size.3bed', 1.65),
        '4bed': val('calculator.size.4bed', 2.1),
      },
      FREQ_MULT: {
        'one-off': val('calculator.freq.one-off', 1),
        weekly: val('calculator.freq.weekly', 0.80),
        fortnightly: val('calculator.freq.fortnightly', 0.85),
        monthly: val('calculator.freq.monthly', 0.90),
      },
      COND_MULT: {
        light: val('calculator.cond.light', 0.90),
        average: val('calculator.cond.average', 1.0),
        heavy: val('calculator.cond.heavy', 1.28),
        'very-heavy': val('calculator.cond.very-heavy', 1.55),
      },
      ADDON_PRICES: {
        oven: val('calculator.addon.oven', 45),
        fridge: val('calculator.addon.fridge', 25),
        windows: val('calculator.addon.windows', 30),
        carpet: val('calculator.addon.carpet', 40),
        upholstery: val('calculator.addon.upholstery', 55),
        laundry: val('calculator.addon.laundry', 20),
        cupboards: val('calculator.addon.cupboards', 35),
        sameday: val('calculator.addon.sameday', 25),
      },
    };
  }
}
