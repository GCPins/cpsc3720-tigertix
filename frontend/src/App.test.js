import { render, screen } from '@testing-library/react';
import App from './App';

const mockEvents = [
  {
    id: 1,
    name: 'Tiger Tailgate',
    datetime: '2025-10-10T18:00:00Z',
    capacity: 25,
  },
];

const TOKEN_KEY = 'tigertix_token';
const EMAIL_KEY = 'tigertix_email';

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  window.sessionStorage.setItem(TOKEN_KEY, 'test-token');
  window.sessionStorage.setItem(EMAIL_KEY, 'test@clemson.edu');
  global.fetch = jest.fn((url) => {
    if (typeof url === 'string' && url.includes('/api/events')) {
      return Promise.resolve({ ok: true, json: async () => mockEvents });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
});

afterEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
  global.fetch = originalFetch;
});

test('renders hero heading and loads events', async () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: /Clemson Campus Events/i })
  ).toBeInTheDocument();

  const eventName = await screen.findByText(/Tiger Tailgate/i);
  expect(eventName).toBeInTheDocument();
});
