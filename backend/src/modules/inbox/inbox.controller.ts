import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseUUIDPipe, Headers, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { InboxService } from './inbox.service';
import { CreateMessageDto, UpdateMessageDto } from './dto/message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MessageStatus } from './entities/message.entity';

class ReplyDto {
  @IsString() text: string;
}

@ApiTags('inbox')
@Controller('inbox')
export class InboxController {
  private readonly internalKey: string;

  constructor(
    private readonly svc: InboxService,
    config: ConfigService,
  ) {
    this.internalKey = config.get('INTERNAL_API_KEY', '');
  }

  // Public: receives messages from the public website (contact/quote forms)
  // Protected by a shared secret header instead of JWT
  @Post('public')
  @ApiOperation({ summary: 'Public: create inbox message (requires x-api-key header)' })
  createPublic(
    @Headers('x-api-key') key: string,
    @Body() dto: CreateMessageDto,
  ) {
    if (!this.internalKey || key !== this.internalKey) {
      throw new ForbiddenException('Invalid API key');
    }
    return this.svc.create(dto);
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List all messages' })
  findAll(@Query('status') status?: MessageStatus) {
    return this.svc.findAll(status);
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  getUnreadCount() {
    return this.svc.getUnreadCount();
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(id);
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateMessageDto) {
    return this.svc.create(dto);
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.svc.update(id, dto);
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.markRead(id);
  }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a WhatsApp conversation from the inbox' })
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyDto,
  ) {
    return this.svc.replyViaWhatsApp(id, dto.text);
  }
}
