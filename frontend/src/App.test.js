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

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockEvents,
  });
});

afterEach(() => {
  jest.clearAllMocks();
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
