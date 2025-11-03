import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('Chatbot confirmation flow', () => {
  let originalFetch;
  const events = [
    { id: 1, name: 'Homecoming Concert', datetime: '2025-12-01T19:00:00Z', location: 'Littlejohn', capacity: 3 },
  ];

  beforeEach(() => {
    // jsdom polyfill for scrollIntoView
    if (!HTMLElement.prototype.scrollIntoView) {
      // eslint-disable-next-line no-extend-native
      HTMLElement.prototype.scrollIntoView = jest.fn();
    }

    originalFetch = global.fetch;
    global.fetch = jest.fn((url, opts = {}) => {
      const u = typeof url === 'string' ? url : '';
      const method = (opts.method || 'GET').toUpperCase();

      if (u.includes('/api/events') && method === 'GET') {
        return Promise.resolve({ ok: true, json: async () => events });
      }
      if (u.includes('/api/llm/parse') && method === 'POST') {
        // Propose booking 2 tickets for event 1
        return Promise.resolve({
          ok: true,
          json: async () => JSON.stringify({ event: { id: 1, name: 'Homecoming Concert', quantity: 2 } }),
        });
      }
      if (u.includes('/api/events/1/purchase') && method === 'POST') {
        // Confirm purchase and respond with an updated copy (avoid mutating shared state reference)
        const updated = { ...events[0], capacity: events[0].capacity - 2 };
        return Promise.resolve({ ok: true, json: async () => updated });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('proposes via LLM and confirms purchase on yes', async () => {
    render(<App />);

    // Open chatbot
    fireEvent.click(screen.getByRole('button', { name: /toggle chatbot/i }));

    // Send natural language booking request
    const input = await screen.findByRole('textbox', { name: /Type a message/i });
    fireEvent.change(input, { target: { value: 'Book 2 tickets for Homecoming Concert' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    // Wait for confirmation prompt
    await screen.findByText(/To confirm your reservation for 2 tickets/i);

    // Confirm
    fireEvent.change(input, { target: { value: 'yes' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    // Expect confirmation message
    await screen.findByText(/has been confirmed!/i);

    // And capacity updated in app state (1 remaining). Since text is split across elements,
    // assert on the numeric capacity element.
    const numberSpan = await screen.findByText((content, node) => {
      return (
        node &&
        node.tagName === 'SPAN' &&
        node.classList.contains('event-card__capacity-count') &&
        content === '1'
      );
    });
    expect(numberSpan).toBeInTheDocument();
  });
});
