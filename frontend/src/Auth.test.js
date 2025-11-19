import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

const TOKEN_KEY = 'tigertix_token';
const EMAIL_KEY = 'tigertix_email';

describe('Authentication flows', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    // Ensure clean storage
    window.sessionStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  test('registers a new user and persists session', async () => {
    global.fetch = jest.fn((url, opts = {}) => {
      if (typeof url === 'string' && url.includes('/api/register')) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      }
      // login is invoked automatically after register
      if (typeof url === 'string' && url.includes('/api/login')) {
        return Promise.resolve({ ok: true, json: async () => ({ token: 'reg-token' }) });
      }
      // fallback for events fetch
      if (typeof url === 'string' && url.includes('/api/events')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });

    render(<App />);

    // Switch to register mode (mode toggle button)
    const modeButtons = screen.getAllByRole('button', { name: /Create account/i });
    const modeToggle = modeButtons.find((b) => b.getAttribute('aria-pressed') !== null && b.getAttribute('type') === 'button');
    if (modeToggle) fireEvent.click(modeToggle);

    // Fill the registration form
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@user.com' } });
    fireEvent.change(screen.getByLabelText(/First name/i), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText(/Last name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

    // Click the form submit button (type="submit")
    const createSubmit = screen.getAllByRole('button', { name: /Create account/i }).find((b) => b.getAttribute('type') === 'submit');
    fireEvent.click(createSubmit);

    // wait for session to be persisted
    await waitFor(() => {
      expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe('reg-token');
      expect(window.sessionStorage.getItem(EMAIL_KEY)).toBe('new@user.com');
    });
  });

  test('signs in an existing user and shows logout', async () => {
    global.fetch = jest.fn((url, opts = {}) => {
      if (typeof url === 'string' && url.includes('/api/login')) {
        return Promise.resolve({ ok: true, json: async () => ({ token: 'login-token', email: 'login@user.com' }) });
      }
      if (typeof url === 'string' && url.includes('/api/events')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });

    render(<App />);

    // Ensure we are on login mode (default)
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'login@user.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'hunter2' } });

    // Click the form submit button (type="submit")
    const signInSubmit = screen.getAllByRole('button', { name: /Sign in/i }).find((b) => b.getAttribute('type') === 'submit');
    fireEvent.click(signInSubmit);

    await waitFor(() => {
      expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe('login-token');
      expect(window.sessionStorage.getItem(EMAIL_KEY)).toBe('login@user.com');
    });

    // After login, there should be a sign out / logout control visible
    expect(screen.getByRole('button', { name: /Sign out|Logout|Log out/i })).toBeTruthy();
  });

  test('logs out and clears session', async () => {
    // Pre-populate session to simulate logged-in user
    window.sessionStorage.setItem(TOKEN_KEY, 'exist-token');
    window.sessionStorage.setItem(EMAIL_KEY, 'exist@user.com');

    global.fetch = jest.fn((url, opts = {}) => {
      if (typeof url === 'string' && url.includes('/api/events')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });

    render(<App />);

    // wait for UI to show logout button
    const logoutBtn = await screen.findByRole('button', { name: /Sign out|Logout|Log out/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(window.sessionStorage.getItem(EMAIL_KEY)).toBeNull();
    });
  });
});
