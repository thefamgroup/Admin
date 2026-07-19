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

const SERVICE_LABELS: Record<string, string> = {
  '1': 'regular',
  '2': 'deep',
  '3': 'eot',
  '4': 'moveout',
  '5': 'office',
  '6': 'postconstruction',
  '7': 'airbnb',
};

const SIZE_LABELS: Record<string, string> = {
  '1': 'studio',
  '2': '1bed',
  '3': '2bed',
  '4': '3bed',
  '5': '4bed',
};

const FREQ_LABELS: Record<string, string> = {
  '1': 'one-off',
  '2': 'weekly',
  '3': 'fortnightly',
  '4': 'monthly',
};

const COND_LABELS: Record<string, string> = {
  '1': 'light',
  '2': 'average',
  '3': 'heavy',
  '4': 'very-heavy',
};

const MENU_TEXT = `👋 Hi! I'm the *thefamgroup* assistant.

What can I help you with today?

1️⃣ Get an instant price estimate
2️⃣ Request a quote
3️⃣ Make a booking
4️⃣ FAQ & Support
5️⃣ Talk to a human agent

Reply with a number (1-5)`;

const FAQ: Array<[string[], string]> = [
  [
    ['area', 'cover', 'location', 'manchester', 'crewe'],
    `📍 We cover *Manchester & Crewe* and surrounding areas. Message us with your postcode and we'll confirm availability.`,
  ],
  [
    ['price', 'cost', 'charge', 'how much', 'rate'],
    `💷 Our prices start from *£60* for a regular home clean.\n\nReply *1* for an instant personalised estimate, or *2* to request a quote.`,
  ],
  [
    ['book', 'booking', 'schedule', 'appoint'],
    `📅 To book, reply *3* and we'll collect your details.\n\nOr call us on *07767 759 013*.`,
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
    `✨ We offer add-on services including oven clean, fridge clean, window cleaning, carpet & upholstery cleaning and more.\n\nReply *1* for pricing that includes add-ons.`,
  ],
  [
    ['eot', 'end of tenanc', 'deposit', 'landlord'],
    `🔑 Our *End of Tenancy* clean is designed to help you get your deposit back. We clean to agency standards.\n\nReply *2* to get a quote.`,
  ],
];

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

  private async getSession(phone: string): Promise<WaSession> {
    let session = await this.sessionRepo.findOne({ where: { phone } });
    if (!session) {
      session = this.sessionRepo.create({ phone, state: 'IDLE', data: {} });
      await this.sessionRepo.save(session);
    }
    return session;
  }

  private async saveSession(session: WaSession): Promise<void> {
    await this.sessionRepo.save(session);
  }

  private async resetSession(session: WaSession): Promise<void> {
    session.state = 'IDLE';
    session.data = {};
    session.inboxMessageId = null;
    session.activeJobRef = null;
    await this.sessionRepo.save(session);
  }

  async handleIncoming(
    from: string,
    senderName: string,
    messageType: string,
    text: string,
    mediaId?: string,
  ): Promise<void> {
    const msg = (text || '').trim().toLowerCase();
    this.logger.log(`[Bot] ← ${from} (${senderName}): "${msg}" [state will be resolved]`);

    // Check if sender is a registered employee
    const employee = await this.teamService.findByWhatsApp(from);
    if (employee) {
      await this.handleEmployeeMessage(from, employee, msg, mediaId);
      return;
    }

    const session = await this.getSession(from);
    this.logger.log(`[Bot] Session state for ${from}: ${session.state}`);

    // Global escape: always allow reset keywords regardless of state
    if (['menu', 'hi', 'hello', 'hey', 'start', 'help', 'reset'].includes(msg)) {
      await this.sendMenu(session, from);
      return;
    }

    // If agent is handling this conversation, store the message in the inbox thread
    if (session.state === 'AGENT') {
      if (session.inboxMessageId) {
        await this.inboxService.appendToThread(
          session.inboxMessageId,
          `[Customer]: ${text}`,
        );
      }
      return;
    }

    // Route to correct state handler
    await this.routeState(session, from, senderName, msg, messageType, mediaId);
  }

  private async routeState(
    session: WaSession,
    from: string,
    senderName: string,
    msg: string,
    messageType: string,
    mediaId?: string,
  ): Promise<void> {
    const state = session.state;

    // Global: "menu" or "hi/hello/hey" always returns to menu
    if (['menu', 'hi', 'hello', 'hey', 'start', 'help'].includes(msg)) {
      await this.sendMenu(session, from);
      return;
    }

    switch (state) {
      case 'IDLE':
        await this.sendMenu(session, from);
        break;

      case 'MENU':
        await this.handleMenuChoice(session, from, senderName, msg);
        break;

      case 'PRICING_SERVICE':
        await this.handlePricingService(session, from, msg);
        break;
      case 'PRICING_SIZE':
        await this.handlePricingSize(session, from, msg);
        break;
      case 'PRICING_FREQ':
        await this.handlePricingFreq(session, from, msg);
        break;
      case 'PRICING_COND':
        await this.handlePricingCond(session, from, msg);
        break;

      case 'QUOTE_SERVICE':
        await this.handleQuoteService(session, from, msg);
        break;
      case 'QUOTE_SIZE':
        await this.handleQuoteSize(session, from, msg);
        break;
      case 'QUOTE_FREQ':
        await this.handleQuoteFreq(session, from, msg);
        break;
      case 'QUOTE_NAME':
        await this.handleQuoteName(session, from, msg);
        break;
      case 'QUOTE_EMAIL':
        await this.handleQuoteEmail(session, from, msg);
        break;
      case 'QUOTE_PHONE':
        await this.handleQuotePhone(session, from, senderName, msg);
        break;

      case 'SUPPORT':
        await this.handleSupport(session, from, senderName, msg);
        break;

      default:
        await this.sendMenu(session, from);
    }
  }

  private async sendMenu(session: WaSession, from: string): Promise<void> {
    session.state = 'MENU';
    session.data = {};
    await this.saveSession(session);
    await this.wa.sendText(from, MENU_TEXT);
  }

  private async handleMenuChoice(
    session: WaSession,
    from: string,
    senderName: string,
    msg: string,
  ): Promise<void> {
    switch (msg) {
      case '1':
        session.state = 'PRICING_SERVICE';
        session.data = {};
        await this.saveSession(session);
        await this.wa.sendText(
          from,
          `💡 *Instant Price Estimate*\n\nWhat type of cleaning do you need?\n\n1️⃣ Regular Home Clean\n2️⃣ Deep Clean\n3️⃣ End of Tenancy\n4️⃣ Move In / Out\n5️⃣ Office Clean\n6️⃣ Post-Build / Construction\n7️⃣ Airbnb / Short-Let`,
        );
        break;

      case '2':
        session.state = 'QUOTE_SERVICE';
        session.data = {};
        await this.saveSession(session);
        await this.wa.sendText(
          from,
          `📋 *Quote Request*\n\nWhat type of service do you need?\n\n1️⃣ Regular Home Clean\n2️⃣ Deep Clean\n3️⃣ End of Tenancy\n4️⃣ Move In / Out\n5️⃣ Office Clean\n6️⃣ Post-Build / Construction\n7️⃣ Airbnb / Short-Let`,
        );
        break;

      case '3':
        // Direct to contact for booking
        await this.wa.sendText(
          from,
          `📅 *Make a Booking*\n\nTo complete your booking, please:\n\n📞 Call us: *07767 759 013*\n📧 Email: *info@thefamgroup.uk*\n🌐 Website: *www.thefamgroup.uk/quote*\n\nOur team will confirm your booking and send you a receipt.\n\nReply *menu* to go back.`,
        );
        break;

      case '4':
        session.state = 'SUPPORT';
        await this.saveSession(session);
        await this.wa.sendText(
          from,
          `🙋 *FAQ & Support*\n\nAsk me anything! For example:\n• What areas do you cover?\n• How much does a deep clean cost?\n• Are your cleaners DBS checked?\n• Can I cancel my booking?\n\nOr reply *5* to speak to a human agent.`,
        );
        break;

      case '5':
        await this.connectToAgent(session, from, senderName);
        break;

      default:
        await this.wa.sendText(
          from,
          `Please reply with a number between 1 and 5.\n\n${MENU_TEXT}`,
        );
    }
  }

  // ── Pricing flow ────────────────────────────────────────────────────

  private async handlePricingService(
    session: WaSession,
    from: string,
    msg: string,
  ): Promise<void> {
    const service = SERVICE_LABELS[msg];
    if (!service) {
      await this.wa.sendText(from, `Please reply with a number 1–7.`);
      return;
    }
    session.data = { ...session.data, service };
    session.state = 'PRICING_SIZE';
    await this.saveSession(session);
    await this.wa.sendText(
      from,
      `🏠 *Property Size*\n\n1️⃣ Studio\n2️⃣ 1 Bedroom\n3️⃣ 2 Bedrooms\n4️⃣ 3 Bedrooms\n5️⃣ 4 Bedrooms+`,
    );
  }

  private async handlePricingSize(
    session: WaSession,
    from: string,
    msg: string,
  ): Promise<void> {
    const size = SIZE_LABELS[msg];
    if (!size) {
      await this.wa.sendText(from, `Please reply with a number 1–5.`);
      return;
    }
    session.data = { ...session.data, size };
    session.state = 'PRICING_FREQ';
    await this.saveSession(session);
    await this.wa.sendText(
      from,
      `🔁 *How often?*\n\n1️⃣ One-Off\n2️⃣ Weekly (20% off)\n3️⃣ Fortnightly (15% off)\n4️⃣ Monthly (10% off)`,
    );
  }

  private async handlePricingFreq(
    session: WaSession,
    from: string,
    msg: string,
  ): Promise<void> {
    const freq = FREQ_LABELS[msg];
    if (!freq) {
      await this.wa.sendText(from, `Please reply with a number 1–4.`);
      return;
    }
    session.data = { ...session.data, freq };
    session.state = 'PRICING_COND';
    await this.saveSession(session);
    await this.wa.sendText(
      from,
      `🧹 *Current condition of the property?*\n\n1️⃣ Light (well maintained)\n2️⃣ Average (normal condition)\n3️⃣ Heavy (needs extra work)\n4️⃣ Very Heavy (significant build-up)`,
    );
  }

  private async handlePricingCond(
    session: WaSession,
    from: string,
    msg: string,
  ): Promise<void> {
    const cond = COND_LABELS[msg];
    if (!cond) {
      await this.wa.sendText(from, `Please reply with a number 1–4.`);
      return;
    }

    const { service, size, freq } = session.data;
    const pricing = await this.settingsService.getPricingConfig();
    const bp = pricing.BASE_PRICES as Record<string, number>;
    const sm = pricing.SIZE_MULT as Record<string, number>;
    const fm = pricing.FREQ_MULT as Record<string, number>;
    const cm = pricing.COND_MULT as Record<string, number>;

    const base = bp[service] ?? 80;
    const sizeM = sm[size] ?? 1;
    const freqM = fm[freq] ?? 1;
    const condM = cm[cond] ?? 1;
    const total = Math.round(base * sizeM * freqM * condM);

    const serviceNames: Record<string, string> = {
      regular: 'Regular Home Clean',
      deep: 'Deep Clean',
      eot: 'End of Tenancy',
      moveout: 'Move In / Out',
      office: 'Office Clean',
      postconstruction: 'Post-Build / Construction',
      airbnb: 'Airbnb / Short-Let',
    };

    await this.wa.sendText(
      from,
      `💷 *Your Estimate*\n\n*${serviceNames[service] || service}*\n${size} · ${freq} · ${cond} condition\n\n*Estimated Price: £${total}*\n\n_This is an estimate only. Final price confirmed before booking._\n\nWould you like to:\n*1* — Request a formal quote\n*2* — Speak to our team\n*menu* — Back to main menu`,
    );

    session.state = 'MENU';
    session.data = {};
    await this.saveSession(session);
  }

  // ── Quote flow ──────────────────────────────────────────────────────

  private async handleQuoteService(
    session: WaSession,
    from: string,
    msg: string,
  ): Promise<void> {
    const service = SERVICE_LABELS[msg];
    if (!service) {
      await this.wa.sendText(from, `Please reply with a number 1–7.`);
      return;
    }
    session.data = { ...session.data, service };
    session.state = 'QUOTE_SIZE';
    await this.saveSession(session);
    await this.wa.sendText(
      from,
      `🏠 *Property Size*\n\n1️⃣ Studio\n2️⃣ 1 Bedroom\n3️⃣ 2 Bedrooms\n4️⃣ 3 Bedrooms\n5️⃣ 4 Bedrooms+`,
    );
  }

  private async handleQuoteSize(
    session: WaSession,
    from: string,
    msg: string,
  ): Promise<void> {
    const size = SIZE_LABELS[msg];
    if (!size) {
      await this.wa.sendText(from, `Please reply with a number 1–5.`);
      return;
    }
    session.data = { ...session.data, size };
    session.state = 'QUOTE_FREQ';
    await this.saveSession(session);
    await this.wa.sendText(
      from,
      `🔁 *How often?*\n\n1️⃣ One-Off\n2️⃣ Weekly\n3️⃣ Fortnightly\n4️⃣ Monthly`,
    );
  }

  private async handleQuoteFreq(
    session: WaSession,
    from: string,
    msg: string,
  ): Promise<void> {
    const freq = FREQ_LABELS[msg];
    if (!freq) {
      await this.wa.sendText(from, `Please reply with a number 1–4.`);
      return;
    }
    session.data = { ...session.data, freq };
    session.state = 'QUOTE_NAME';
    await this.saveSession(session);
    await this.wa.sendText(from, `👤 What is your *full name*?`);
  }

  private async handleQuoteName(
    session: WaSession,
    from: string,
    msg: string,
  ): Promise<void> {
    session.data = { ...session.data, name: msg };
    session.state = 'QUOTE_EMAIL';
    await this.saveSession(session);
    await this.wa.sendText(from, `📧 What is your *email address*?`);
  }

  private async handleQuoteEmail(
    session: WaSession,
    from: string,
    msg: string,
  ): Promise<void> {
    if (!msg.includes('@')) {
      await this.wa.sendText(from, `That doesn't look like a valid email. Please try again.`);
      return;
    }
    session.data = { ...session.data, email: msg };
    session.state = 'QUOTE_PHONE';
    await this.saveSession(session);
    await this.wa.sendText(
      from,
      `📞 What is your *phone number*? (Or reply *same* to use this WhatsApp number)`,
    );
  }

  private async handleQuotePhone(
    session: WaSession,
    from: string,
    senderName: string,
    msg: string,
  ): Promise<void> {
    const phone = msg === 'same' ? from : msg;
    const { service, size, freq, name, email } = session.data;

    const pricing = await this.settingsService.getPricingConfig();
    const bp2 = pricing.BASE_PRICES as Record<string, number>;
    const sm2 = pricing.SIZE_MULT as Record<string, number>;
    const fm2 = pricing.FREQ_MULT as Record<string, number>;
    const base = bp2[service] ?? 80;
    const sizeM = sm2[size] ?? 1;
    const freqM = fm2[freq] ?? 1;
    const total = Math.round(base * sizeM * freqM);

    // Create lead
    try {
      await this.leadsService.create({
        name: name || senderName,
        email,
        phone,
        source: LeadSource.WHATSAPP,
        serviceInterest: service,
        estimatedValue: total,
        notes: `WhatsApp bot quote request\nSize: ${size} · Frequency: ${freq} · Estimate: £${total}`,
      });
    } catch (err) {
      this.logger.error(`[Bot] Failed to create lead: ${err}`);
    }

    // Create inbox message
    try {
      const inboxMsg = await this.inboxService.create({
        senderName: name || senderName,
        senderEmail: email,
        senderPhone: phone,
        source: MessageSource.WHATSAPP,
        waFrom: from,
        subject: `WhatsApp Quote Request — ${service} · ${size} · ${freq}`,
        body: `Service: ${service}\nSize: ${size}\nFrequency: ${freq}\nEstimate: £${total}\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}`,
      });
      session.inboxMessageId = inboxMsg.id;
    } catch (err) {
      this.logger.error(`[Bot] Failed to create inbox message: ${err}`);
    }

    await this.wa.sendText(
      from,
      `✅ *Quote Request Received!*\n\nThank you, ${name}!\n\nWe'll review your request and get back to you within *2 hours* with a confirmed quote.\n\n📋 *Summary:*\nService: ${service}\nSize: ${size}\nFrequency: ${freq}\nEstimate: £${total}\n\n📞 For urgent enquiries: *07767 759 013*\n\nReply *menu* at any time to start over.`,
    );

    await this.resetSession(session);
  }

  // ── Support / FAQ flow ───────────────────────────────────────────────

  private async handleSupport(
    session: WaSession,
    from: string,
    senderName: string,
    msg: string,
  ): Promise<void> {
    if (msg === '5' || msg === 'agent' || msg === 'human' || msg === 'speak') {
      await this.connectToAgent(session, from, senderName);
      return;
    }

    for (const [keywords, answer] of FAQ) {
      if (keywords.some((kw) => msg.includes(kw))) {
        await this.wa.sendText(
          from,
          `${answer}\n\n_Reply *menu* for more options or *5* to speak to a person._`,
        );
        return;
      }
    }

    // No FAQ match — escalate to agent
    await this.wa.sendText(
      from,
      `🤔 I'm not sure I can answer that one. Let me connect you with a member of our team.\n\n_Please hold on..._`,
    );
    await this.connectToAgent(session, from, senderName);
  }

  private async connectToAgent(
    session: WaSession,
    from: string,
    senderName: string,
  ): Promise<void> {
    try {
      const inboxMsg = await this.inboxService.create({
        senderName: senderName || from,
        senderPhone: from,
        source: MessageSource.WHATSAPP,
        waFrom: from,
        subject: `WhatsApp Live Chat — ${senderName || from}`,
        body: `Customer requested to speak with an agent via WhatsApp.\n\nWhatsApp: ${from}\nName: ${senderName || 'Unknown'}`,
      });
      session.inboxMessageId = inboxMsg.id;
    } catch (err) {
      this.logger.error(`[Bot] Failed to create agent inbox thread: ${err}`);
    }

    session.state = 'AGENT';
    await this.saveSession(session);

    await this.wa.sendText(
      from,
      `🙋 *You're now connected with our team!*\n\nA member of staff will respond shortly. During business hours, we aim to reply within 15 minutes.\n\n⏰ Business hours: Mon–Sat 8am–6pm\n\nIn the meantime, you can also:\n📞 Call: *07767 759 013*\n📧 Email: *info@thefamgroup.uk*`,
    );
  }

  // ── Employee command handling ─────────────────────────────────────────

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
      if (!booking) {
        await this.wa.sendText(from, `❌ Job ref *${ref}* not found.`);
        return;
      }
      await this.bookingsService.updateStatus(booking.id, BookingStatus.PENDING);
      await this.bookingsService.clearAssignment(booking.id);
      await this.teamService.incrementJobCancelled(employee.id);
      // Create inbox alert for admin
      await this.inboxService.create({
        senderName: `${employee.firstName} (Employee)`,
        senderPhone: from,
        source: MessageSource.WHATSAPP,
        waFrom: from,
        subject: `⚠️ Job ${ref} declined by ${employee.firstName}`,
        body: `Employee ${employee.firstName} has declined job ${ref}. The booking needs to be reassigned.`,
      });
      await this.wa.sendText(
        from,
        `OK ${employee.firstName}, job *${ref}* has been declined. Our team has been notified.`,
      );
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
        await this.wa.sendText(
          from,
          `Please reply *DONE [JOB REF]* to mark a job complete. Example: *DONE A1B2C3*`,
        );
      }
      return;
    }

    // Unknown command from employee
    await this.wa.sendText(
      from,
      `Hi ${employee.firstName}! 👋\n\nAvailable commands:\n• *ACCEPT [ref]* — confirm a job\n• *DECLINE [ref]* — decline a job\n• *DONE [ref]* — mark job complete (attach photo)\n\nFor help call: *07767 759 013*`,
    );
  }
}
