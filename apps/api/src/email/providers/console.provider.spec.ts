import { ConsoleEmailProvider } from './console.provider';

describe('ConsoleEmailProvider', () => {
  it('captures sends and returns a sequential id', async () => {
    const p = new ConsoleEmailProvider();
    const a = await p.sendEmail({
      to: 'a@example.com',
      from: 'noreply@hirely.io',
      subject: 'one',
      html: '<p>one</p>',
    });
    const b = await p.sendEmail({
      to: 'b@example.com',
      from: 'noreply@hirely.io',
      subject: 'two',
      html: '<p>two</p>',
    });
    expect(a.id).toBe('console_1');
    expect(b.id).toBe('console_2');
    const drained = p.drain();
    expect(drained).toHaveLength(2);
    expect(p.drain()).toEqual([]);
  });
});
