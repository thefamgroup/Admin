import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaSession } from './entities/wa-session.entity';
import { WhatsAppService } from './whatsapp.service';
import { InboxService } from '../inbox/inbox.service';
import { TeamService } from '../team/team.service';
import { BookingsService } from '../bookings/bookings.service';
import { SettingsService } from '../settings/settings.service';
import { LeadsService } from '../leads/leads.service';
import { LeadSource } from '../leads/entities/lead.entity';
import { MessageSource } from '../inbox/entities/message.entity';
import { BookingStatus } from '../bookings/entities/booking.entity';

// ── Label maps ────────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  '1': 'regular', '2': 'deep', '3': 'eot',
  '4': 'moveout', '5': 'office', '6': 'postconstruction', '7': 'airbnb',
};

const SERVICE_NAMES: Record<string, string> = {
  regular: 'Regular Home Clean', deep: 'Deep Clean', eot: 'End of Tenancy',
  moveout: 'Move In / Out', office: 'Office Clean',
  postconstruction: 'Post-Build / Construction', airbnb: 'Airbnb / Short-Let',
};

const SIZE_LABELS: Record<string, string> = {
  '1': 'studio', '2': '1bed', '3': '2bed', '4': '3bed', '5': '4bed',
};

const SIZE_NAMES: Record<string, string> = {
  studio: 'Studio', '1bed': '1 Bedroom', '2bed': '2 Bedrooms',
  '3bed': '3 Bedrooms', '4bed': '4 Bedrooms+',
};

const FREQ_LABELS: Record<string, string> = {
  '1': 'one-off', '2': 'weekly', '3': 'fortnightly', '4': 'monthly',
};

const FREQ_NAMES: Record<string, string> = {
  'one-off': 'One-Off', weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly',
};

const COND_LABELS: Record<string, string> = {
  '1': 'light', '2': 'average', '3': 'heavy', '4': 'very-heavy',
};

const FAQ: Array<[string[], string]> = [
  [
    ['area', 'cover', 'location', 'manchester', 'crewe'],
    `📍 We cover *Manchester & Crewe* and surrounding areas. Message us your postcode and we'll confirm availability.`,
  ],
  [
    ['price', 'cost', 'charge', 'how much', 'rate'],
    `💷 Our prices start from *£60* for a regular home clean.\n\nTap *Price Estimate* for an instant personalised price, or *Request a Quote* for a formal quote.`,
  ],
  [
    ['book', 'booking', 'schedule', 'appoint'],
    `📅 To book, tap *Make a Booking* and we'll collect your details.\n\nOr call us on *07767 759 013*.`,
  ],
  [
    ['dbs', 'check', 'safe', 'trust', 'insur'],
    `🔒 All our cleaners are DBS-checked, fully insured, and trained professionals. Family. Community. Care.`,
  ],
  [
    ['cancel', 'reschedule', 'change'],
    `📋 To cancel or reschedule, please call us on *07767 759 013* or email *info@thefamgroup.uk* at least 24 hours in advance.`,
  ],
  [
    ['oven', 'fridge', 'window', 'carpet', 'upholster', 'addon', 'extra'],
    `✨ We offer add-on services including oven clean, fridge clean, window cleaning, carpet & upholstery cleaning and more.\n\nTap *Price Estimate* for pricing that includes add-ons.`,
  ],
  [
    ['eot', 'end of tenanc', 'deposit', 'landlord'],
    `🔑 Our *End of Tenancy* clean is designed to help you get your deposit back. We clean to agency standards.\n\nTap *Request a Quote* to get a formal quote.`,
  ],
];

const GLOBAL_RESETS = ['menu', 'hi', 'hello', 'hey', 'start', 'help', 'reset'];

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    @InjectRepository(WaSession)
    private sessionRepo: Repository<WaSession>,
    private wa: WhatsAppService,
    @Inject(forwardRef(() => InboxService))
    private inboxService: InboxService,
    private teamService: TeamService,
    private bookingsService: BookingsService,
    private settingsService: SettingsService,
    private leadsService: LeadsService,
  ) {}

  // ── Session helpers ───────────────────────────────────────────────────────

  private async getSession(phone: string): Promise<WaSession> {
    let s = await this.sessionRepo.findOne({ where: { phone } });
    if (!s) {
      s = this.sessionRepo.create({ phone, state: 'IDLE', data: {} });
      await this.sessionRepo.save(s);
    }
    return s;
  }

  private async save(s: WaSession) { await this.sessionRepo.save(s); }

  private async reset(s: WaSession) {
    s.state = 'IDLE'; s.data = {}; s.inboxMessageId = null; s.activeJobRef = null;
    await this.sessionRepo.save(s);
  }

  // ── Entry point ───────────────────────────────────────────────────────────

  async handleIncoming(
    from: string, senderName: string, _messageType: string, text: string, mediaId?: string,
  ): Promise<void> {
    const msg = (text || '').trim().toLowerCase();
    this.logger.log(`[Bot] ← ${from} (${senderName}): "${msg}"`);

    // Employee check
    const employee = await this.teamService.findByWhatsApp(from);
    if (employee) { await this.handleEmployeeMessage(from, employee, msg, mediaId); return; }

    const session = await this.getSession(from);
    this.logger.log(`[Bot] Session: ${from} → ${session.state}`);

    // Global escape — always resets to menu regardless of state
    if (GLOBAL_RESETS.includes(msg)) {
      await this.sendMenu(session, from); return;
    }

    // AGENT state — forward customer messages to inbox thread
    if (session.state === 'AGENT') {
      if (session.inboxMessageId) {
        await this.inboxService.appendToThread(session.inboxMessageId, `[Customer]: ${text}`);
      }
      return;
    }

    await this.route(session, from, senderName, msg);
  }

  // ── Router ────────────────────────────────────────────────────────────────

  private async route(
    s: WaSession, from: string, senderName: string, msg: string,
  ): Promise<void> {
    switch (s.state) {
      case 'IDLE':          return this.sendMenu(s, from);
      case 'MENU':          return this.handleMenuChoice(s, from, senderName, msg);
      case 'PRICING_SERVICE': return this.handlePricingService(s, from, msg);
      case 'PRICING_SIZE':    return this.handlePricingSize(s, from, msg);
      case 'PRICING_FREQ':    return this.handlePricingFreq(s, from, msg);
      case 'PRICING_COND':    return this.handlePricingCond(s, from, msg);
      case 'PRICING_DONE':    return this.handlePricingDone(s, from, senderName, msg);
      case 'QUOTE_SERVICE':   return this.handleQuoteService(s, from, msg);
      case 'QUOTE_SIZE':      return this.handleQuoteSize(s, from, msg);
      case 'QUOTE_FREQ':      return this.handleQuoteFreq(s, from, msg);
      case 'QUOTE_NAME':      return this.handleQuoteName(s, from, msg);
      case 'QUOTE_EMAIL':     return this.handleQuoteEmail(s, from, msg);
      case 'QUOTE_PHONE':     return this.handleQuotePhone(s, from, senderName, msg);
      case 'SUPPORT':         return this.handleSupport(s, from, senderName, msg);
      default:                return this.sendMenu(s, from);
    }
  }

  // ── Menu ─────────────────────────────────────────────────────────────────

  private async sendMenu(s: WaSession, from: string): Promise<void> {
    s.state = 'MENU'; s.data = {};
    await this.save(s);
    await this.wa.sendInteractiveList(
      from,
      `Hi! I'm the *thefamgroup* assistant 👋\n\nWhat can I help you with today?`,
      'View options',
      [
        {
          title: 'Services',
          rows: [
            { id: '1', title: '💡 Price Estimate',   description: 'Get an instant price' },
            { id: '2', title: '📋 Request a Quote',  description: 'Formal quote sent to you' },
            { id: '3', title: '📅 Make a Booking',   description: 'Book a clean with us' },
          ],
        },
        {
          title: 'Help & Support',
          rows: [
            { id: '4', title: '❓ FAQ & Support',    description: 'Get answers fast' },
            { id: '5', title: '💬 Customer Support', description: 'Talk to our team' },
          ],
        },
      ],
      'thefamgroup',
      'Family · Community · Care',
    );
  }

  private async handleMenuChoice(
    s: WaSession, from: string, senderName: string, msg: string,
  ): Promise<void> {
    switch (msg) {
      case '1':
        s.state = 'PRICING_SERVICE'; s.data = {}; await this.save(s);
        return this.sendServiceList(from, '💡 *Instant Price Estimate*\n\nWhat type of cleaning do you need?');

      case '2':
        s.state = 'QUOTE_SERVICE'; s.data = {}; await this.save(s);
        return this.sendServiceList(from, '📋 *Request a Quote*\n\nWhat type of service do you need?');

      case '3':
        await this.wa.sendInteractiveButtons(
          from,
          `📅 *Make a Booking*\n\nWe'll get everything arranged for you. How would you like to proceed?`,
          [
            { id: '2', title: 'Get a Quote First' },
            { id: '5', title: 'Talk to Support' },
          ],
          'Book a Clean',
          'Mon–Sat 8am–6pm',
        );
        return;

      case '4':
        s.state = 'SUPPORT'; await this.save(s);
        await this.wa.sendInteractiveButtons(
          from,
          `🙋 *FAQ & Support*\n\nAsk me anything, or tap below:\n\n• What areas do you cover?\n• How much does a deep clean cost?\n• Are your cleaners DBS checked?\n• Can I cancel my booking?`,
          [
            { id: '5', title: 'Talk to Support' },
          ],
          'FAQ & Support',
        );
        return;

      case '5':
        return this.connectToAgent(s, from, senderName);

      default:
        await this.wa.sendText(from, `Please choose an option from the menu.`);
        return this.sendMenu(s, from);
    }
  }

  // ── Shared: service list ──────────────────────────────────────────────────

  private async sendServiceList(from: string, header: string): Promise<void> {
    await this.wa.sendInteractiveList(
      from,
      header,
      'Choose service',
      [
        {
          title: 'Residential',
          rows: [
            { id: '1', title: 'Regular Home Clean',  description: 'Weekly, fortnightly, monthly' },
            { id: '2', title: 'Deep Clean',           description: 'One-off intensive clean' },
            { id: '3', title: 'End of Tenancy',       description: 'Get your deposit back' },
            { id: '4', title: 'Move In / Out',        description: 'New home ready to go' },
          ],
        },
        {
          title: 'Specialist',
          rows: [
            { id: '5', title: 'Office Clean',         description: 'Professional workplace' },
            { id: '6', title: 'Post-Build Clean',     description: 'After construction work' },
            { id: '7', title: 'Airbnb / Short-Let',   description: 'Between-guest turnaround' },
          ],
        },
      ],
    );
  }

  // ── Pricing flow ──────────────────────────────────────────────────────────

  private async handlePricingService(s: WaSession, from: string, msg: string): Promise<void> {
    const service = SERVICE_LABELS[msg];
    if (!service) { await this.wa.sendText(from, `Please select a service from the list.`); return; }
    s.data = { ...s.data, service }; s.state = 'PRICING_SIZE'; await this.save(s);
    await this.sendSizeList(from);
  }

  private async handlePricingSize(s: WaSession, from: string, msg: string): Promise<void> {
    const size = SIZE_LABELS[msg];
    if (!size) { await this.wa.sendText(from, `Please select a size from the list.`); return; }
    s.data = { ...s.data, size }; s.state = 'PRICING_FREQ'; await this.save(s);
    await this.sendFreqList(from);
  }

  private async handlePricingFreq(s: WaSession, from: string, msg: string): Promise<void> {
    const freq = FREQ_LABELS[msg];
    if (!freq) { await this.wa.sendText(from, `Please select a frequency from the list.`); return; }
    s.data = { ...s.data, freq }; s.state = 'PRICING_COND'; await this.save(s);
    await this.sendCondList(from);
  }

  private async handlePricingCond(s: WaSession, from: string, msg: string): Promise<void> {
    const cond = COND_LABELS[msg];
    if (!cond) { await this.wa.sendText(from, `Please select a condition from the list.`); return; }

    const { service, size, freq } = s.data;
    const pricing = await this.settingsService.getPricingConfig();
    const bp = pricing.BASE_PRICES as Record<string, number>;
    const sm = pricing.SIZE_MULT as Record<string, number>;
    const fm = pricing.FREQ_MULT as Record<string, number>;
    const cm = pricing.COND_MULT as Record<string, number>;
    const total = Math.round((bp[service] ?? 80) * (sm[size] ?? 1) * (fm[freq] ?? 1) * (cm[cond] ?? 1));

    s.data = { ...s.data, cond, estimate: total };
    s.state = 'PRICING_DONE';
    await this.save(s);

    await this.wa.sendInteractiveButtons(
      from,
      `🏷️ *Your Estimate*\n\n*${SERVICE_NAMES[service] || service}*\n${SIZE_NAMES[size] || size} · ${FREQ_NAMES[freq] || freq} · ${cond} condition\n\n*Estimated Price: £${total}*\n\n_This is an estimate only. Final price confirmed before booking._`,
      [
        { id: '1', title: 'Get Formal Quote' },
        { id: '5', title: 'Talk to Support' },
        { id: 'menu', title: 'Main Menu' },
      ],
      'Your Price Estimate',
      'thefamgroup.uk',
    );
  }

  private async handlePricingDone(
    s: WaSession, from: string, senderName: string, msg: string,
  ): Promise<void> {
    if (msg === '1') {
      // Pre-fill quote data from pricing flow, skip service/size/freq questions
      s.state = 'QUOTE_NAME'; await this.save(s);
      await this.wa.sendText(from, `📋 *Great! Let's get your formal quote.*\n\n👤 What is your *full name*?`);
    } else if (msg === '5' || msg === 'support') {
      await this.connectToAgent(s, from, senderName);
    } else {
      await this.sendMenu(s, from);
    }
  }

  // ── Quote flow ────────────────────────────────────────────────────────────

  private async handleQuoteService(s: WaSession, from: string, msg: string): Promise<void> {
    const service = SERVICE_LABELS[msg];
    if (!service) { await this.wa.sendText(from, `Please select a service from the list.`); return; }
    s.data = { ...s.data, service }; s.state = 'QUOTE_SIZE'; await this.save(s);
    await this.sendSizeList(from);
  }

  private async handleQuoteSize(s: WaSession, from: string, msg: string): Promise<void> {
    const size = SIZE_LABELS[msg];
    if (!size) { await this.wa.sendText(from, `Please select a size from the list.`); return; }
    s.data = { ...s.data, size }; s.state = 'QUOTE_FREQ'; await this.save(s);
    await this.sendFreqList(from);
  }

  private async handleQuoteFreq(s: WaSession, from: string, msg: string): Promise<void> {
    const freq = FREQ_LABELS[msg];
    if (!freq) { await this.wa.sendText(from, `Please select a frequency from the list.`); return; }
    s.data = { ...s.data, freq }; s.state = 'QUOTE_NAME'; await this.save(s);
    await this.wa.sendText(from, `👤 What is your *full name*?`);
  }

  private async handleQuoteName(s: WaSession, from: string, msg: string): Promise<void> {
    s.data = { ...s.data, name: msg }; s.state = 'QUOTE_EMAIL'; await this.save(s);
    await this.wa.sendText(from, `📧 What is your *email address*?`);
  }

  private async handleQuoteEmail(s: WaSession, from: string, msg: string): Promise<void> {
    if (!msg.includes('@')) {
      await this.wa.sendText(from, `That doesn't look like a valid email. Please try again.`); return;
    }
    s.data = { ...s.data, email: msg }; s.state = 'QUOTE_PHONE'; await this.save(s);
    await this.wa.sendInteractiveButtons(
      from,
      `📞 What is your *contact number*?`,
      [{ id: 'same', title: 'Use This Number' }],
      'Phone Number',
      'Or type your number below',
    );
  }

  private async handleQuotePhone(
    s: WaSession, from: string, senderName: string, msg: string,
  ): Promise<void> {
    const phone = msg === 'same' ? from : msg;
    const { service, size, freq, name, email } = s.data;

    const pricing = await this.settingsService.getPricingConfig();
    const bp = pricing.BASE_PRICES as Record<string, number>;
    const sm = pricing.SIZE_MULT as Record<string, number>;
    const fm = pricing.FREQ_MULT as Record<string, number>;
    const total = s.data.estimate ?? Math.round((bp[service] ?? 80) * (sm[size] ?? 1) * (fm[freq] ?? 1));

    // Create lead in admin
    try {
      await this.leadsService.create({
        name: name || senderName, email, phone,
        source: LeadSource.WHATSAPP,
        serviceInterest: service,
        estimatedValue: total,
        notes: `WhatsApp bot quote\nSize: ${size || 'n/a'} · Freq: ${freq || 'n/a'} · Estimate: £${total}`,
      });
    } catch (err) {
      this.logger.error(`[Bot] Failed to create lead: ${err}`);
    }

    // Create inbox thread
    try {
      const inboxMsg = await this.inboxService.create({
        senderName: name || senderName, senderEmail: email, senderPhone: phone,
        source: MessageSource.WHATSAPP, waFrom: from,
        subject: `WhatsApp Quote Request — ${SERVICE_NAMES[service] || service}`,
        body: `Service: ${SERVICE_NAMES[service] || service}\nSize: ${SIZE_NAMES[size] || size}\nFrequency: ${FREQ_NAMES[freq] || freq}\nEstimate: £${total}\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}`,
      });
      s.inboxMessageId = inboxMsg.id;
    } catch (err) {
      this.logger.error(`[Bot] Failed to create inbox message: ${err}`);
    }

    await this.wa.sendText(
      from,
      `✅ *Quote Request Received!*\n\nThank you, ${name}! 🎉\n\nWe'll review your details and get back to you within *2 hours* with a confirmed quote — and we'll send it directly to this WhatsApp.\n\n📋 *Your Summary:*\n• Service: ${SERVICE_NAMES[service] || service}\n• Size: ${SIZE_NAMES[size] || size || 'n/a'}\n• Frequency: ${FREQ_NAMES[freq] || freq || 'n/a'}\n• Estimate: £${total}\n\n📞 Urgent? Call us: *07767 759 013*\n\nReply *menu* at any time to start over.`,
    );

    await this.reset(s);
  }

  // ── Shared list senders ───────────────────────────────────────────────────

  private async sendSizeList(from: string): Promise<void> {
    await this.wa.sendInteractiveList(
      from,
      `🏠 How big is the property?`,
      'Select size',
      [{
        title: 'Property Size',
        rows: [
          { id: '1', title: 'Studio',       description: 'Up to 35m²' },
          { id: '2', title: '1 Bedroom',    description: 'Up to 55m²' },
          { id: '3', title: '2 Bedrooms',   description: 'Up to 75m²' },
          { id: '4', title: '3 Bedrooms',   description: 'Up to 95m²' },
          { id: '5', title: '4 Bedrooms+',  description: '100m²+' },
        ],
      }],
    );
  }

  private async sendFreqList(from: string): Promise<void> {
    await this.wa.sendInteractiveList(
      from,
      `🔁 How often do you need the service?`,
      'Select frequency',
      [{
        title: 'Frequency',
        rows: [
          { id: '1', title: 'One-Off',        description: 'Single visit' },
          { id: '2', title: 'Weekly',          description: 'Save 20%' },
          { id: '3', title: 'Fortnightly',     description: 'Save 15%' },
          { id: '4', title: 'Monthly',         description: 'Save 10%' },
        ],
      }],
    );
  }

  private async sendCondList(from: string): Promise<void> {
    await this.wa.sendInteractiveList(
      from,
      `🧹 What is the current condition of the property?`,
      'Select condition',
      [{
        title: 'Condition',
        rows: [
          { id: '1', title: 'Light',      description: 'Well maintained' },
          { id: '2', title: 'Average',    description: 'Normal condition' },
          { id: '3', title: 'Heavy',      description: 'Needs extra work' },
          { id: '4', title: 'Very Heavy', description: 'Significant build-up' },
        ],
      }],
    );
  }

  // ── Support / FAQ ─────────────────────────────────────────────────────────

  private async handleSupport(
    s: WaSession, from: string, senderName: string, msg: string,
  ): Promise<void> {
    if (['5', 'support', 'agent', 'human', 'speak', 'rep'].includes(msg)) {
      return this.connectToAgent(s, from, senderName);
    }

    for (const [keywords, answer] of FAQ) {
      if (keywords.some((kw) => msg.includes(kw))) {
        await this.wa.sendInteractiveButtons(
          from,
          `${answer}`,
          [
            { id: '5', title: 'Talk to Support' },
            { id: 'menu', title: 'Main Menu' },
          ],
        );
        return;
      }
    }

    // No FAQ match — escalate
    await this.wa.sendText(from, `🤔 Let me connect you with a customer support rep.\n\n_Please hold on..._`);
    await this.connectToAgent(s, from, senderName);
  }

  private async connectToAgent(s: WaSession, from: string, senderName: string): Promise<void> {
    try {
      const inboxMsg = await this.inboxService.create({
        senderName: senderName || from,
        senderPhone: from,
        source: MessageSource.WHATSAPP,
        waFrom: from,
        subject: `WhatsApp Live Chat — ${senderName || from}`,
        body: `Customer requested to speak with a customer support rep.\n\nWhatsApp: ${from}\nName: ${senderName || 'Unknown'}`,
      });
      s.inboxMessageId = inboxMsg.id;
    } catch (err) {
      this.logger.error(`[Bot] Failed to create agent inbox thread: ${err}`);
    }

    s.state = 'AGENT';
    await this.save(s);

    await this.wa.sendText(
      from,
      `👤 *You're now connected with our customer support team!*\n\nA team member will respond shortly. During business hours, we aim to reply within *15 minutes*.\n\n⏰ Business hours: Mon–Sat 8am–6pm\n\n📞 Urgent? Call: *07767 759 013*\n📧 Email: *info@thefamgroup.uk*`,
    );
  }

  // ── Employee commands ─────────────────────────────────────────────────────

  private async handleEmployeeMessage(
    from: string,
    employee: { id: string; firstName: string; whatsappPhone: string },
    msg: string,
    mediaId?: string,
  ): Promise<void> {
    const acceptMatch = msg.match(/^accept\s+([a-z0-9]+)/i);
    const declineMatch = msg.match(/^decline\s+([a-z0-9]+)/i);
    const doneMatch = msg.match(/^done\s+([a-z0-9]+)/i);

    if (acceptMatch) {
      const ref = acceptMatch[1].toUpperCase();
      const booking = await this.bookingsService.findByShortRef(ref);
      if (!booking) {
        await this.wa.sendText(from, `❌ Job ref *${ref}* not found. Please check and try again.`);
        return;
      }
      await this.bookingsService.updateStatus(booking.id, BookingStatus.CONFIRMED);
      await this.wa.sendText(
        from,
        `✅ *Job ${ref} confirmed!*\n\nThank you, ${employee.firstName}. The job is now booked in for you.\n\nReply *DONE ${ref}* when the job is complete.`,
      );
      return;
    }

    if (declineMatch) {
      const ref = declineMatch[1].toUpperCase();
      const booking = await this.bookingsService.findByShortRef(ref);
      if (!booking) { await this.wa.sendText(from, `❌ Job ref *${ref}* not found.`); return; }
      await this.bookingsService.updateStatus(booking.id, BookingStatus.PENDING);
      await this.bookingsService.clearAssignment(booking.id);
      await this.teamService.incrementJobCancelled(employee.id);
      await this.inboxService.create({
        senderName: `${employee.firstName} (Employee)`,
        senderPhone: from,
        source: MessageSource.WHATSAPP,
        waFrom: from,
        subject: `⚠️ Job ${ref} declined by ${employee.firstName}`,
        body: `Employee ${employee.firstName} has declined job ${ref}. The booking needs to be reassigned.`,
      });
      await this.wa.sendText(from, `OK ${employee.firstName}, job *${ref}* has been declined. Our team has been notified.`);
      return;
    }

    if (doneMatch || (mediaId && msg === '')) {
      const ref = doneMatch ? doneMatch[1].toUpperCase() : null;
      const booking = ref ? await this.bookingsService.findByShortRef(ref) : null;
      if (booking) {
        await this.bookingsService.updateStatus(booking.id, BookingStatus.COMPLETED);
        await this.teamService.incrementJobCompleted(employee.id);
        const photoNote = mediaId ? ` Photo proof received (media ID: ${mediaId}).` : '';
        await this.bookingsService.appendNote(
          booking.id,
          `✅ Marked complete by ${employee.firstName} via WhatsApp.${photoNote}`,
        );
        await this.wa.sendText(
          from,
          `🎉 *Great work, ${employee.firstName}!*\n\nJob *${ref}* has been marked as complete.${mediaId ? '\n📸 Photo received — thank you!' : ''}\n\nHave a great day! 💚`,
        );
      } else {
        await this.wa.sendText(from, `Please reply *DONE [JOB REF]* to mark a job complete. Example: *DONE A1B2C3*`);
      }
      return;
    }

    await this.wa.sendText(
      from,
      `Hi ${employee.firstName}! 👋\n\nAvailable commands:\n• *ACCEPT [ref]* — confirm a job\n• *DECLINE [ref]* — decline a job\n• *DONE [ref]* — mark job complete (attach photo)\n\nFor help call: *07767 759 013*`,
    );
  }
}
