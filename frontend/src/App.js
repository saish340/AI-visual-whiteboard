import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import WhiteboardPage from './components/WhiteboardPage';
import DashboardPage from './components/DashboardPage';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check saved preference
    const saved = localStorage.getItem('darkMode');
    if (saved) {
      setIsDarkMode(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Apply dark mode
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardPage toggleDarkMode={() => setIsDarkMode(!isDarkMode)} isDarkMode={isDarkMode} />} />
        <Route path="/board/:boardId" element={<WhiteboardPage toggleDarkMode={() => setIsDarkMode(!isDarkMode)} isDarkMode={isDarkMode} />} />
      </Routes>
    </Router>
  );
}

export default App;
