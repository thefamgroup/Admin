import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { QuoteStatus } from './entities/quote.entity';

// A valid CreateQuoteDto payload (matches dto/quote.dto.ts).
const validQuote = {
  clientName: 'Test Client',
  clientEmail: 'client@example.com',
  clientPhone: '07769240184',
  serviceType: 'deep',
  propertySize: '3-bed',
  subtotal: 100,
  total: 120,
};

const mockQuotesService = {
  findAll: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue({ id: 'uuid-1', ...validQuote }),
  create: jest
    .fn()
    .mockResolvedValue({ id: 'uuid-1', status: QuoteStatus.DRAFT, ...validQuote }),
  update: jest.fn().mockResolvedValue({ id: 'uuid-1', status: QuoteStatus.SENT }),
  remove: jest.fn().mockResolvedValue({ id: 'uuid-1' }),
  getStats: jest
    .fn()
    .mockResolvedValue({ total: 0, paid: 0, pending: 0, overdue: 0, totalRevenue: 0 }),
};

describe('QuotesController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [QuotesController],
      providers: [{ provide: QuotesService, useValue: mockQuotesService }],
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

  it('GET /api/quotes -> 200', () => {
    return request(app.getHttpServer())
      .get('/api/quotes')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /api/quotes?status=paid -> 200 (filtered)', () => {
    return request(app.getHttpServer())
      .get('/api/quotes?status=paid')
      .expect(200)
      .expect(() => {
        expect(mockQuotesService.findAll).toHaveBeenCalledWith(QuoteStatus.PAID);
      });
  });

  it('POST /api/quotes with valid body -> 201', () => {
    return request(app.getHttpServer())
      .post('/api/quotes')
      .send(validQuote)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBe('uuid-1');
        expect(mockQuotesService.create).toHaveBeenCalled();
      });
  });

  it('PATCH /api/quotes/:id with { status: "sent" } -> 200', () => {
    return request(app.getHttpServer())
      .patch('/api/quotes/3f1c2a7e-1111-4111-8111-aaaaaaaaaaaa')
      .send({ status: QuoteStatus.SENT })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe(QuoteStatus.SENT);
        expect(mockQuotesService.update).toHaveBeenCalled();
      });
  });
});
