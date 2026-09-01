import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const GQL = 'https://graph.facebook.com/v21.0';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private token: string;
  private phoneNumberId: string;
  private wabaId: string;

  constructor(private config: ConfigService) {
    this.token = config.get('WHATSAPP_TOKEN', '');
    this.phoneNumberId = config.get('WHATSAPP_PHONE_NUMBER_ID', '');
    this.wabaId = config.get('WHATSAPP_WABA_ID', '');
  }

  async onModuleInit() {
    if (this.isConfigured && this.wabaId) {
      await this.subscribeWABA();
    }
  }

  private async subscribeWABA(): Promise<void> {
    try {
      const res = await fetch(`${GQL}/${this.wabaId}/subscribed_apps`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data as any).success) {
        this.logger.log(`[WA] WABA ${this.wabaId} subscribed to app successfully`);
      } else {
        this.logger.warn(`[WA] WABA subscription response: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      this.logger.warn(`[WA] WABA subscription failed: ${err}`);
    }
  }

  get isConfigured() {
    return !!(this.token && this.phoneNumberId);
  }

  // ── Text message ──────────────────────────────────────────────────────

  async sendText(to: string, text: string): Promise<boolean> {
    return this.post(to, { type: 'text', text: { body: text } });
  }

  // ── Interactive: reply buttons (2–3 options) ──────────────────────────

  async sendInteractiveButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
    footer?: string,
  ): Promise<boolean> {
    const interactive: any = {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    };
    if (header) interactive.header = { type: 'text', text: header.slice(0, 60) };
    if (footer) interactive.footer = { text: footer.slice(0, 60) };
    return this.post(to, { type: 'interactive', interactive });
  }

  // ── Interactive: list message (4–10 options) ──────────────────────────

  async sendInteractiveList(
    to: string,
    body: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    header?: string,
    footer?: string,
  ): Promise<boolean> {
    const interactive: any = {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            ...(r.description ? { description: r.description.slice(0, 72) } : {}),
          })),
        })),
      },
    };
    if (header) interactive.header = { type: 'text', text: header.slice(0, 60) };
    if (footer) interactive.footer = { text: footer.slice(0, 60) };
    return this.post(to, { type: 'interactive', interactive });
  }

  // ── Document: upload buffer → get media_id → send ────────────────────

  async sendDocument(
    to: string,
    buffer: Buffer,
    filename: string,
    caption?: string,
  ): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`[WA] No credentials — cannot send document to ${to}`);
      return false;
    }
    try {
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', 'application/pdf');
      form.append('file', new Blob([new Uint8Array(buffer)], { type: 'application/pdf' }), filename);

      const uploadRes = await fetch(`${GQL}/${this.phoneNumberId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: form,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        this.logger.error(`[WA] Media upload failed: ${JSON.stringify(err)}`);
        return false;
      }
      const { id: mediaId } = (await uploadRes.json()) as { id: string };

      return this.post(to, {
        type: 'document',
        document: {
          id: mediaId,
          filename,
          ...(caption ? { caption } : {}),
        },
      });
    } catch (err) {
      this.logger.error(`[WA] Error sending document to ${to}: ${err}`);
      return false;
    }
  }

  // ── Job dispatch (employee notification) ─────────────────────────────

  async sendJobDispatch(
    to: string,
    booking: {
      id: string;
      clientName: string;
      address: string;
      serviceType: string;
      scheduledAt: Date;
      notes?: string;
      price?: number;
    },
  ): Promise<boolean> {
    const shortId = booking.id.split('-')[0].toUpperCase();
    const d = new Date(booking.scheduledAt);
    const dateStr = d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const lines = [
      `🧹 *NEW JOB — thefamgroup*`,
      ``,
      `📋 *Ref:* ${shortId}`,
      `🔧 *Service:* ${booking.serviceType.replace(/_/g, ' ')}`,
      `👤 *Client:* ${booking.clientName}`,
      `📍 *Address:* ${booking.address}`,
      `📅 *Date:* ${dateStr} at ${timeStr}`,
      booking.price ? `💷 *Price:* £${booking.price}` : null,
      booking.notes ? `📝 *Notes:* ${booking.notes}` : null,
      ``,
      `Reply to this message:`,
      `✅ *ACCEPT ${shortId}* — to confirm this job`,
      `❌ *DECLINE ${shortId}* — if you cannot attend`,
      `✔️ *DONE ${shortId}* — when job is complete (attach photo)`,
    ]
      .filter((l) => l !== null)
      .join('\n');

    return this.sendText(to, lines);
  }

  // ── Core POST helper ──────────────────────────────────────────────────

  private async post(to: string, payload: Record<string, any>): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`[WA] No credentials — would send ${payload.type} to ${to}`);
      return false;
    }
    try {
      const res = await fetch(`${GQL}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, ...payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this.logger.error(`[WA] Send failed to ${to}: ${JSON.stringify(err)}`);
        return false;
      }
      this.logger.log(`[WA] Sent ${payload.type} to ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`[WA] Network error sending to ${to}: ${err}`);
      return false;
    }
  }
}
