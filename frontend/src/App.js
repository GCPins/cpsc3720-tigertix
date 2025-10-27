import React, { useEffect, useState } from 'react';
import './App.css';

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
 * Floating chat assistant with voice input, greetings, events,
 * and placeholder for LLM parse & reply APIs on port 7001.
 */
const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [events, setEvents] = useState([]);
  const recognitionRef = React.useRef(null);

  // --- Load events ---
  useEffect(() => {
    fetch('http://localhost:6001/api/events')
      .then((res) => res.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load events:', err));
  }, []);

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
      addMessage('user', text);

      // --- Placeholder for LLM parse POST ---
      /*
      try {
        const parseRes = await fetch('http://localhost:7001/api/llm/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const parseData = await parseRes.json();
        console.log('Parsed user command:', parseData); // { event, tickets, intent }
      } catch (err) {
        console.error('LLM parse API error:', err);
      }
      */

      // --- Placeholder for LLM reply GET ---
      /*
      try {
        const replyRes = await fetch(
          `http://localhost:7001/api/llm/reply?text=${encodeURIComponent(text)}`
        );
        if (replyRes.ok) {
          const replyData = await replyRes.json(); // { reply: "..." }
          addMessage('bot', replyData.reply);
          speakText(replyData.reply);
        } else {
          addMessage('bot', "Sorry, couldn't get a reply from assistant.");
          speakText("Sorry, couldn't get a reply from assistant.");
        }
      } catch (err) {
        console.error('LLM reply API error:', err);
        addMessage('bot', 'Error contacting assistant.');
        speakText('Error contacting assistant.');
      }
      */

      // --- Hard-coded reply for now ---
      const hardCodedReply = `🤖 Got it! You said: "${text}".`;
      addMessage('bot', hardCodedReply);
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

  // --- Greet when opened ---
  useEffect(() => {
    if (!open) return;

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
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <p key={idx} className={msg.sender === 'user' ? 'user-msg' : 'bot-msg'}>
                {msg.text}
              </p>
            ))}
            {listening && <p className="system-msg" aria-live="polite">Listening...</p>}
          </div>

          <div className="chat-controls">
            <button className="mic-btn" onClick={toggleRecording}>
              {listening ? '🛑 Stop' : '🎤 Speak'}
            </button>
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
  // Events fetched from the client-service API
  const [events, setEvents] = useState([]);
  // Tracks which event is currently processing a purchase
  const [loadingId, setLoadingId] = useState(null);
  // Accessible feedback for purchases and error handling
  const [message, setMessage] = useState('');
  // Loading indicator for the initial events fetch
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    fetch('http://localhost:6001/api/events')
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
  }, []);

  /**
   * buyTicket
   * Purpose: Attempt to purchase a single ticket for a given event id.
   * @param {number} eventId - The unique id of the event to purchase.
   * @returns {Promise<void>} Updates component state and announces success/failure.
   */
  const buyTicket = async (eventId) => {
    setLoadingId(eventId);
    try {
      const res = await fetch(
        `http://localhost:6001/api/events/${eventId}/purchase`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: 1 }),
        }
      );
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
      setMessage('Network error during purchase');
      alert('Network error during purchase');
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
          <div className="events-section__header">
            <h2 id="events-heading">Upcoming events</h2>
            <p>Reserve a spot and cheer on your fellow Tigers.</p>
          </div>

          {isLoadingEvents ? (
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
        <ChatbotWidget />
      </main>
    </div>
  );
}

export default App;
