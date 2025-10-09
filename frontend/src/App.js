import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch('http://localhost:6001/api/events')
      .then((res) => res.json() )
      .then((data) => setEvents(data) )
      .catch((err) => console.error(err) );
  }, []);

  const [loadingId, setLoadingId] = useState(null);

  const buyTicket = async (eventId) => {
    setLoadingId(eventId);
    try {
      const res = await fetch(`http://localhost:6001/api/events/${eventId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 1 })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Purchase failed: ' + (err.error || res.statusText));
      } else {
        // refresh events
  const updated = await fetch('http://localhost:6001/api/events').then(r => r.json());
        setEvents(updated);
      }
    } catch (e) {
      console.error(e);
      alert('Network error during purchase');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="App">
      <h1>Clemson Campus Events</h1>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            {event.name} - {event.date}{' '}
            <button onClick={() => buyTicket(event.id)} disabled={loadingId===event.id}>
              {loadingId===event.id ? 'Purchasing...' : 'Buy Ticket'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
