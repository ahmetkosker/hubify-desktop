/* eslint-disable react/button-has-type */
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { useState, useEffect } from 'react';

function Hello() {
  const [message, setMessage] = useState('');
  const [serverMessages, setServerMessages] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.onServerMessage(
      (serverMsg) => {
        setServerMessages((prevMessages) => [...prevMessages, serverMsg]);
      },
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSendMessage = () => {
    if (message.trim()) {
      window.electron.ipcRenderer.sender(message);
      setMessage('');
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '20px',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ padding: '8px', marginRight: '10px' }}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '5px',
          padding: '10px',
          height: '300px',
          overflowY: 'scroll',
        }}
      >
        {serverMessages.map((msg) => (
          <div style={{ marginBottom: '8px', color: 'black' }}>{msg}</div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
