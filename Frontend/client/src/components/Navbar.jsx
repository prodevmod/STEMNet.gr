import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
    console.log('Navbar hasUnreadNotifications:', hasUnreadNotifications, typeof hasUnreadNotifications);

    const navigate = useNavigate();
    const location = useLocation();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        setDropdownOpen(false);
    }, [location]);

    useEffect(() => {
        if (dropdownOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [dropdownOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setDropdownOpen(false);
            }
        };

        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [dropdownOpen]);

    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            if (setCurrentUser) setCurrentUser(null);
            navigate('/login');
        }
    };

    const lightGreen = '#ccff00';
    const dropdownBg = theme === 'light' ? '#0b192c' : '#000000';
    const dropdownBorderColor = theme === 'light' ? '#1e293b' : '#333333';

    return (
        <header style={{ position: 'sticky', top: 0, zIndex: 1000, background: dropdownBg, borderBottom: theme === 'dark' ? 'none' : '1px solid #1e293b' }}>
            <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto', padding: '0.5rem 1rem', color: lightGreen }}>
                
                {/* Brand Logo & Title */}
                <Link to="/" className="nav-brand" title="STEMNet Greece Home" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', fontWeight: 700, color: lightGreen }}>
                    <img src="/logo.png" alt="STEMNet Logo" width="30" height="30" />
                    <span style={{ color: lightGreen }}>STEMNet.gr</span>
                </Link>

                {/* Desktop Navigation Menu */}
                <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', color: lightGreen }}>
                    {currentUser && (
                        <>
                            <Link to="/education" title="Education" style={{ color: lightGreen, display: 'flex', alignItems: 'center' }}><StemIcon strokeColor={lightGreen} /></Link>
                            <Link to="/groups" title="Groups" style={{ color: lightGreen, display: 'flex', alignItems: 'center' }}><GroupIcon strokeColor={lightGreen} /></Link>
                            <Link to="/events" title="Events" style={{ color: lightGreen, display: 'flex', alignItems: 'center' }}><EventsIcon strokeColor={lightGreen} /></Link>
                            
                            {/* Dynamic Notification Icon (inline SVG, no external asset dependency) */}
                            <Link to="/notifications" title="Notifications" style={{ color: lightGreen, display: 'flex', alignItems: 'center', position: 'relative' }}>
                                {hasUnreadNotifications ? (
                                    <BellFilledIcon strokeColor={lightGreen} />
                                ) : (
                                    <BellOutlineIcon strokeColor={lightGreen} />
                                )}
                            </Link>
                            
                            <Link to={`/profile/${currentUser.username}`} title="Profile" style={{ color: lightGreen, display: 'flex', alignItems: 'center' }}><ProfileIcon strokeColor={lightGreen} /></Link>
                            <Link to="/search" title="Search" style={{ color: lightGreen, display: 'flex', alignItems: 'center' }}><SearchIcon strokeColor={lightGreen} /></Link>
                        </>
                    )}

                    {/* Theme Toggle Button */}
                    <button onClick={toggleTheme} className="theme-toggle-btn" aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: lightGreen }}>
                        {theme === 'dark' ? <SunIcon strokeColor={lightGreen} /> : <MoonIcon strokeColor={lightGreen} />}
                    </button>

                    {currentUser ? (
                        <>
                            <Link to="/create-post" className="btn btn-primary" style={{ color: lightGreen, borderColor: lightGreen, backgroundColor: 'transparent' }}>+ New Post</Link>
                            <button 
                                type="button" 
                                onClick={handleLogout} 
                                className="nav-logout-link" 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: lightGreen, fontSize: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                                <LogoutIcon strokeColor={lightGreen} />
                                <span style={{ color: lightGreen }}>Logout</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-primary" style={{ color: lightGreen, borderColor: lightGreen, backgroundColor: 'transparent' }}>Log In</Link>
                            <Link to="/register" className="btn btn-primary" style={{ color: lightGreen, borderColor: lightGreen, backgroundColor: 'transparent' }}>Register</Link>
                        </>
                    )}
                </div>

                {/* Mobile Dropdown Menu Container */}
                <div className="nav-dropdown-toggle-container" ref={dropdownRef}>
                    <button 
                        onClick={() => setDropdownOpen(!dropdownOpen)} 
                        aria-label="Toggle Navigation Menu"
                        aria-expanded={dropdownOpen}
                        aria-haspopup="true"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center', color: lightGreen }}
                    >
                        <DropdownToggleIcon strokeColor={lightGreen} />
                    </button>

                    {dropdownOpen && (
                        <div className="dropdown-menu-popup" style={{
                            position: 'absolute', top: '100%', left: '0', width: '100%',
                            height: 'calc(100vh - 60px)', maxHeight: 'calc(100vh - 60px)', overflowY: 'auto',
                            WebkitOverflowScrolling: 'touch', background: dropdownBg, borderBottom: `1px solid ${dropdownBorderColor}`,
                            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.15)', zIndex: 1000, boxSizing: 'border-box', color: lightGreen
                        }}>
                            {currentUser && (
                                <>
                                    <Link to="/education" style={mobileLinkStyle(lightGreen)}><StemIcon strokeColor={lightGreen} /> <span>Education</span></Link>
                                    <Link to="/groups" style={mobileLinkStyle(lightGreen)}><GroupIcon strokeColor={lightGreen} /> <span>Groups</span></Link>
                                    <Link to="/events" style={mobileLinkStyle(lightGreen)}><EventsIcon strokeColor={lightGreen} /> <span>Events</span></Link>
                                    
                                    {/* Mobile Dynamic Notification Icon */}
                                    <Link to="/notifications" style={mobileLinkStyle(lightGreen)}>
                                        {hasUnreadNotifications ? (
                                            <BellFilledIcon strokeColor={lightGreen} />
                                        ) : (
                                            <BellOutlineIcon strokeColor={lightGreen} />
                                        )}
                                        <span>Notifications{hasUnreadNotifications ? ' (New)' : ''}</span>
                                    </Link>
                                    
                                    <Link to={`/profile/${currentUser.username}`} style={mobileLinkStyle(lightGreen)}><ProfileIcon strokeColor={lightGreen} /> <span>Profile</span></Link>
                                    <Link to="/search" style={mobileLinkStyle(lightGreen)}><SearchIcon strokeColor={lightGreen} /> <span>Search</span></Link>
                                </>
                            )}

                            <button onClick={toggleTheme} style={{ ...mobileLinkStyle(lightGreen), background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                {theme === 'dark' ? <SunIcon strokeColor={lightGreen} /> : <MoonIcon strokeColor={lightGreen} />} 
                                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                            </button>

                            <hr style={{ border: '0', borderTop: `1px solid ${dropdownBorderColor}`, margin: '0.2rem 0' }} />

                            {currentUser ? (
                                <>
                                    <Link to="/create-post" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', padding: '0.75rem', fontWeight: 'bold', color: lightGreen, borderColor: lightGreen }}>+ New Post</Link>
                                    <button 
                                        type="button" 
                                        onClick={handleLogout} 
                                        style={{ ...mobileLinkStyle(lightGreen), background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        <LogoutIcon strokeColor={lightGreen} /> <span>Logout</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', padding: '0.75rem', color: lightGreen, borderColor: lightGreen }}>Log In</Link>
                                    <Link to="/register" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', padding: '0.75rem', color: lightGreen, borderColor: lightGreen }}>Register</Link>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            <style>{`
                .nav-dropdown-toggle-container { display: none; }
                @media (max-width: 768px) {
                    .nav-links-desktop { display: none !important; }
                    .nav-dropdown-toggle-container { display: block !important; }
                }
            `}</style>
        </header>
    );
}

const mobileLinkStyle = (color) => ({
    textDecoration: 'none',
    color,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '1.1rem'
});

const StemIcon = ({ strokeColor }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
);
const GroupIcon = ({ strokeColor }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);
const EventsIcon = ({ strokeColor }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);
const ProfileIcon = ({ strokeColor }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);
const SearchIcon = ({ strokeColor }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);
const SunIcon = ({ strokeColor }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
);
const MoonIcon = ({ strokeColor }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);
const DropdownToggleIcon = ({ strokeColor }) => (
    <svg width="26" height="26" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
);
const LogoutIcon = ({ strokeColor }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
);


const BellOutlineIcon = ({ strokeColor }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
);


const BellFilledIcon = ({ strokeColor }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
        <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            fill={strokeColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx="18.5" cy="6" r="4.5" fill="#ef4444" stroke="#000000" strokeWidth="1" />
    </svg>
);