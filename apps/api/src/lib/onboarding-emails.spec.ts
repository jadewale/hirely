import {
  inboxNudgeEmail,
  resumeNudgeEmail,
  welcomeEmail,
} from './onboarding-emails';

describe('onboarding email templates', () => {
  const originalFrontend = process.env.FRONTEND_URL;
  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://app.hirely.com';
  });
  afterAll(() => {
    process.env.FRONTEND_URL = originalFrontend;
  });

  describe('welcomeEmail', () => {
    it('greets the user by name and links to /dashboard', () => {
      const tpl = welcomeEmail('Jola');

      expect(tpl.subject).toMatch(/Welcome to Hirely/i);
      expect(tpl.html).toContain('Jola');
      expect(tpl.html).toContain('https://app.hirely.com/dashboard');
      expect(tpl.text).toContain('Jola');
      expect(tpl.text).toContain('https://app.hirely.com/dashboard');
    });

    it('falls back to localhost when FRONTEND_URL is unset', () => {
      delete process.env.FRONTEND_URL;
      const tpl = welcomeEmail('Jola');
      expect(tpl.html).toContain('http://localhost:3000/dashboard');
    });

    it('strips a trailing slash from FRONTEND_URL', () => {
      process.env.FRONTEND_URL = 'https://app.hirely.com/';
      const tpl = welcomeEmail('Jola');
      expect(tpl.html).toContain('https://app.hirely.com/dashboard');
      expect(tpl.html).not.toContain('//dashboard');
    });
  });

  describe('inboxNudgeEmail', () => {
    it('points users at the integrations page', () => {
      const tpl = inboxNudgeEmail('Jola');
      expect(tpl.subject).toMatch(/Connect your inbox/i);
      expect(tpl.html).toContain('Jola');
      expect(tpl.html).toContain(
        'https://app.hirely.com/settings/integrations',
      );
      expect(tpl.text).toContain(
        'https://app.hirely.com/settings/integrations',
      );
    });
  });

  describe('resumeNudgeEmail', () => {
    it('points users at the resume upload page', () => {
      const tpl = resumeNudgeEmail('Jola');
      expect(tpl.subject).toMatch(/resume/i);
      expect(tpl.html).toContain('Jola');
      expect(tpl.html).toContain('https://app.hirely.com/profile/resume');
      expect(tpl.text).toContain('https://app.hirely.com/profile/resume');
    });
  });
});
