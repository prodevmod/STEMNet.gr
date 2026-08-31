import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ServerError from './pages/ServerError';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Followers from './pages/Followers';
import Following from './pages/Following';
import EditPost from './pages/EditPost';
import PostThread from './pages/PostThread';
import EventDetails from './pages/EventDetails';
import Notifications from './pages/Notifications';
import CreatePost from './pages/CreatePost';
import Events from './pages/Events';
import Groups from './pages/Groups';
import GroupPosts from './pages/GroupPosts';
import Education from './pages/Education';
import CreateGroup from './pages/CreateGroup';
import Settings from './pages/Settings';
import './style.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCurrentUser(data?.user || null);
        setAuthChecked(true);
      })
      .catch(() => {
        setCurrentUser(null);
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setHasUnreadNotifications(false);
      return;
    }
    const checkUnread = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications/unread`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setHasUnreadNotifications(Boolean(data.has_unread));
        }
      } catch (err) {
        console.error('Failed to check notifications:', err);
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  if (!authChecked) {
    return <div style={{ textAlign: 'center', marginTop: '20rem' }}>Loading STEMNet...</div>;
  }

  return (
    <Router>
      <div className="main-layout">
        <Routes>
          <Route path="/" element={<Home currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/register" element={<Register theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/login" element={<Login setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />} />
          
          <Route path="/search" element={<Search currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/notifications" element={<Notifications currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} setHasUnreadNotifications={setHasUnreadNotifications} />} />
          <Route path="/profile/:username" element={<Profile currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/followers/:username" element={<Followers currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/following/:username" element={<Following currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />

          <Route path="/groups" element={<Groups currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/groups/:groupId" element={<GroupPosts currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/education" element={<Education currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />

          <Route path="/create-post" element={<CreatePost currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/post/edit/:postId" element={<EditPost currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/post/:id" element={<PostThread currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/posts/:postId" element={<EventDetails currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />

          <Route path="/create-group" element={<CreateGroup currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/events" element={<Events currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/settings" element={<Settings currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />} />
          <Route path="/500" element={<ServerError />} />
          
          {/* Catch-all route MUST remain at the bottom */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;