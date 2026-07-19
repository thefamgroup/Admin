import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import { Quote, QuoteStatus } from './entities/quote.entity';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);
  constructor(
    @InjectRepository(Quote) private repo: Repository<Quote>,
    private wa: WhatsAppService,
  ) {}

  findAll(status?: QuoteStatus) {
    return this.repo.find({ where: status ? { status } : {}, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const q = await this.repo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Quote not found');
    return q;
  }

  create(dto: CreateQuoteDto) { return this.repo.save(this.repo.create(dto)); }

  async update(id: string, dto: UpdateQuoteDto) {
    const q = await this.findOne(id);
    if (dto.status === QuoteStatus.PAID && !q.paidAt) (q as any).paidAt = new Date();
    if (dto.status === QuoteStatus.SENT && !q.sentAt) (q as any).sentAt = new Date();
    Object.assign(q, dto);
    return this.repo.save(q);
  }

  async remove(id: string) { return this.repo.remove(await this.findOne(id)); }

  // ── PDF generation ────────────────────────────────────────────────────────

  generatePdfBuffer(q: Quote): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const green = '#3a7d44';
      const grey  = '#666666';
      const shortId = q.id.split('-')[0].toUpperCase();

      // Header bar
      doc.rect(0, 0, doc.page.width, 80).fill(green);
      doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
        .text('thefamgroup', 50, 25);
      doc.fontSize(10).font('Helvetica')
        .text('Professional Cleaning Services', 50, 52);
      doc.fillColor('white').fontSize(10)
        .text('info@thefamgroup.uk  |  07769 240 184  |  thefamgroup.uk', 0, 60, { align: 'right' });

      doc.moveDown(4);

      // Title + quote ref
      doc.fillColor(green).fontSize(18).font('Helvetica-Bold').text('QUOTE', 50, 100);
      doc.fillColor(grey).fontSize(10).font('Helvetica')
        .text(`Ref: TFG-${shortId}`, 50, 125)
        .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 50, 140);

      // Client details
      doc.fillColor('#111111').fontSize(12).font('Helvetica-Bold').text('Prepared for:', 50, 175);
      doc.fontSize(10).font('Helvetica').fillColor('#333333')
        .text(q.clientName, 50, 195)
        .text(q.clientEmail || '', 50, 210)
        .text(q.clientPhone || '', 50, 225);

      // Divider
      doc.moveTo(50, 255).lineTo(545, 255).strokeColor(green).lineWidth(2).stroke();

      // Services table header
      doc.fillColor(green).fontSize(10).font('Helvetica-Bold')
        .text('SERVICE', 50, 270)
        .text('DETAILS', 200, 270)
        .text('AMOUNT', 460, 270, { align: 'right' });

      doc.moveTo(50, 285).lineTo(545, 285).strokeColor('#dddddd').lineWidth(1).stroke();

      // Service row
      doc.fillColor('#222222').fontSize(10).font('Helvetica')
        .text(q.serviceType.replace(/_/g, ' '), 50, 298)
        .text(q.propertySize || '—', 200, 298)
        .text(`£${Number(q.subtotal).toFixed(2)}`, 460, 298, { align: 'right' });

      // Add-ons
      let y = 320;
      if (q.addons && q.addons.length > 0) {
        q.addons.forEach((a) => {
          doc.text(a.name, 50, y).text(`£${Number(a.price).toFixed(2)}`, 460, y, { align: 'right' });
          y += 18;
        });
      }

      // Total
      doc.moveTo(50, y + 10).lineTo(545, y + 10).strokeColor('#dddddd').lineWidth(1).stroke();
      doc.fillColor(green).fontSize(13).font('Helvetica-Bold')
        .text('TOTAL', 50, y + 25)
        .text(`£${Number(q.total).toFixed(2)}`, 460, y + 25, { align: 'right' });

      // Notes
      if (q.notes) {
        doc.fillColor(grey).fontSize(9).font('Helvetica')
          .text('Notes:', 50, y + 55)
          .text(q.notes, 50, y + 70, { width: 495 });
      }

      // Footer
      const footerY = doc.page.height - 80;
      doc.rect(0, footerY, doc.page.width, 80).fill('#f5f5f0');
      doc.fillColor(grey).fontSize(8).font('Helvetica')
        .text('This quote is valid for 30 days. Payment is due upon booking confirmation.', 50, footerY + 15, { align: 'center' })
        .text('thefamgroup  ·  Family. Community. Care.', 50, footerY + 30, { align: 'center' })
        .text('info@thefamgroup.uk  |  07769 240 184  |  Manchester & Crewe', 50, footerY + 45, { align: 'center' });

      doc.end();
    });
  }

  async sendViaWhatsApp(id: string): Promise<{ sent: boolean }> {
    const q = await this.findOne(id);
    const phone = (q.clientPhone || '').replace(/\D/g, '');
    if (!phone) {
      this.logger.warn(`[Quotes] No phone on quote ${id} — cannot send via WhatsApp`);
      return { sent: false };
    }
    try {
      const buffer = await this.generatePdfBuffer(q);
      const shortId = q.id.split('-')[0].toUpperCase();
      const caption = `Hi ${q.clientName}! 👋\n\nPlease find your quote from *thefamgroup* attached.\n\n*Ref:* TFG-${shortId}\n*Service:* ${q.serviceType.replace(/_/g, ' ')}\n*Total:* £${Number(q.total).toFixed(2)}\n\nReply to this message to confirm your booking or ask any questions.\n\n📞 07769 240 184  |  info@thefamgroup.uk`;
      const sent = await this.wa.sendDocument(phone, buffer, `TFG-Quote-${shortId}.pdf`, caption);
      if (sent) {
        await this.update(id, { status: QuoteStatus.SENT });
      }
      return { sent };
    } catch (err) {
      this.logger.error(`[Quotes] Failed to send PDF via WhatsApp: ${err}`);
      return { sent: false };
    }
  }

  async getStats() {
    const [total, paid, pending, overdue] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: QuoteStatus.PAID } }),
      this.repo.count({ where: { status: QuoteStatus.SENT } }),
      this.repo.count({ where: { status: QuoteStatus.OVERDUE } }),
    ]);
    const revenue = await this.repo
      .createQueryBuilder('q').select('SUM(q.total)', 'sum')
      .where('q.status = :s', { s: QuoteStatus.PAID }).getRawOne();
    return { total, paid, pending, overdue, totalRevenue: Number(revenue?.sum ?? 0) };
  }
}
