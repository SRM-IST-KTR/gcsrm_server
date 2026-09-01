const express = require('express');
const request = require('supertest');

const mockSendEmail = jest.fn().mockResolvedValue({ data: { id: 'test-email-id' } });

jest.mock('./src/utils/otpService', () => ({
  generateOTP: () => '123456',
  storeOTP: jest.fn().mockResolvedValue(true),
  getOTPTTL: jest.fn().mockResolvedValue(0),
  OTP_TTL_SECONDS: 300
}));

jest.mock('./src/utils/emailService', () => ({
  sendEmail: mockSendEmail
}));

jest.mock('@sentry/node', () => ({
  logger: { info: jest.fn() },
  captureException: jest.fn()
}));

const app = express();
app.use(express.json());

const emailRoute = require('./src/routes/email.route');
const otpRoute = require('./src/routes/otp.route');

app.use('/api/email', emailRoute);
app.use('/api/otp', otpRoute);

describe('Security Fixes', () => {
  beforeEach(() => {
    process.env.SERVICE_API_KEY = 'secret-key-123';
    mockSendEmail.mockClear();
  });

  describe('Email Gateway Security', () => {
    it('returns 401 without api key', async () => {
      const res = await request(app).post('/api/email/send').send({ to: 'a@b.com', subject: 'hi' });
      expect(res.status).toBe(401);
    });

    it('returns 401 with incorrect api key', async () => {
      const res = await request(app).post('/api/email/send')
        .set('x-api-key', 'wrong-key')
        .send({ to: 'a@b.com', subject: 'hi' });
      expect(res.status).toBe(401);
    });

    it('proceeds with correct api key (fails validation if body is empty)', async () => {
      const res = await request(app).post('/api/email/send')
        .set('x-api-key', 'secret-key-123')
        .send({});
      expect(res.status).toBe(400); // Because of missing "to" and "subject"
    });
  });

  describe('OTP Injection Prevention', () => {
    it('ignores provided emailTemplate and uses hardcoded subject', async () => {
      const res = await request(app).post('/api/otp/send').send({
        email: 'test@example.com',
        emailTemplate: '<h1>Hacked</h1>',
        subject: 'Hacked Subject'
      });
      
      expect(res.status).toBe(200);
      
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      const emailArgs = mockSendEmail.mock.calls[0][0];
      
      expect(emailArgs.subject).toBe('Your OTP Code — GitHub Community SRM');
      expect(emailArgs.html).not.toContain('<h1>Hacked</h1>');
      expect(emailArgs.html).toContain('123456');
    });
  });
});
