// team.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMember, MemberStatus } from './entities/team-member.entity';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from './dto/team-member.dto';

const UK_NMW = 11.44; // NMW 2024 — update annually

@Injectable()
export class TeamService {
  constructor(@InjectRepository(TeamMember) private repo: Repository<TeamMember>) {}

  findAll(status?: MemberStatus) {
    return this.repo.find({ where: status ? { status } : {}, order: { firstName: 'ASC' } });
  }

  async findOne(id: string) {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Team member not found');
    return m;
  }

  create(dto: CreateTeamMemberDto) {
    // Enforce UK NMW
    if (dto.hourlyRate && dto.hourlyRate < UK_NMW) {
      throw new BadRequestException(`Hourly rate cannot be below UK National Minimum Wage (£${UK_NMW}/hr)`);
    }
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateTeamMemberDto) {
    const m = await this.findOne(id);
    if (dto.hourlyRate && dto.hourlyRate < UK_NMW) {
      throw new BadRequestException(`Hourly rate cannot be below UK NMW (£${UK_NMW}/hr)`);
    }
    Object.assign(m, dto);
    return this.repo.save(m);
  }

  async remove(id: string) { return this.repo.remove(await this.findOne(id)); }

  async getStats() {
    const [total, active, inactive] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: MemberStatus.ACTIVE } }),
      this.repo.count({ where: { status: MemberStatus.INACTIVE } }),
    ]);
    const dbsExpiring = await this.repo
      .createQueryBuilder('m')
      .where('m.dbsExpiry < :date', { date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
      .andWhere('m.dbsExpiry IS NOT NULL')
      .getCount();
    return { total, active, inactive, dbsExpiring };
  }
}
