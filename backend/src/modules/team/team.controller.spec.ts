import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import * as request from 'supertest';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MemberRole, MemberStatus } from './entities/team-member.entity';

// A valid CreateTeamMemberDto payload (matches dto/team-member.dto.ts).
const validMember = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '07769240184',
  role: MemberRole.CLEANER,
  hourlyRate: 12.5,
};

const mockTeamService = {
  findAll: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue({ id: 'uuid-1', ...validMember }),
  // The real service throws BadRequestException for sub-NMW rates; reproduce
  // that here so the test covers both the DTO and service-level guards.
  create: jest.fn().mockImplementation((dto) => {
    if (dto.hourlyRate && dto.hourlyRate < 11.44) {
      throw new BadRequestException(
        'Hourly rate cannot be below UK National Minimum Wage (£11.44/hr)',
      );
    }
    return Promise.resolve({ id: 'uuid-1', status: MemberStatus.ACTIVE, ...dto });
  }),
  update: jest.fn().mockResolvedValue({ id: 'uuid-1' }),
  remove: jest.fn().mockResolvedValue({ id: 'uuid-1' }),
  getStats: jest
    .fn()
    .mockResolvedValue({ total: 0, active: 0, inactive: 0, dbsExpiring: 0 }),
};

describe('TeamController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [{ provide: TeamService, useValue: mockTeamService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/team -> 200', () => {
    return request(app.getHttpServer())
      .get('/api/team')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('POST /api/team with hourlyRate < 11.44 -> 400 (NMW enforcement)', () => {
    return request(app.getHttpServer())
      .post('/api/team')
      .send({ ...validMember, hourlyRate: 9.0 })
      .expect(400);
  });

  it('POST /api/team with valid data -> 201', () => {
    return request(app.getHttpServer())
      .post('/api/team')
      .send(validMember)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBe('uuid-1');
        expect(mockTeamService.create).toHaveBeenCalled();
      });
  });
});
