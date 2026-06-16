// inbox.controller.ts
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InboxService } from './inbox.service';
import { CreateMessageDto, UpdateMessageDto } from './dto/message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MessageStatus } from './entities/message.entity';

@ApiTags('inbox') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('inbox')
export class InboxController {
  constructor(private readonly svc: InboxService) {}
  @Get() findAll(@Query('status') status?: MessageStatus) { return this.svc.findAll(status); }
  @Get('unread-count') getUnreadCount() { return this.svc.getUnreadCount(); }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateMessageDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMessageDto) { return this.svc.update(id, dto); }
  @Patch(':id/read') markRead(@Param('id', ParseUUIDPipe) id: string) { return this.svc.markRead(id); }
}
