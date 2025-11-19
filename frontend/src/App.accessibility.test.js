import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import App from './App';

const initialEvents = [
  { id: 1, name: 'Homecoming Concert', datetime: '2025-12-01T19:00:00Z', location: 'Littlejohn', capacity: 2 },
];

let events;

const TOKEN_KEY = 'tigertix_token';
const EMAIL_KEY = 'tigertix_email';
const SESSION_TOKEN = 'access-token';

describe('App accessibility and interactions', () => {
  let originalFetch;

  beforeEach(() => {
    // jsdom doesn't implement scrollIntoView; provide a no-op to prevent errors
    if (!HTMLElement.prototype.scrollIntoView) {
      // eslint-disable-next-line no-extend-native
      HTMLElement.prototype.scrollIntoView = jest.fn();
    }
    events = initialEvents.map((ev) => ({ ...ev }));
    window.sessionStorage.setItem(TOKEN_KEY, SESSION_TOKEN);
    window.sessionStorage.setItem(EMAIL_KEY, 'access@test.com');
    originalFetch = global.fetch;
    global.fetch = jest.fn((url, opts = {}) => {
      const headers = opts.headers || {};
      if (typeof url === 'string' && url.includes('/api/events') && (opts.method || 'GET') === 'GET') {
        expect(headers.Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
        return Promise.resolve({ ok: true, json: async () => events });
      }
      if (typeof url === 'string' && url.includes('/api/events/1/purchase')) {
        expect(headers.Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
        events[0] = { ...events[0], capacity: events[0].capacity - 1 };
        return Promise.resolve({ ok: true, json: async () => events[0] });
      }
      if (typeof url === 'string' && url.includes('/api/llm/parse')) {
        expect(headers.Authorization).toBe(`Bearer ${SESSION_TOKEN}`);
        return Promise.resolve({
          ok: true,
          json: async () => JSON.stringify({ error: { msg: 'Please specify event and quantity' } }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  test('live status region exists and updates after purchase', async () => {
    render(<App />);

    // Wait for event to render
    const eventCard = await screen.findByRole('article', { name: /Homecoming Concert/i });
    const buyBtn = within(eventCard).getByRole('button', { name: /Buy 1 ticket/i });

    // Perform a purchase
    fireEvent.click(buyBtn);

    // Live region should announce purchase message
    const status = await screen.findByRole('status');
    await waitFor(() => {
      expect(status.textContent).toMatch(/Purchased 1 ticket/i);
    });
  });

  test('chatbot toggle and submit sets bot message', async () => {
    render(<App />);

    const toggle = screen.getByRole('button', { name: /toggle chatbot/i });
    fireEvent.click(toggle);

    const input = await screen.findByRole('textbox', { name: /Type a message/i });
    fireEvent.change(input, { target: { value: 'help me book' } });

    const send = screen.getByRole('button', { name: /Send message/i });
    fireEvent.click(send);

    // Wait for bot message to appear (error message from mocked LLM)
    await screen.findByText(/Please specify event and quantity/i);
  });
});
