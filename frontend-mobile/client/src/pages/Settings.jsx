import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

const SunIcon = ({ strokeColor = 'currentColor' }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
const MoonIcon = ({ strokeColor = 'currentColor' }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ stroke: strokeColor, fill: 'none' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);

export default function Settings({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [openSections, setOpenSections] = useState({
        appearance: true,
        password: false,
        email: false,
        bug: false,
        delete: false,
    });

    const toggleSection = (key) => {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

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
            setOpenSections((prev) => ({ ...prev, email: true }));
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

    const handleChangePassword = async (e) => {
        e.preventDefault();
        clearStatus();
        setChangingPassword(true);
        try {
            const res = await fetch('https://stemnet.app/api/settings/change-password', {
                credentials: 'include',
method: 'POST',
                credentials: 'include',
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
            const res = await fetch('https://stemnet.app/api/settings/send-password-reset', {
                credentials: 'include',
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
            const res = await fetch('https://stemnet.app/api/settings/change-email', {
                credentials: 'include',
method: 'POST',
                credentials: 'include',
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
            const res = await fetch('https://stemnet.app/api/settings/report-bug', {
                credentials: 'include',
method: 'POST',
                credentials: 'include',
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
            const res = await fetch('https://stemnet.app/api/settings/delete-account', {
                credentials: 'include',
method: 'POST',
                credentials: 'include',
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

    const AccordionHeader = ({ title, sectionKey, danger }) => (
        <TouchableOpacity
            onPress={() => toggleSection(sectionKey)}
            style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.1rem 1.25rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.05rem',
                fontWeight: 600,
                color: danger ? '#ef4444' : 'inherit',
                textAlign: 'left',
            }}
        >
            <Text>{title}</Text>
            <Text
                style={{
                    display: 'inline-block',
                    transform: openSections[sectionKey] ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease',
                    color: danger ? '#ef4444' : accentColor,
                }}
            >
                ▾
            </Text>
        </TouchableOpacity>
    );

    const accordionWrapperStyle = (danger) => ({
        marginBottom: '1rem',
        background: 'var(--card-bg)',
        border: `1px solid ${danger ? '#ef4444' : 'var(--border-color)'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
    });

    const accordionBodyStyle = {
        padding: '0 1.25rem 1.25rem 1.25rem',
    };

    return (
        <>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />

            <main style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                <Text style={{ marginBottom: '1.25rem' }}>Settings</Text>

                {statusMsg && (
                    <View style={{
                        padding: '0.75rem 1rem',
                        marginBottom: '1.25rem',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.9rem',
                        backgroundColor: statusType === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: statusType === 'success' ? '#22c55e' : '#ef4444',
                        border: `1px solid ${statusType === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                        {statusMsg}
                    </View>
                )}

                <View style={accordionWrapperStyle(false)}>
                    <AccordionHeader title="Appearance" sectionKey="appearance" />
                    {openSections.appearance && (
                        <View style={accordionBodyStyle}>
                            <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
                                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                                </Text>
                                <TouchableOpacity
                                    onPress={toggleTheme}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {theme === 'dark' ? <SunIcon strokeColor="currentColor" /> : <MoonIcon strokeColor="currentColor" />}
                                    Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                <View style={accordionWrapperStyle(false)}>
                    <AccordionHeader title="Change Password" sectionKey="password" />
                    {openSections.password && (
                        <View style={accordionBodyStyle}>
                            <Text style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                Update your password directly, or have a reset link sent to your email instead.
                            </Text>
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
                                <View style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <TouchableOpacity type="submit" disabled={changingPassword} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                                        {changingPassword ? 'Updating...' : 'Update Password'}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        type="button"
                                        onPress={handleSendResetEmail}
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
                                    </TouchableOpacity>
                                </View>
                            </form>
                        </View>
                    )}
                </View>

                <View style={accordionWrapperStyle(false)}>
                    <AccordionHeader title="Change Email" sectionKey="email" />
                    {openSections.email && (
                        <View style={accordionBodyStyle}>
                            <Text style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                Current email: <strong>{currentUser.email}</strong>. We'll send a confirmation link to your new address.
                            </Text>
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
                                <TouchableOpacity type="submit" disabled={changingEmail} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                                    {changingEmail ? 'Sending...' : 'Send Confirmation'}
                                </TouchableOpacity>
                            </form>
                        </View>
                    )}
                </View>

                <View style={accordionWrapperStyle(false)}>
                    <AccordionHeader title="Report a Bug" sectionKey="bug" />
                    {openSections.bug && (
                        <View style={accordionBodyStyle}>
                            <form onSubmit={handleReportBug}>
                                <textarea
                                    value={bugDescription}
                                    onChange={(e) => setBugDescription(e.target.value)}
                                    placeholder="Describe what went wrong..."
                                    rows="4"
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    required
                                />
                                <TouchableOpacity type="submit" disabled={sendingBug} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                                    {sendingBug ? 'Sending...' : 'Send Report'}
                                </TouchableOpacity>
                            </form>
                        </View>
                    )}
                </View>

                <View style={accordionWrapperStyle(true)}>
                    <AccordionHeader title="Delete Account" sectionKey="delete" danger />
                    {openSections.delete && (
                        <View style={accordionBodyStyle}>
                            <Text style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                This permanently deletes your account. This cannot be undone.
                            </Text>
                            {!confirmingDelete ? (
                                <TouchableOpacity
                                    onPress={() => setConfirmingDelete(true)}
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
                                </TouchableOpacity>
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
                                    <View style={{ display: 'flex', gap: '0.75rem' }}>
                                        <TouchableOpacity
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
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            type="button"
                                            onPress={() => {
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
                                        </TouchableOpacity>
                                    </View>
                                </form>
                            )}
                        </View>
                    )}
                </View>
            </main>
        </>
    );
}


const { width } = Dimensions.get('window');

// 1. Color Palette (Light & Dark Theme Tokens)
export const theme = {
  light: {
    bg: '#f8fafc',
    cardBg: '#ffffff',
    text: '#000000',
    borderColor: '#e2e8f0',
    primary: '#ccff00',
    primaryHover: '#b3e600',
    primaryText: '#000000',
    danger: '#ef4444',
    secondaryText: '#475569',
    headerBg: '#0f172a',
    headerText: '#ffffff',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeText: '#047857',
    badgeBorder: '#10b981',
  },
  dark: {
    bg: '#000000',
    cardBg: '#121212',
    text: '#ffffff',
    borderColor: '#333333',
    primary: '#ccff00',
    primaryHover: '#b3e600',
    primaryText: '#000000',
    danger: '#ef4444',
    secondaryText: '#94a3b8',
    headerBg: '#000000',
    headerText: '#ffffff',
    badgeBg: 'rgba(204, 255, 0, 0.12)',
    badgeText: '#ccff00',
    badgeBorder: '#ccff00',
  },
};

// 2. React Native Stylesheet
export const styles = StyleSheet.create({
  // --- Containers & Layout ---
  mainContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  brand: {
    fontWeight: '700',
    fontSize: 20,
    color: '#ccff00',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // --- Cards ---
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#121212',
    borderColor: '#333333',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  timestamp: {
    fontSize: 13,
    color: '#64748b',
  },

  // --- Buttons ---
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  btnPrimary: {
    backgroundColor: '#ccff00',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    // Emulates retro 3D shadow in RN:
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 15,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  btnOutlineText: {
    color: '#000000',
    fontWeight: '500',
  },
  btnGithub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#24292e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnGithubText: {
    color: '#ffffff',
    fontSize: 13,
  },

  // --- Form Controls ---
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },

  // --- Hero Section ---
  hero: {
    backgroundColor: '#0f172a',
    paddingVertical: 40,
    paddingHorizontal: 32,
    borderRadius: 6,
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#ffffff',
  },
  heroText: {
    color: '#ffffff',
    marginBottom: 24,
    fontSize: 17,
  },

  // --- Flash Messages ---
  flash: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
  },
  flashText: {
    fontSize: 14,
  },
  flashInfo: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd', borderWidth: 1 },
  flashWarning: { backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1 },
  flashDanger: { backgroundColor: '#fee2e2', borderColor: '#fecaca', borderWidth: 1 },
  flashSuccess: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0', borderWidth: 1 },

  // --- Vault Section ---
  vaultGrid: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 40,
  },
  vaultCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 20,
    justifyContent: 'space-between',
  },
  vaultBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: '#047857',
    borderWidth: 1,
    borderColor: '#10b981',
  },

  // --- Avatar ---
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});

