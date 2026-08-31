import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as webpush from 'web-push';

interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  [key: string]: unknown;
}

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class InboxGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(InboxGateway.name);
  private readonly vapidPublicKey: string;
  private pushSubs: PushSub[] = [];

  constructor(config: ConfigService) {
    this.vapidPublicKey = config.get<string>('VAPID_PUBLIC_KEY', '');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY', '');
    const subject = config.get<string>(
      'VAPID_SUBJECT',
      'mailto:thefamgrouphq@gmail.com',
    );
    if (this.vapidPublicKey && privateKey) {
      webpush.setVapidDetails(subject, this.vapidPublicKey, privateKey);
      this.logger.log('[WS] VAPID keys loaded — web push enabled');
    }
  }

  afterInit() {
    this.logger.log('[WS] Inbox gateway ready');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`[WS] connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`[WS] disconnected: ${client.id}`);
  }

  /** Broadcast a lightweight ping — frontend will re-fetch the list */
  ping() {
    this.server?.emit('inbox:ping');
  }

  getVapidPublicKey() {
    return this.vapidPublicKey;
  }

  addPushSubscription(sub: PushSub) {
    const exists = this.pushSubs.some((s) => s.endpoint === sub.endpoint);
    if (!exists) this.pushSubs.push(sub);
    this.logger.log(`[Push] subscription stored (total: ${this.pushSubs.length})`);
  }

  async sendPush(title: string, body: string): Promise<void> {
    if (!this.vapidPublicKey || this.pushSubs.length === 0) return;
    const payload = JSON.stringify({ title, body });
    const stale: string[] = [];
    for (const sub of this.pushSubs) {
      try {
        await webpush.sendNotification(sub as webpush.PushSubscription, payload);
      } catch {
        stale.push(sub.endpoint);
      }
    }
    if (stale.length) {
      this.pushSubs = this.pushSubs.filter((s) => !stale.includes(s.endpoint));
      this.logger.warn(`[Push] removed ${stale.length} expired subscription(s)`);
    }
  }
}
