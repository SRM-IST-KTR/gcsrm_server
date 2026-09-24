const express = require('express');
const request = require('supertest');

jest.mock('@sentry/node', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setContext: jest.fn(),
}));

// Controller stubs — these tests assert the *route wiring* (which guard runs),
// not controller behaviour, so no DB is touched.
jest.mock('./src/controller/team.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { fetchTeamMembers: h, createTeamMember: h, fetchTeamMemberById: h, updateTeamMember: h, deleteTeamMember: h };
});
jest.mock('./src/controller/sponsor.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { fetchSponsor: h, createSponsor: h, updateSponsor: h, deleteSponsor: h };
});
jest.mock('./src/controller/events/event.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return {
    fetchAll: h, fetchEvent: h, fetchEventSlug: h, createEvent: h, editEvent: h, deleteEvent: h,
    fetchEventParticipants: h, updateEventParticipant: h, checkinEventParticipant: h,
    snacksEventParticipant: h, sendEventRsvpEmail: h, confirmParticipantRsvp: h,
  };
});
jest.mock('./src/controller/events/register.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { registerInEvent: h };
});
jest.mock('./src/controller/certificates/generate.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { generateCertificate: h };
});
jest.mock('./src/controller/certificates/verify.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { verifyCertificate: h };
});
jest.mock('./src/controller/certificates/download.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { downloadCertificate: h };
});
jest.mock('./src/controller/certificates/list.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { listCertificates: h };
});
jest.mock('./src/controller/certificates/revoke.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { revokeCertificate: h };
});
jest.mock('./src/controller/contact.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { sendContact: h };
});
jest.mock('./src/controller/otp.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { sendOTP: h, verifyOTP: h };
});
jest.mock('./src/controller/recruitments/apply_MONGODB.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { applyForRecruitment: h };
});
jest.mock('./src/controller/recruitments/submitTask.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { submitTask: h };
});
jest.mock('./src/controller/recruitments/getTasks.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { getParticipantTasks: h, getAllTasks: h, getTaskById: h };
});
jest.mock('./src/controller/recruitments/addTask.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { addTask: h };
});
jest.mock('./src/controller/recruitments/recruitment.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return {
    getAllParticipants: h, getParticipantById: h, createParticipant: h, getParticipantByEmail: h,
    updateParticipant: h, deleteParticipant: h, batchUpdateParticipants: h, getRecruitmentAnalytics: h,
  };
});
jest.mock('./src/controller/recruitments/sendTaskReminder.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { sendTaskReminderEmails: h };
});
jest.mock('./src/controller/recruitments/onboardMember.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { onboardMember: h };
});
jest.mock('./src/controller/ossomeHacks/registration.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { registerParticipant: h, getRegistrationById: h, getRegistrationByEmail: h };
});
jest.mock('./src/controller/ossomeHacks/getAllRegistrations.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { getAllRegistrations: h, getRegistrationStats: h, exportRegistrations: h };
});
jest.mock('./src/controller/ossomeHacks/checkInParticipant.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { checkInParticipant: h };
});
jest.mock('./src/controller/ossomeHacks/updateRegistration.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { updateRegistration: h };
});
jest.mock('./src/controller/ossomeHacks/deleteRegistration.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { deleteRegistration: h };
});
jest.mock('./src/controller/ossomeHacks/HackStatus.controller', () => {
  const h = (req, res) => res.status(200).json({ ok: true });
  return { HackStatus: h };
});

const app = express();
app.use(express.json());
app.use('/api/team', require('./src/routes/team.route'));
app.use('/api/sponsors', require('./src/routes/sponsor.route'));
app.use('/api/events', require('./src/routes/event.route'));
app.use('/api/contact', require('./src/routes/contact.route'));
app.use('/api/certificate', require('./src/routes/certificate.route'));
app.use('/api/recruitment', require('./src/routes/recruitment.route'));
app.use('/api/ossomehacks', require('./src/routes/ossomehacks.route'));
app.use('/api/otp', require('./src/routes/otp.route'));

const ADMIN_KEY = 'admin-key-123456';
const PUBLIC_KEY = 'public-key-12345';
const ADMIN = { Authorization: `Bearer ${ADMIN_KEY}` };
const PUBLIC = { Authorization: `Bearer ${PUBLIC_KEY}` };
const VALID_ID = '507f1f77bcf86cd799439011';

describe('API authorization hardening', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SERVICE_API_KEY = ADMIN_KEY;
    process.env.PUBLIC_API_KEY = PUBLIC_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Public read endpoints require the public key', () => {
    const publicReads = [
      ['get', '/api/team'],
      ['get', `/api/team/${VALID_ID}`],
      ['get', '/api/sponsors'],
      ['get', '/api/events'],
      ['get', '/api/events/slug/demo'],
      ['get', `/api/events/${VALID_ID}`],
      ['get', '/api/ossomehacks/registration-status'],
    ];

    it.each(publicReads)('%s %s -> 401 without a key', async (method, path) => {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    });

    it.each(publicReads)('%s %s -> 401 with a wrong key', async (method, path) => {
      const res = await request(app)[method](path).set('Authorization', 'Bearer nope');
      expect(res.status).toBe(401);
    });

    it.each(publicReads)('%s %s -> 200 with the public key', async (method, path) => {
      const res = await request(app)[method](path).set(PUBLIC);
      expect(res.status).toBe(200);
    });
  });

  describe('Write endpoints require the admin key and reject the public key', () => {
    const adminWrites = [
      ['post', '/api/team', ''],
      ['put', `/api/team/${VALID_ID}`, ''],
      ['delete', `/api/team/${VALID_ID}`, ''],
      ['post', '/api/sponsors', ''],
      ['put', `/api/sponsors/${VALID_ID}`, ''],
      ['delete', `/api/sponsors/${VALID_ID}`, ''],
      ['post', '/api/events', ''],
      ['put', `/api/events/${VALID_ID}`, ''],
      ['delete', `/api/events/${VALID_ID}`, ''],
      ['post', '/api/events/checkin', ''],
      ['post', '/api/events/snacks', ''],
      ['put', '/api/events/participants/someone@example.com', ''],
      ['post', '/api/certificate/generate', ''],
      ['put', '/api/certificate/revoke/CERT-1', ''],
      ['post', '/api/recruitment', ''],
      ['put', `/api/recruitment/${VALID_ID}`, ''],
      ['patch', `/api/recruitment/${VALID_ID}`, ''],
      ['delete', `/api/recruitment/${VALID_ID}`, ''],
      ['post', '/api/recruitment/onboard', ''],
      ['put', `/api/ossomehacks/registrations/${VALID_ID}`, ''],
      ['delete', `/api/ossomehacks/registrations/${VALID_ID}`, ''],
      ['post', `/api/ossomehacks/check-in/${VALID_ID}`, ''],
    ];

    it.each(adminWrites)('%s %s -> 401 without a key', async (method, path) => {
      const res = await request(app)[method](path).send({});
      expect(res.status).toBe(401);
    });

    it.each(adminWrites)('%s %s -> 401 with the public key (keys are not interchangeable)', async (method, path) => {
      const res = await request(app)[method](path).set(PUBLIC).send({});
      expect(res.status).toBe(401);
    });

    it.each(adminWrites)('%s %s -> not 401 with the admin key', async (method, path) => {
      const res = await request(app)[method](path).set(ADMIN).send({});
      expect(res.status).not.toBe(401);
    });
  });

  describe('Admin-only reads require the admin key', () => {
    const adminReads = [
      '/api/recruitment/all',
      '/api/recruitment/participants',
      '/api/recruitment/analytics',
      '/api/recruitment/tasks',
      '/api/ossomehacks/registrations',
      '/api/ossomehacks/registrations/' + VALID_ID,
      '/api/ossomehacks/registrations/email/a@b.com',
      '/api/ossomehacks/stats',
      '/api/ossomehacks/export',
      '/api/certificate',
      '/api/events/participants/demo',
    ];

    it.each(adminReads)('GET %s -> 401 without a key', async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    });

    it.each(adminReads)('GET %s -> 401 with the public key', async (path) => {
      const res = await request(app).get(path).set(PUBLIC);
      expect(res.status).toBe(401);
    });

    it.each(adminReads)('GET %s -> 200 with the admin key', async (path) => {
      const res = await request(app).get(path).set(ADMIN);
      expect(res.status).toBe(200);
    });
  });

  describe('Anonymous endpoints stay reachable', () => {
    it('POST /api/otp/send needs no key', async () => {
      const res = await request(app).post('/api/otp/send').send({ email: 'a@b.com' });
      expect(res.status).toBe(200);
    });

    it('POST /api/contact needs no key', async () => {
      const res = await request(app).post('/api/contact').send({ name: 'A', email: 'a@b.com', message: 'hi' });
      expect(res.status).not.toBe(401);
    });

    it('POST /api/events/register needs no key', async () => {
      const res = await request(app).post('/api/events/register').send({});
      expect(res.status).not.toBe(401);
    });

    it('GET /api/events/rsvp needs no key (email link target)', async () => {
      const res = await request(app).get('/api/events/rsvp').query({ email: 'a@b.com', slug: 'demo' });
      expect(res.status).not.toBe(401);
    });
  });

  describe('Fails closed when a key is not configured', () => {
    it('returns 500 on a public read when PUBLIC_API_KEY is unset', async () => {
      delete process.env.PUBLIC_API_KEY;
      const res = await request(app).get('/api/team').set(PUBLIC);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ success: false, message: 'Server configuration error' });
    });

    it('returns 500 on a write when SERVICE_API_KEY is unset', async () => {
      delete process.env.SERVICE_API_KEY;
      const res = await request(app).post('/api/team').set(ADMIN).send({});
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ success: false, message: 'Server configuration error' });
    });
  });

  describe('Invalid ObjectId is rejected before the controller', () => {
    it('PUT /api/events/not-an-id -> 400 with the admin key', async () => {
      const res = await request(app).put('/api/events/not-an-id').set(ADMIN).send({});
      expect(res.status).toBe(400);
    });

    it('DELETE /api/events/not-an-id -> 400 with the admin key', async () => {
      const res = await request(app).delete('/api/events/not-an-id').set(ADMIN);
      expect(res.status).toBe(400);
    });
  });
});
