// team.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TeamService } from './team.service';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from './dto/team-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MemberStatus } from './entities/team-member.entity';

@ApiTags('team') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('team')
export class TeamController {
  constructor(private readonly svc: TeamService) {}
  @Get() findAll(@Query('status') status?: MemberStatus) { return this.svc.findAll(status); }
  @Get('stats') getStats() { return this.svc.getStats(); }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateTeamMemberDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeamMemberDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(id); }
}
