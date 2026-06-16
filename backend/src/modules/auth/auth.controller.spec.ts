import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('AuthController (integration)', () => {
  let app: INestApplication;

  const validUser = {
    id: 'uuid-1',
    email: 'admin@thefamgroup.co.uk',
    firstName: 'Admin',
    lastName: 'FAM',
    role: 'admin',
  };

  const mockAuthService = {
    login: jest.fn(),
    getProfile: jest.fn().mockResolvedValue(validUser),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      // /auth/login is @Public() so the guard never blocks it, but override
      // anyway so the protected /auth/me route does not require a real JWT.
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

  // NestJS defaults POST handlers to 201 (no @HttpCode override on login).
  it('POST /api/auth/login with valid credentials -> 201 + { accessToken, user }', async () => {
    mockAuthService.login.mockResolvedValueOnce({
      accessToken: 'jwt.token.here',
      user: validUser,
    });

    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@thefamgroup.co.uk', password: 'Admin@123!' })
      .expect(201)
      .expect((res) => {
        expect(res.body.accessToken).toBe('jwt.token.here');
        expect(res.body.user).toMatchObject({ email: validUser.email });
      });
  });

  it('POST /api/auth/login with wrong password -> 401', async () => {
    mockAuthService.login.mockRejectedValueOnce(
      new UnauthorizedException('Invalid credentials'),
    );

    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@thefamgroup.co.uk', password: 'wrongpassword' })
      .expect(401);
  });

  it('POST /api/auth/login with non-existent email -> 401', async () => {
    mockAuthService.login.mockRejectedValueOnce(
      new UnauthorizedException('Invalid credentials'),
    );

    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Admin@123!' })
      .expect(401);
  });

  it('POST /api/auth/login with missing fields -> 400', async () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@thefamgroup.co.uk' })
      .expect(400);
  });

  it('POST /api/auth/login with invalid email format -> 400', async () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'Admin@123!' })
      .expect(400);
  });
});
