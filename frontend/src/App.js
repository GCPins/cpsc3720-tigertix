import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState({});
  const [totalTickets, setTotalTickets] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/events')
    .then((res) => res.json())
    .then((data) => setEvents(data))
    .then((err) => console.error(err));
  }, []);

  const buyTicket = (eventName) => {
    setTickets(prev => ({
      ...prev,
      [eventName]: (prev[eventName] || 0) + 1
    }));
    setTotalTickets((totalTickets || 0) + 1);
    alert(`Ticket purchased for: ${eventName}`);
  }

  const sellTicket = (eventName) => {
    setTickets(prev => ({
      ...prev,
      [eventName]: (prev[eventName] || 1) - 1
    }));
    // let updateTickets = (totalTickets == 0) ? 0 : totalTickets - 1;
    // setTotalTickets(updateTickets);
    setTotalTickets((totalTickets || 1) - 1);
    alert(`Ticket obliterated for: ${eventName}`);
  }

  return (
    <div className="App">
    <h1>Clemson Campus Events</h1>
    Total Num Tickets: {totalTickets}
    <ul>
      {events.map((event) => (
        <li key={event.id}>
        {event.name} - {event.date}{' '}
        <button onClick={() => buyTicket(event.name)}>Buy Ticket</button>
        {' '}Num Tickets: {tickets[event.name] || 0}{' '}
        <button onClick={() => sellTicket(event.name)}>Forfeit Ticket</button>
        </li>
      ))}
    </ul>
    </div>
  );
}

export default App;
