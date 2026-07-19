import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto, BookingQueryDto } from './dto/booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all bookings with filters + pagination' })
  findAll(@Query() query: BookingQueryDto) {
    return this.service.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Booking status counts for dashboard' })
  getStats() { return this.service.getStats(); }

  @Get('by-phone/:phone')
  findByPhone(@Param('phone') phone: string) { return this.service.findByPhone(phone); }

  @Get('calendar')
  @ApiOperation({ summary: 'Get bookings for a given month' })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'month', required: true })
  getCalendar(@Query('year') year: number, @Query('month') month: number) {
    return this.service.getCalendar(Number(year), Number(month));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new booking' })
  create(@Body() dto: CreateBookingDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBookingDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post(':id/dispatch/:employeeId')
  @ApiOperation({ summary: 'Send WhatsApp job notification to an employee' })
  dispatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.service.dispatchToEmployee(id, employeeId);
  }
}
