// leads.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LeadStatus } from './entities/lead.entity';

@ApiTags('leads') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('leads')
export class LeadsController {
  constructor(private readonly svc: LeadsService) {}
  @Get() findAll(@Query('status') status?: LeadStatus) { return this.svc.findAll(status); }
  @Get('kanban') getKanban() { return this.svc.getKanban(); }
  @Get('stats') getStats() { return this.svc.getStats(); }
  @Get('by-phone/:phone') findByPhone(@Param('phone') phone: string) { return this.svc.findByPhone(phone); }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateLeadDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(id); }
  @Patch(':id/mark-won') markWon(@Param('id', ParseUUIDPipe) id: string) { return this.svc.markWon(id); }
  @Post(':id/convert-to-booking') convertToBooking(@Param('id', ParseUUIDPipe) id: string) { return this.svc.convertToBooking(id); }
}
