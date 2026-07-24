import { Controller, Get, Post, Patch, Param, Body, Query, Res, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BotService } from './bot.service';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  private readonly verifyToken: string;

  constructor(
    private bot: BotService,
    config: ConfigService,
  ) {
    this.verifyToken = config.get('WHATSAPP_VERIFY_TOKEN', 'tfg_webhook_secret');
  }

  // Meta webhook verification handshake
  @Get('webhook')
  @ApiOperation({ summary: 'Meta webhook verification (GET)' })
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('[WA] Webhook verified');
      res.status(200).send(challenge);
    } else {
      this.logger.warn('[WA] Webhook verification failed');
      res.status(403).send('Forbidden');
    }
  }

  // Incoming WhatsApp messages
  @Post('webhook')
  @ApiOperation({ summary: 'Meta webhook incoming messages (POST)' })
  async receive(@Body() body: any, @Res() res: Response) {
    res.status(200).send('EVENT_RECEIVED'); // must respond 200 immediately

    try {
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0]?.value;
      if (!changes?.messages?.length) return;

      const message = changes.messages[0];
      const contact = changes.contacts?.[0];
      const from: string = message.from;
      const profileName = contact?.profile?.name;
      const senderName: string = (profileName && profileName.trim().length > 1) ? profileName : from;
      const msgType: string = message.type;

      let text = '';
      let mediaId: string | undefined;

      if (msgType === 'text') {
        text = message.text?.body || '';
      } else if (msgType === 'image' || msgType === 'video' || msgType === 'document') {
        mediaId = message.image?.id || message.video?.id || message.document?.id;
        text = message.image?.caption || message.video?.caption || '';
      } else if (msgType === 'button') {
        text = message.button?.payload || message.button?.text || '';
      } else if (msgType === 'interactive') {
        text =
          message.interactive?.button_reply?.id ||
          message.interactive?.list_reply?.id ||
          '';
      }

      if (!from || (!text && !mediaId)) return;

      await this.bot.handleIncoming(from, senderName, msgType, text, mediaId);
    } catch (err) {
      this.logger.error(`[WA] Webhook processing error: ${err}`);
    }
  }

  // Admin: end a live chat session for a customer (JWT protected)
  @Patch('session/:phone/end')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End a live WhatsApp chat session and return customer to bot' })
  endLiveChat(@Param('phone') phone: string) {
    return this.bot.endLiveChat(decodeURIComponent(phone));
  }
}
