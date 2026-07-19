import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { QuoteStatus } from './entities/quote.entity';

@ApiTags('quotes') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('quotes')
export class QuotesController {
  constructor(private readonly svc: QuotesService) {}
  @Get() findAll(@Query('status') status?: QuoteStatus) { return this.svc.findAll(status); }
  @Get('stats') getStats() { return this.svc.getStats(); }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateQuoteDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuoteDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(id); }
  @Post(':id/send-whatsapp') sendWhatsApp(@Param('id', ParseUUIDPipe) id: string) { return this.svc.sendViaWhatsApp(id); }
}
