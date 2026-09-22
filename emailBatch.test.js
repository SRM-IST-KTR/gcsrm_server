const express = require('express');
const request = require('supertest');

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-ses', () => {
  return {
    SESClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    SendEmailCommand: jest.fn().mockImplementation((params) => params),
  };
});

jest.mock('@sentry/node', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

const mockUpdateMany = jest.fn().mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });
const mockDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 2 });
const mockFind = jest.fn().mockResolvedValue([
  { _id: 'id1', name: 'User 1', email: 'user1@example.com' },
  { _id: 'id2', name: 'User 2', email: 'user2@example.com' },
]);

jest.mock('./src/utils/db', () => ({
  connectRecruitmentDB: jest.fn().mockResolvedValue({
    models: {},
  }),
  connectDB: jest.fn().mockResolvedValue(true),
}));

jest.mock('./src/models/recruitment.model', () => {
  return jest.fn().mockReturnValue({
    updateMany: mockUpdateMany,
    deleteMany: mockDeleteMany,
    find: mockFind,
  });
});

describe('Batch Email Architecture & Security Tests', () => {
  const originalEnv = { ...process.env };
  let app;
  let emailService;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SERVICE_API_KEY = 'secret-api-key-test';
    process.env.SENDER_EMAIL = 'noreply@githubsrmist.in';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    mockSend.mockReset();
    mockUpdateMany.mockClear();
    mockDeleteMany.mockClear();
    mockFind.mockClear();

    emailService = require('./src/utils/emailService');
    emailService.resetForTest();

    app = express();
    app.use(express.json());
    app.use('/api/email', require('./src/routes/email.route'));
    app.use('/api/recruitment', require('./src/routes/recruitment.route'));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Error Isolation in emailService.sendBatchEmails', () => {
    it('continues processing and isolates error when an individual email fails', async () => {
      mockSend.mockImplementation(async (command) => {
        const to = command.Destination?.ToAddresses?.[0];
        if (to === 'fail@example.com') {
          const err = new Error('SES Delivery Failed');
          err.name = 'MessageRejected';
          throw err;
        }
        return { MessageId: `msg-${to}` };
      });

      const emails = [
        { to: 'success1@example.com', subject: 'Subject 1', text: 'Hello 1' },
        { to: 'fail@example.com', subject: 'Subject 2', text: 'Hello 2' },
        { to: 'success2@example.com', subject: 'Subject 3', text: 'Hello 3' },
      ];

      const result = await emailService.sendBatchEmails(emails, { concurrency: 2 });

      expect(result.total).toBe(3);
      expect(result.sentCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.results).toHaveLength(3);

      expect(result.results[0]).toEqual({
        to: 'success1@example.com',
        success: true,
        id: 'msg-success1@example.com',
        index: 0,
      });

      expect(result.results[1]).toEqual(
        expect.objectContaining({
          to: 'fail@example.com',
          success: false,
          error: expect.stringContaining('SES Delivery Failed'),
          index: 1,
        })
      );

      expect(result.results[2]).toEqual({
        to: 'success2@example.com',
        success: true,
        id: 'msg-success2@example.com',
        index: 2,
      });
    });

    it('rejects with 400 if emails is not an array or empty', async () => {
      await expect(emailService.sendBatchEmails([])).rejects.toThrow('sendBatchEmails: emails must be a non-empty array');
      await expect(emailService.sendBatchEmails(null)).rejects.toThrow('sendBatchEmails: emails must be a non-empty array');
    });
  });

  describe('2. POST /api/email/batch Controller Response', () => {
    it('returns 200 with consolidated metrics and messageIds', async () => {
      mockSend.mockImplementation(async (command) => {
        const to = command.Destination?.ToAddresses?.[0];
        if (to === 'bad@example.com') {
          throw new Error('Invalid email');
        }
        return { MessageId: `ses-${to}` };
      });

      const res = await request(app)
        .post('/api/email/batch')
        .set('Authorization', 'Bearer secret-api-key-test')
        .send({
          emails: [
            { to: 'good@example.com', subject: 'Good', text: 'Good text' },
            { to: 'bad@example.com', subject: 'Bad', text: 'Bad text' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(2);
      expect(res.body.sentCount).toBe(1);
      expect(res.body.failedCount).toBe(1);
      expect(res.body.messageIds).toEqual(['ses-good@example.com']);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.message).toContain('1 of 2 emails sent successfully, 1 failed');
    });
  });

  describe('3. Route Protection on Recruitment Endpoints', () => {
    it('rejects POST /api/recruitment/batch without Bearer token (401)', async () => {
      const res = await request(app)
        .post('/api/recruitment/batch')
        .send({ ids: ['id1', 'id2'], action: 'delete' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unauthorized');
    });

    it('rejects POST /api/recruitment/send-task-reminder without Bearer token (401)', async () => {
      const res = await request(app)
        .post('/api/recruitment/send-task-reminder')
        .send({ ids: ['id1', 'id2'] });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unauthorized');
    });

    it('rejects recruitment batch requests with invalid token (401)', async () => {
      const res = await request(app)
        .post('/api/recruitment/batch')
        .set('Authorization', 'Bearer wrong-token')
        .send({ ids: ['id1'], action: 'delete' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized: Invalid authentication token');
    });

    it('allows POST /api/recruitment/batch with valid Bearer token', async () => {
      const res = await request(app)
        .post('/api/recruitment/batch')
        .set('Authorization', 'Bearer secret-api-key-test')
        .send({ ids: ['id1', 'id2'], action: 'delete' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDeleteMany).toHaveBeenCalled();
    });

    it('allows POST /api/recruitment/send-task-reminder with valid Bearer token and dispatches emails', async () => {
      mockSend.mockResolvedValue({ MessageId: 'reminder-msg-id' });

      const res = await request(app)
        .post('/api/recruitment/send-task-reminder')
        .set('Authorization', 'Bearer secret-api-key-test')
        .send({ ids: ['id1', 'id2'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.emailsSent).toBe(2);
      expect(res.body.emailErrors).toBe(0);
    });
  });

  describe('4. Recruitment Batch Chunking & Email Dispatch', () => {
    it('dispatches emails in chunks and handles individual email failure gracefully', async () => {
      mockSend.mockImplementation(async (command) => {
        const to = command.Destination?.ToAddresses?.[0];
        if (to === 'user2@example.com') {
          throw new Error('User 2 inbox full');
        }
        return { MessageId: `msg-${to}` };
      });

      const res = await request(app)
        .post('/api/recruitment/batch')
        .set('Authorization', 'Bearer secret-api-key-test')
        .send({
          ids: ['id1', 'id2'],
          action: 'updateStatus',
          status: 'task_assigned',
          sendEmail: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.emailsSent).toBe(1);
      expect(res.body.emailErrors).toBe(1);
      expect(mockUpdateMany).toHaveBeenCalledWith(
        { _id: { $in: ['id1', 'id2'] } },
        { $set: { status: 'task_assigned' } }
      );
    });
  });
});
