import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LeadStatus, LeadSource } from './entities/lead.entity';

// A valid CreateLeadDto payload (matches dto/lead.dto.ts — only `name` required).
const validLead = {
  name: 'Test Lead',
  email: 'lead@example.com',
  phone: '07769240184',
  serviceInterest: 'deep clean',
  source: LeadSource.WEBSITE,
  estimatedValue: 150,
};

const mockLeadsService = {
  findAll: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue({ id: 'uuid-1', ...validLead }),
  create: jest
    .fn()
    .mockResolvedValue({ id: 'uuid-1', status: LeadStatus.NEW, ...validLead }),
  update: jest.fn().mockResolvedValue({ id: 'uuid-1', status: LeadStatus.CONTACTED }),
  remove: jest.fn().mockResolvedValue({ id: 'uuid-1' }),
  getKanban: jest.fn().mockResolvedValue([]),
  getStats: jest.fn().mockResolvedValue({ total: 0, byStatus: [] }),
};

describe('LeadsController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [{ provide: LeadsService, useValue: mockLeadsService }],
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

  it('GET /api/leads -> 200', () => {
    return request(app.getHttpServer())
      .get('/api/leads')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('POST /api/leads with valid body -> 201', () => {
    return request(app.getHttpServer())
      .post('/api/leads')
      .send(validLead)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBe('uuid-1');
        expect(mockLeadsService.create).toHaveBeenCalled();
      });
  });

  it('PATCH /api/leads/:id -> 200', () => {
    return request(app.getHttpServer())
      .patch('/api/leads/3f1c2a7e-1111-4111-8111-aaaaaaaaaaaa')
      .send({ status: LeadStatus.CONTACTED })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe(LeadStatus.CONTACTED);
        expect(mockLeadsService.update).toHaveBeenCalled();
      });
  });
});
