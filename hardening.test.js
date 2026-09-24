const express = require('express');
const request = require('supertest');

jest.mock('@sentry/node', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('./src/utils/db', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  connectRecruitmentDB: jest.fn().mockResolvedValue({}),
  dbHealth: jest.fn(),
}));

const { escapeRegex, safeErrorMessage } = require('./src/utils/regex');
const { pick, escapeHtml } = require('./src/utils/sanitize');
const { createApiKeyGuard } = require('./src/middleware/apiKeyGuard');
const teamController = require('./src/controller/team.controller');

describe('Security primitives', () => {
  describe('escapeRegex', () => {
    it('neutralises a ReDoS pattern so it matches literally', () => {
      const escaped = escapeRegex('(a+)+$');
      expect(new RegExp(escaped).test('(a+)+$')).toBe(true);
      expect(new RegExp(escaped).test('aaaaaaaaaaaaaaaaaaaaaaaa!')).toBe(false);
    });

    it('escapes regex metacharacters', () => {
      expect(escapeRegex('a.*b')).toBe('a\\.\\*b');
    });
  });

  describe('pick (mass-assignment guard)', () => {
    it('keeps only allowlisted keys and drops the rest', () => {
      const body = { name: 'A', email: 'a@b.com', status: 'hacked', isAdmin: true };
      expect(pick(body, ['name', 'email'])).toEqual({ name: 'A', email: 'a@b.com' });
    });

    it('ignores undefined values and non-objects', () => {
      expect(pick({ name: undefined }, ['name'])).toEqual({});
      expect(pick(null, ['name'])).toEqual({});
    });
  });

  describe('escapeHtml (XSS guard)', () => {
    it('escapes script tags and quotes', () => {
      const out = escapeHtml('<script>alert("x")</script>');
      expect(out).not.toContain('<script>');
      expect(out).toContain('&lt;script&gt;');
      expect(out).toContain('&quot;');
    });

    it('handles null/undefined safely', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('createApiKeyGuard', () => {
    const buildApp = () => {
      const app = express();
      app.get('/guarded', createApiKeyGuard('TEST_GUARD_KEY'), (req, res) => res.status(200).json({ ok: true }));
      return app;
    };

    beforeEach(() => {
      process.env.TEST_GUARD_KEY = 'the-secret-key';
    });

    it('rejects missing, malformed and wrong keys with 401', async () => {
      const app = buildApp();
      expect((await request(app).get('/guarded')).status).toBe(401);
      expect((await request(app).get('/guarded').set('Authorization', 'Token abc')).status).toBe(401);
      expect((await request(app).get('/guarded').set('Authorization', 'Bearer wrong')).status).toBe(401);
    });

    it('allows the correct key through', async () => {
      const res = await request(buildApp()).get('/guarded').set('Authorization', 'Bearer the-secret-key');
      expect(res.status).toBe(200);
    });

    it('fails closed with 500 when the env var is unset', async () => {
      delete process.env.TEST_GUARD_KEY;
      const res = await request(buildApp()).get('/guarded').set('Authorization', 'Bearer anything');
      expect(res.status).toBe(500);
    });
  });

  describe('safeErrorMessage', () => {
    it('returns a generic message in production', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(safeErrorMessage(new Error('mongo internal detail'), 'Generic')).toBe('Generic');
      process.env.NODE_ENV = prev;
    });
  });

  describe('Team public projection', () => {
    const fields = teamController.TEAM_PUBLIC_FIELDS;

    it('excludes PII and internal fields', () => {
      ['email', 'phoneno', 'faDetails', 'ndaUrl', 'section'].forEach((field) => {
        expect(fields).not.toContain(field);
      });
    });

    it('includes the display fields the public site needs', () => {
      ['name', 'domain', 'position', 'pictureUrl', 'socials'].forEach((field) => {
        expect(fields).toContain(field);
      });
    });
  });
});
