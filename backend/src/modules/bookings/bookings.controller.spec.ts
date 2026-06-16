import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ServiceType, BookingStatus } from './entities/booking.entity';

// A valid CreateBookingDto payload (matches dto/booking.dto.ts).
const validBooking = {
  clientName: 'Test Client',
  clientEmail: 'client@example.com',
  clientPhone: '07769240184',
  address: '1 Test Street, Manchester',
  postcode: 'M1 1AA',
  serviceType: ServiceType.DEEP,
  scheduledAt: '2026-07-01T10:00:00.000Z',
  price: 120,
};

const mockBookingsService = {
  findAll: jest.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  }),
  findOne: jest.fn().mockResolvedValue({ id: 'uuid-1', ...validBooking }),
  create: jest
    .fn()
    .mockResolvedValue({ id: 'uuid-1', status: BookingStatus.PENDING, ...validBooking }),
  update: jest
    .fn()
    .mockResolvedValue({ id: 'uuid-1', status: BookingStatus.CONFIRMED }),
  remove: jest.fn().mockResolvedValue({ id: 'uuid-1' }),
  getStats: jest.fn().mockResolvedValue({ total: 0, pending: 0, confirmed: 0, completed: 0 }),
  getCalendar: jest.fn().mockResolvedValue([]),
};

async function buildApp(authenticated: boolean) {
  const guardValue = authenticated
    ? { canActivate: () => true }
    : {
        // Mirror the real JwtAuthGuard, which rejects with 401 Unauthorized.
        canActivate: () => {
          throw new UnauthorizedException();
        },
      };

  const moduleRef = await Test.createTestingModule({
    controllers: [BookingsController],
    providers: [{ provide: BookingsService, useValue: mockBookingsService }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(guardValue)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  return app.init();
}

describe('BookingsController (integration)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('without auth', () => {
    let app: INestApplication;
    beforeEach(async () => {
      app = await buildApp(false);
    });
    afterEach(async () => {
      await app.close();
    });

    it('GET /api/bookings without auth -> 401', () => {
      return request(app.getHttpServer()).get('/api/bookings').expect(401);
    });
  });

  describe('with auth', () => {
    let app: INestApplication;
    beforeEach(async () => {
      app = await buildApp(true);
    });
    afterEach(async () => {
      await app.close();
    });

    it('GET /api/bookings -> 200 + paginated result', () => {
      return request(app.getHttpServer())
        .get('/api/bookings')
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toBeDefined();
          expect(res.body.total).toBeDefined();
          expect(res.body.page).toBeDefined();
        });
    });

    it('POST /api/bookings with valid body -> 201', () => {
      return request(app.getHttpServer())
        .post('/api/bookings')
        .send(validBooking)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBe('uuid-1');
          expect(mockBookingsService.create).toHaveBeenCalled();
        });
    });

    it('POST /api/bookings with missing required fields -> 400', () => {
      return request(app.getHttpServer())
        .post('/api/bookings')
        .send({ clientName: 'X' }) // missing email, phone, address, serviceType, scheduledAt
        .expect(400);
    });

    it('PATCH /api/bookings/:id with a valid status -> 200', () => {
      return request(app.getHttpServer())
        .patch('/api/bookings/3f1c2a7e-1111-4111-8111-aaaaaaaaaaaa')
        .send({ status: BookingStatus.CONFIRMED })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(BookingStatus.CONFIRMED);
          expect(mockBookingsService.update).toHaveBeenCalled();
        });
    });

    it('DELETE /api/bookings/:id -> 200', () => {
      return request(app.getHttpServer())
        .delete('/api/bookings/3f1c2a7e-1111-4111-8111-aaaaaaaaaaaa')
        .expect(200)
        .expect(() => {
          expect(mockBookingsService.remove).toHaveBeenCalled();
        });
    });
  });
});
