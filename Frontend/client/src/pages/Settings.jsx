import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Settings({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeSection, setActiveSection] = useState('account');

    const [statusMsg, setStatusMsg] = useState('');
    const [statusType, setStatusType] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const [sendingReset, setSendingReset] = useState(false);

    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [changingEmail, setChangingEmail] = useState(false);

    const [bugDescription, setBugDescription] = useState('');
    const [sendingBug, setSendingBug] = useState(false);

    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        if (searchParams.get('email_changed') === 'true') {
            setStatusType('success');
            setStatusMsg('Your email address has been updated.');
        } else if (searchParams.get('error') === 'invalid_token') {
            setStatusType('error');
            setStatusMsg('That confirmation link is invalid or has expired.');
        } else if (searchParams.get('error') === 'email_taken') {
            setStatusType('error');
            setStatusMsg('That email is already in use by another account.');
        } else if (searchParams.get('error') === 'server_error') {
            setStatusType('error');
            setStatusMsg('Something went wrong confirming your email.');
        }
    }, [searchParams]);

    const clearStatus = () => {
        setStatusMsg('');
        setStatusType('');
    };

    const handleLogout = async () => {
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

    const handleChangePassword = async (e) => {
        e.preventDefault();
        clearStatus();
        setChangingPassword(true);
        try {
            const res = await fetch('/api/settings/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatusType('success');
                setStatusMsg(data.message || 'Password updated.');
                setCurrentPassword('');
                setNewPassword('');
            } else {
                setStatusType('error');
                setStatusMsg(data.error || 'Failed to update password.');
            }
        } catch (err) {
            console.error(err);
            setStatusType('error');
            setStatusMsg('Network error. Please try again.');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleSendResetEmail = async () => {
        clearStatus();
        setSendingReset(true);
        try {
            const res = await fetch('/api/settings/send-password-reset', {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();
            if (res.ok) {
                setStatusType('success');
                setStatusMsg(data.message || 'Check your email for a reset link.');
            } else {
                setStatusType('error');
                setStatusMsg(data.error || 'Failed to send reset email.');
            }
        } catch (err) {
            console.error(err);
            setStatusType('error');
            setStatusMsg('Network error. Please try again.');
        } finally {
            setSendingReset(false);
        }
    };

    const handleChangeEmail = async (e) => {
        e.preventDefault();
        clearStatus();
        setChangingEmail(true);
        try {
            const res = await fetch('/api/settings/change-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ new_email: newEmail, password: emailPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatusType('success');
                setStatusMsg(data.message || 'Check your new inbox to confirm.');
                setNewEmail('');
                setEmailPassword('');
            } else {
                setStatusType('error');
                setStatusMsg(data.error || 'Failed to change email.');
            }
        } catch (err) {
            console.error(err);
            setStatusType('error');
            setStatusMsg('Network error. Please try again.');
        } finally {
            setChangingEmail(false);
        }
    };

    const handleReportBug = async (e) => {
        e.preventDefault();
        clearStatus();
        setSendingBug(true);
        try {
            const res = await fetch('/api/settings/report-bug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ description: bugDescription }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatusType('success');
                setStatusMsg(data.message || 'Thanks for the report.');
                setBugDescription('');
            } else {
                setStatusType('error');
                setStatusMsg(data.error || 'Failed to send report.');
            }
        } catch (err) {
            console.error(err);
            setStatusType('error');
            setStatusMsg('Network error. Please try again.');
        } finally {
            setSendingBug(false);
        }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        clearStatus();
        setDeleting(true);
        try {
            const res = await fetch('/api/settings/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password: deletePassword }),
            });
            const data = await res.json();
            if (res.ok) {
                if (setCurrentUser) setCurrentUser(null);
                navigate('/');
            } else {
                setStatusType('error');
                setStatusMsg(data.error || 'Failed to delete account.');
                setDeleting(false);
            }
        } catch (err) {
            console.error(err);
            setStatusType('error');
            setStatusMsg('Network error. Please try again.');
            setDeleting(false);
        }
    };

    if (!currentUser) return null;

    const accentColor = theme === 'dark' ? '#ccff00' : '#000000';

    const sectionTabStyle = (isActive) => ({
        flex: 1,
        padding: '0.75rem',
        textAlign: 'center',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.95rem',
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${isActive ? accentColor : 'var(--border-color)'}`,
        color: isActive ? accentColor : 'var(--text-secondary, #64748b)',
    });

    const inputStyle = {
        width: '100%',
        padding: '0.65rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border-color)',
        background: 'var(--card-bg)',
        color: 'inherit',
        boxSizing: 'border-box',
        marginBottom: '0.75rem',
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: 600,
        marginBottom: '0.35rem',
    };

    const cardStyle = {
        padding: '1.5rem',
        marginBottom: '1.5rem',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius)',
    };

    return (
        <>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />

            <main style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                <h2 style={{ marginBottom: '1.25rem' }}>Settings</h2>

                {statusMsg && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        marginBottom: '1.25rem',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.9rem',
                        backgroundColor: statusType === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: statusType === 'success' ? '#22c55e' : '#ef4444',
                        border: `1px solid ${statusType === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                        {statusMsg}
                    </div>
                )}

                <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <button style={sectionTabStyle(activeSection === 'account')} onClick={() => setActiveSection('account')}>
                        Account
                    </button>
                    <button style={sectionTabStyle(activeSection === 'preferences')} onClick={() => setActiveSection('preferences')}>
                        Preferences
                    </button>
                </div>

                {activeSection === 'preferences' && (
                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.05rem' }}>Appearance</h3>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.9rem' }}>
                                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                            </span>
                            <button
                                onClick={toggleTheme}
                                className="btn btn-primary"
                                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                            >
                                Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
                            </button>
                        </div>
                    </div>
                )}

                {activeSection === 'account' && (
                    <>
                        <div style={cardStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.05rem' }}>Change Password</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                Update your password directly, or have a reset link sent to your email instead.
                            </p>
                            <form onSubmit={handleChangePassword}>
                                <label style={labelStyle}>Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    style={inputStyle}
                                    required
                                />
                                <label style={labelStyle}>New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Min 8 chars, 1 number, 1 special char"
                                    style={inputStyle}
                                    required
                                />
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <button type="submit" disabled={changingPassword} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                                        {changingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendResetEmail}
                                        disabled={sendingReset}
                                        style={{
                                            padding: '0.5rem 1.25rem',
                                            fontSize: '0.85rem',
                                            background: 'transparent',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius)',
                                            color: 'inherit',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {sendingReset ? 'Sending...' : 'Email Me a Reset Link Instead'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div style={cardStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.05rem' }}>Change Email</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                Current email: <strong>{currentUser.email}</strong>. We'll send a confirmation link to your new address.
                            </p>
                            <form onSubmit={handleChangeEmail}>
                                <label style={labelStyle}>New Email</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    style={inputStyle}
                                    required
                                />
                                <label style={labelStyle}>Current Password</label>
                                <input
                                    type="password"
                                    value={emailPassword}
                                    onChange={(e) => setEmailPassword(e.target.value)}
                                    style={inputStyle}
                                    required
                                />
                                <button type="submit" disabled={changingEmail} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                                    {changingEmail ? 'Sending...' : 'Send Confirmation'}
                                </button>
                            </form>
                        </div>

                        <div style={cardStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.05rem' }}>Report a Bug</h3>
                            <form onSubmit={handleReportBug}>
                                <textarea
                                    value={bugDescription}
                                    onChange={(e) => setBugDescription(e.target.value)}
                                    placeholder="Describe what went wrong..."
                                    rows="4"
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    required
                                />
                                <button type="submit" disabled={sendingBug} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                                    {sendingBug ? 'Sending...' : 'Send Report'}
                                </button>
                            </form>
                        </div>

                        <div style={{ ...cardStyle, borderColor: '#ef4444' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.05rem', color: '#ef4444' }}>Delete Account</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                This permanently deletes your account. This cannot be undone.
                            </p>
                            {!confirmingDelete ? (
                                <button
                                    onClick={() => setConfirmingDelete(true)}
                                    style={{
                                        padding: '0.5rem 1.25rem',
                                        fontSize: '0.85rem',
                                        background: '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: 'var(--radius)',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                    }}
                                >
                                    Delete My Account
                                </button>
                            ) : (
                                <form onSubmit={handleDeleteAccount}>
                                    <label style={labelStyle}>Enter your password to confirm</label>
                                    <input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        style={inputStyle}
                                        required
                                    />
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            type="submit"
                                            disabled={deleting}
                                            style={{
                                                padding: '0.5rem 1.25rem',
                                                fontSize: '0.85rem',
                                                background: '#ef4444',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: 'var(--radius)',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {deleting ? 'Deleting...' : 'Confirm Delete'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setConfirmingDelete(false);
                                                setDeletePassword('');
                                            }}
                                            style={{
                                                padding: '0.5rem 1.25rem',
                                                fontSize: '0.85rem',
                                                background: 'transparent',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius)',
                                                color: 'inherit',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </>
                )}

                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius)',
                            color: 'inherit',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                        }}
                    >
                        Log Out
                    </button>
                </div>
            </main>
        </>
    );
}