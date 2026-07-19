// bookings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, FindOptionsWhere } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto, UpdateBookingDto, BookingQueryDto } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly repo: Repository<Booking>,
  ) {}

  async findAll(query: BookingQueryDto) {
    const { status, from, to, search, page = 1, limit = 20 } = query;
    const where: FindOptionsWhere<Booking> = {};

    if (status) where.status = status;
    if (search) where.clientName = Like(`%${search}%`);
    if (from && to) where.scheduledAt = Between(new Date(from), new Date(to));

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { scheduledAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  findByPhone(phone: string) {
    const clean = phone.replace(/\D/g, '');
    return this.repo.find({
      where: { clientPhone: Like(`%${clean}`) },
      order: { scheduledAt: 'DESC' },
      take: 10,
    });
  }

  async findOne(id: string) {
    const booking = await this.repo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async create(dto: CreateBookingDto) {
    const booking = this.repo.create(dto);
    return this.repo.save(booking);
  }

  async update(id: string, dto: UpdateBookingDto) {
    const booking = await this.findOne(id);
    Object.assign(booking, dto);
    return this.repo.save(booking);
  }

  async remove(id: string) {
    const booking = await this.findOne(id);
    return this.repo.remove(booking);
  }

  async getCalendar(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);
    return this.repo.find({
      where: { scheduledAt: Between(start, end) },
      order: { scheduledAt: 'ASC' },
      select: ['id', 'clientName', 'serviceType', 'status', 'scheduledAt', 'price'],
    });
  }

  // Find booking by first 6 chars of UUID (short ref shown in WhatsApp dispatch)
  findByShortRef(shortRef: string) {
    return this.repo
      .createQueryBuilder('b')
      .where('UPPER(LEFT(REPLACE(b.id, \'-\', \'\'), 6)) = :ref', { ref: shortRef.toUpperCase() })
      .getOne();
  }

  async updateStatus(id: string, status: BookingStatus) {
    await this.repo.update(id, { status });
  }

  async clearAssignment(id: string) {
    await this.repo.update(id, { assignedEmployeeId: undefined, assignedTo: undefined });
  }

  async appendNote(id: string, note: string) {
    const b = await this.findOne(id);
    b.notes = b.notes ? `${b.notes}\n${note}` : note;
    await this.repo.save(b);
  }

  async getStats() {
    const total     = await this.repo.count();
    const pending   = await this.repo.count({ where: { status: BookingStatus.PENDING } });
    const confirmed = await this.repo.count({ where: { status: BookingStatus.CONFIRMED } });
    const completed = await this.repo.count({ where: { status: BookingStatus.COMPLETED } });
    return { total, pending, confirmed, completed };
  }
}
