import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
// const fetch = require('node-fetch').default;

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:6001/api';
const STORAGE_TOKEN_KEY = 'tigertix_token';
const STORAGE_EMAIL_KEY = 'tigertix_email';

const buildApiUrl = (path) => {
  const normalizedBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}/${normalizedPath}`;
};

let modalOpenedOnce = false;
let confirmationPending = false;
let potentialEventId = -1;
let potentialEventName = '';
let potentialEventQuantity = 0;

/**
 * Returns the location of the event or a placeholder if none is provided.
 *
 * @param {string} location - The location (as a string) for the event.
 * @returns {string} The formatted location string.
 */
const formatLocation = (location) => {
  if (!location) {
    return 'Location TBD';
  }

  return location;
}

/**
 * formatDatetime
 * Purpose: Safely convert an event datetime string into a user-friendly label.
 * @param {string} rawDatetime - Datetime string returned by the API.
 * @returns {string} Formatted datetime text or the original string if parsing fails.
 */
const formatDatetime = (rawDatetime) => {
  if (!rawDatetime) {
    return 'Date coming soon';
  }

  const parsedDate = new Date(rawDatetime);
  if (Number.isNaN(parsedDate.getTime())) {
    return rawDatetime;
  }

  return parsedDate.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * ChatbotWidget
 * Floating chat assistant with voice input, event listing, LLM parse/reply integration, and JWT-aware fetches.
 */
const ChatbotWidget = ({ setAppEvents, authFetch }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [events, setEvents] = useState([]);
  const recognitionRef = React.useRef(null);
  const messagesEndRef = React.useRef(null);

  // --- Load events ---
  useEffect(() => {
    let isCancelled = false;
    if (!authFetch) return () => {};

    authFetch('/events')
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled) {
          setEvents(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => console.error('Failed to load events:', err));

    return () => {
      isCancelled = true;
    };
  }, [authFetch]);

  // --- Setup SpeechRecognition ---
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      // Use same flow as typed input so speech and text behave identically
      // (sendTextMessage accepts either an Event or a raw string).
      try {
        sendTextMessage(text);
      } catch (err) {
        console.error('Speech handling error:', err);
        // Fallback: show what user said and echo a friendly reply.
        addMessage('user', text);
        addMessage('bot', `🤖 Got it! You said: "${text}".`);
      }
    };

    recognition.onerror = (err) => {
      console.error('Speech recognition error:', err);
      alert('Speech recognition error: ' + err.error);
      setListening(false);
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  // --- Play beep ---
  const playBeep = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
  };

  // --- Toggle recording ---
  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      playBeep(); 
      recognition.start();
      setListening(true);
    }
  };

  // --- Add message helper ---
  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }]);
    if (sender === 'bot') speakText(text);
  };

  // --- Scroll chat to bottom when messages change ---
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // --- Send a text message from user ---
  // Use promise chaining to send message and handle response succinctly
  const sendTextMessage = (evOrText) => {
    if (evOrText && evOrText.preventDefault) evOrText.preventDefault();
    const text = typeof evOrText === 'string' ? evOrText.trim() : (inputText || '').trim();
    if (!text || sending) return;
    if (!authFetch) {
      addMessage('bot', 'Please sign in before using the assistant.');
      return;
    }

    addMessage('user', text);
    setInputText('');
    setSending(true);

    if (confirmationPending) {
      if (text.toLowerCase().includes('yes') || text.toLowerCase().includes('confirm')) {
        // purchase confirmed, buy ticket(s) for event with ID = potentialEventId
        // with ticket quantity = potentialEventQuantity
        authFetch(`/events/${potentialEventId}/purchase`, {
          method: 'POST',
          body: JSON.stringify({ quantity: potentialEventQuantity }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              throw new Error(errBody.error || 'Reservation failed');
            }
            addMessage(
              'bot',
              'Your reservation for ' +
                potentialEventQuantity +
                ' tickets to ' +
                potentialEventName +
                ' has been confirmed! Thank you for using TigerTix Assistant.'
            );
          })
          .catch((err) => {
            console.error(err);
            addMessage('bot', 'Unable to confirm reservation: ' + err.message);
          });
        if (setAppEvents) {
          setAppEvents((prevEvents) =>
            prevEvents.map((ev) =>
              ev.id === potentialEventId ? { ...ev, capacity: ev.capacity - potentialEventQuantity } : ev
            )
          );
        }
      } else {
        addMessage('bot', 'Reservation not confirmed - please try again if you wish to book tickets.');
      }
      confirmationPending = false;
      setSending(false);
      return;
    }

    authFetch('/llm/parse', {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    })
      .then((res) =>
        res
          .json()
          .catch(() => null)
          .then((data) => ({ res, data }))
      )
      .then(({ res, data }) => {
        // res.json() may already have returned a parsed object; handle string/object safely
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) { /* leave as string */ }
        }
        let reply = 'Assistant unavailable.';
        if (res && res.ok) {
          if (data == null) reply = 'No reply from assistant.';
          // else if (typeof data === 'string') reply = data;
          // else if (typeof data.reply === 'string') reply = data.reply;
          // else if (typeof data.message === 'string') reply = data.message;
          else if (data.error) reply = JSON.stringify(data.error.msg).replaceAll('"', '');
          else {
            reply = "To confirm your reservation for " + JSON.stringify(data.event.quantity) + " tickets to " + JSON.stringify(data.event.name) + ", please respond with \"yes\" or \"confirm\"";
            confirmationPending = true;
            potentialEventId = data.event.id;
            potentialEventName = data.event.name;
            potentialEventQuantity = data.event.quantity;
          }
        } else if (res) {
          // reply = (data && (data.error || data.message)) || `Assistant error: ${res.status}`;
        }
        
        addMessage('bot', reply);
      })
      .catch((err) => {
        console.error('LLM reply request failed:', err);
        addMessage('bot', 'Assistant unavailable.');
      })
      .finally(() => setSending(false));
  };

  // --- Greet when opened ---
  useEffect(() => {
    if (!open) return;

    if (!modalOpenedOnce) {
      addMessage('bot', '👋 Hi there! Welcome to TigerTix Assistant.');
      addMessage('bot', 'Here are the currently available events:');
      if (events.length > 0) {
        events.forEach((ev) => {
          addMessage(
            'bot',
            `🎟️ ${ev.name} — ${ev.capacity} tickets remaining on ${new Date(
              ev.datetime
            ).toLocaleDateString()}`
          );
        });
      } else {
        addMessage('bot', 'No events available right now. Check back soon!');
      }
      modalOpenedOnce = true;
    }
  }, [open, events]);

  // --- Text-to-speech ---
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="chatbot-widget">
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-title">TigerTix Assistant</div>
            <button
              type="button"
              className="mic-btn mic-btn--header"
              onClick={toggleRecording}
              aria-pressed={listening}
              aria-label={listening ? 'Stop recording' : 'Start recording'}
            >
              {listening ? '🛑' : '🎤'}
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <p key={idx} className={msg.sender === 'user' ? 'user-msg' : 'bot-msg'}>
                {msg.text}
              </p>
            ))}
            {listening && <p className="system-msg" aria-live="polite">Listening...</p>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-controls">
            <form className="chat-input-form" onSubmit={sendTextMessage}>
              <input
                aria-label="Type a message"
                className="chat-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
                placeholder="Type a message..."
              />
              <button type="submit" className="send-btn" aria-label="Send message" disabled={sending}>
                {sending ? 'Sending…' : '➤'}
              </button>
              {/* mic button moved to header to preserve layout on small screens */}
            </form>
          </div>
        </div>
      )}

      <button
        className="chatbot-toggle-btn"
        onClick={() => setOpen(!open)}
        aria-label="Toggle chatbot"
      >
        💬
      </button>
    </div>
  );
};


/**
 * AuthPanel
 * Handles registration, login, and logout UX.
 */
const AuthPanel = ({
  mode,
  onModeChange,
  formData,
  onChange,
  onSubmit,
  loading,
  feedback,
  user,
  onLogout,
}) => {
  const isRegister = mode === 'register';

  if (user) {
    return (
      <section className="auth-panel" aria-live="polite">
        <div className="auth-panel__signed-in">
          <div>
            <p className="auth-panel__status-label">Session Active</p>
            <p className="auth-panel__status-value">
              Logged in as <strong>{user.email}</strong>
            </p>
          </div>
          <button type="button" className="auth-panel__logout" onClick={onLogout}>
            Log out
          </button>
        </div>
        {feedback && (
          <p className="auth-panel__feedback" role="status">
            {feedback}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="auth-panel" aria-label="User authentication" aria-live="polite">
      <div className="auth-panel__toggle" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          className={mode === 'login' ? 'is-active' : ''}
          aria-pressed={mode === 'login'}
          onClick={() => onModeChange('login')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'is-active' : ''}
          aria-pressed={mode === 'register'}
          onClick={() => onModeChange('register')}
        >
          Create account
        </button>
      </div>

      <form className="auth-panel__form" onSubmit={onSubmit}>
        <label className="auth-panel__field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={onChange}
          />
        </label>

        {isRegister && (
          <div className="auth-panel__grid">
            <label className="auth-panel__field">
              <span>First name</span>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                required
                value={formData.firstName}
                onChange={onChange}
              />
            </label>
            <label className="auth-panel__field">
              <span>Last name</span>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                required
                value={formData.lastName}
                onChange={onChange}
              />
            </label>
          </div>
        )}

        <label className="auth-panel__field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            value={formData.password}
            onChange={onChange}
          />
        </label>

        <div className="auth-panel__actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
          <p className="auth-panel__hint">
            {isRegister ? 'Already registered?' : "Need an account?"}{' '}
            <button
              type="button"
              className="auth-panel__mode-link"
              onClick={() => onModeChange(isRegister ? 'login' : 'register')}
            >
              {isRegister ? 'Sign in here' : 'Register now'}
            </button>
          </p>
        </div>
      </form>

      {feedback && (
        <p className="auth-panel__feedback" role="alert">
          {feedback}
        </p>
      )}
    </section>
  );
};


/**
 * EventCard
 * Purpose: Present an event's key details and purchase controls in a styled card.
 * @param {Object} props - Component properties.
 * @param {{id:number,name:string,datetime:string,capacity:number}} props.event - Event data.
 * @param {(eventId:number) => Promise<void>} props.onPurchase - Handler invoked on ticket purchase.
 * @param {boolean} props.isLoading - Indicates whether a request is currently in flight.
 * @returns {JSX.Element} Accessible, styled event summary card.
 */
const EventCard = ({ event, onPurchase, isLoading }) => {
  const isSoldOut = event.capacity <= 0;

  return (
    <article
      className={`event-card${isSoldOut ? ' event-card--sold-out' : ''}`}
      aria-label={`${event.name} on ${formatDatetime(event.datetime)}`}
    >
      <header className="event-card__header">
        <h3 className="event-card__title">{event.name}</h3>
        <p className="event-card__datetime">⏱︎ {formatDatetime(event.datetime)}</p>
        <p className="event-card__location">⚲ {formatLocation(event.location)}</p>
      </header>

      <p className="event-card__availability">
        <span className="event-card__capacity-count">{event.capacity}</span>
        <span className="event-card__capacity-label">tickets remaining</span>
      </p>

      <div className="event-card__actions">
        {isSoldOut ? (
          <span className="event-card__sold-out" aria-label={`${event.name} is sold out`}>
            Sold out
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onPurchase(event.id)}
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={`Buy 1 ticket for ${event.name}. ${event.capacity} tickets left.`}
            className="event-card__button"
          >
            {isLoading ? 'Purchasing…' : 'Buy Ticket'}
          </button>
        )}
      </div>
    </article>
  );
};

/**
 * App
 * Purpose: Render the TigerTix events catalog, load event data, and facilitate ticket purchases.
 * Inputs: None (top-level React component)
 * Outputs/Side effects: Fetches events, updates UI state, and exposes announcements to assistive tech.
 */
function App() {
  const [authToken, setAuthToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [authFeedback, setAuthFeedback] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  // Events fetched from the client-service API
  const [events, setEvents] = useState([]);
  // Tracks which event is currently processing a purchase
  const [loadingId, setLoadingId] = useState(null);
  // Accessible feedback for purchases and error handling
  const [message, setMessage] = useState('');
  // Loading indicator for the initial events fetch
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const isAuthenticated = Boolean(authToken && currentUser);

  // Restore session from storage on first render
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = window.sessionStorage.getItem(STORAGE_TOKEN_KEY);
    const storedEmail = window.sessionStorage.getItem(STORAGE_EMAIL_KEY);
    if (storedToken && storedEmail) {
      setAuthToken(storedToken);
      setCurrentUser({ email: storedEmail });
      setIsLoadingEvents(false);
    } else {
      setIsLoadingEvents(false);
    }
  }, []);

  const persistSession = useCallback((token, email) => {
    setAuthToken(token);
    setCurrentUser({ email });
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_TOKEN_KEY, token);
      window.sessionStorage.setItem(STORAGE_EMAIL_KEY, email);
    }
  }, []);

  const clearSession = useCallback((notice) => {
    setAuthToken(null);
    setCurrentUser(null);
    setEvents([]);
    setLoadingId(null);
    setIsLoadingEvents(false);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(STORAGE_TOKEN_KEY);
      window.sessionStorage.removeItem(STORAGE_EMAIL_KEY);
    }
    if (notice) {
      setMessage(notice);
    }
  }, []);

  const handleUnauthorized = useCallback(
    (notice = 'Your session has expired. Please sign in again.') => {
      clearSession(notice);
    },
    [clearSession]
  );

  const authorizedFetch = useCallback(
    async (path, options = {}) => {
      if (!authToken) {
        throw new Error('Missing authentication token');
      }

      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${authToken}`,
      };

      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(buildApiUrl(path), { ...options, headers });
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired');
      }
      return response;
    },
    [authToken, handleUnauthorized]
  );

  const handleAuthFieldChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setAuthFeedback('');
  };

  const loginUser = async (email, password) => {
    const response = await fetch(buildApiUrl('/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Unable to sign in.');
    }
    if (!data.token) {
      throw new Error('Login response missing token.');
    }
    persistSession(data.token, email);
    setMessage(`Signed in as ${email}.`);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthFeedback('');
    setAuthLoading(true);

    try {
      const email = authForm.email.trim();
      const password = authForm.password;

      if (!email || !password) {
        throw new Error('Please provide both email and password.');
      }

      if (authMode === 'register') {
        const firstName = authForm.firstName.trim();
        const lastName = authForm.lastName.trim();
        if (!firstName || !lastName) {
          throw new Error('Please provide your first and last name.');
        }

        const registerRes = await fetch(buildApiUrl('/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName, lastName }),
        });
        const registerBody = await registerRes.json().catch(() => ({}));
        if (!registerRes.ok) {
          if (registerBody.error && registerBody.error.toLowerCase().includes("unique")) {
            throw new Error("Account already exists! Please login instead.");
          }
          throw new Error(registerBody.error || registerBody.message || 'Unable to register.');
        }
        await loginUser(email, password);
        setAuthFeedback('Account created! You are now signed in.');
      } else {
        await loginUser(email, password);
        setAuthFeedback('Signed in successfully.');
      }

      setAuthForm((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      setAuthFeedback(err.message || 'Unable to authenticate. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession('You have been signed out.');
    setAuthFeedback('');
    setAuthMode('login');
  };

  useEffect(() => {
    if (!authToken) {
      setEvents([]);
      setIsLoadingEvents(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingEvents(true);

    authorizedFetch('/events')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load events: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!isCancelled) {
          setEvents(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!isCancelled) {
          setMessage('Unable to load events right now. Please try again soon.');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingEvents(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [authToken, authorizedFetch]);

  /**
   * buyTicket
   * Purpose: Attempt to purchase a single ticket for a given event id.
   * @param {number} eventId - The unique id of the event to purchase.
   * @returns {Promise<void>} Updates component state and announces success/failure.
   */
  const buyTicket = async (eventId) => {
    if (!authToken) {
      setMessage('Please sign in before purchasing tickets.');
      return;
    }
    setLoadingId(eventId);
    try {
      const res = await authorizedFetch(`/events/${eventId}/purchase`, {
        method: 'POST',
        body: JSON.stringify({ quantity: 1 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = 'Purchase failed: ' + (err.error || res.statusText);
        setMessage(msg);
        alert(msg);
      } else {
        // use the updated event returned by the server to update local state
        const updatedEvent = await res.json();
        setEvents((prev) =>
          prev.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev))
        );
        setMessage(
          `Purchased 1 ticket for ${updatedEvent.name}. ` +
            `${updatedEvent.capacity} tickets remaining.`
        );
      }
    } catch (e) {
      console.error(e);
      if (e.message !== 'Session expired') {
        setMessage('Network error during purchase');
        alert('Network error during purchase');
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="App">
      <header className="hero" role="banner">
        <div className="hero__content">
          <p className="hero__eyebrow">TigerTix</p>
          <h1 className="hero__title">Clemson Campus Events</h1>
          <p className="hero__subtitle">
            Discover what&apos;s happening on campus and grab your tickets before
            they sell out.
          </p>
        </div>
      </header>

      <main className="main" aria-labelledby="events-heading">
        {/* Live region for purchase confirmations and status messages */}
        <div role="status" aria-live="polite" className="sr-status">
          {message}
        </div>

        <section className="events-section" aria-labelledby="events-heading">
          <AuthPanel
            mode={authMode}
            onModeChange={switchAuthMode}
            formData={authForm}
            onChange={handleAuthFieldChange}
            onSubmit={handleAuthSubmit}
            loading={authLoading}
            feedback={authFeedback}
            user={currentUser}
            onLogout={handleLogout}
          />
          <div className="events-section__header">
            <h2 id="events-heading">Upcoming events</h2>
            <p>Reserve a spot and cheer on your fellow Tigers.</p>
          </div>

          {!isAuthenticated ? (
            <div className="events-section__state locked-state" role="status">
              Sign in to use the TigerTix Assistant for natural-language and voice bookings.
            </div>
          ) : isLoadingEvents ? (
            <p className="events-section__state" role="status">
              Loading events…
            </p>
          ) : events.length === 0 ? (
            <p className="events-section__state">
              No events are available just yet. Check back soon!
            </p>
          ) : (
            <div className="event-grid" role="list">
              {events.map((event) => (
                <div role="listitem" key={event.id} className="event-grid__item">
                  <EventCard
                    event={event}
                    onPurchase={buyTicket}
                    isLoading={loadingId === event.id}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
        {isAuthenticated ? <ChatbotWidget setAppEvents={setEvents} authFetch={authorizedFetch} /> : null}
      </main>
    </div>
  );
}

export default App;
