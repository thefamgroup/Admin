// settings.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpsertSettingDto, BulkUpsertDto } from './dto/setting.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('settings') @Controller('settings')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  // Public — no auth — used by the public website quote calculator
  @Get('pricing-config')
  @ApiOperation({ summary: 'Public: get calculator pricing config' })
  getPricingConfig() { return this.svc.getPricingConfig(); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all settings, optionally filtered by group' })
  findAll(@Query('group') group?: string) { return this.svc.findAll(group); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Upsert a single setting' })
  upsert(@Body() dto: UpsertSettingDto) { return this.svc.upsert(dto); }

  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  @Post('bulk')
  @ApiOperation({ summary: 'Upsert multiple settings at once' })
  bulkUpsert(@Body() dto: BulkUpsertDto) { return this.svc.bulkUpsert(dto); }
}
