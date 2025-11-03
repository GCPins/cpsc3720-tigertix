import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import App from './App';

const events = [
  { id: 1, name: 'Homecoming Concert', datetime: '2025-12-01T19:00:00Z', location: 'Littlejohn', capacity: 2 },
];

describe('App accessibility and interactions', () => {
  let originalFetch;

  beforeEach(() => {
    // jsdom doesn't implement scrollIntoView; provide a no-op to prevent errors
    if (!HTMLElement.prototype.scrollIntoView) {
      // eslint-disable-next-line no-extend-native
      HTMLElement.prototype.scrollIntoView = jest.fn();
    }
    originalFetch = global.fetch;
    global.fetch = jest.fn((url, opts) => {
      if (typeof url === 'string' && url.includes('/api/events') && (!opts || opts.method === 'GET')) {
        return Promise.resolve({ ok: true, json: async () => events });
      }
      if (typeof url === 'string' && url.includes('/api/events/1/purchase')) {
        // decrement capacity and return updated event
        events[0] = { ...events[0], capacity: events[0].capacity - 1 };
        return Promise.resolve({ ok: true, json: async () => events[0] });
      }
      if (typeof url === 'string' && url.includes('/api/llm/parse')) {
        // return JSON string (server passthrough)
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
