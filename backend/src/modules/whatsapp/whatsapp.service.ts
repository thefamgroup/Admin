import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private token: string;
  private phoneNumberId: string;

  constructor(private config: ConfigService) {
    this.token = config.get('WHATSAPP_TOKEN', '');
    this.phoneNumberId = config.get('WHATSAPP_PHONE_NUMBER_ID', '');
  }

  get isConfigured() {
    return !!(this.token && this.phoneNumberId);
  }

  async sendText(to: string, text: string): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`[WA] No credentials — would send to ${to}: ${text.substring(0, 80)}`);
      return false;
    }
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text },
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this.logger.error(`[WA] Send failed to ${to}: ${JSON.stringify(err)}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`[WA] Network error sending to ${to}: ${err}`);
      return false;
    }
  }

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
}
