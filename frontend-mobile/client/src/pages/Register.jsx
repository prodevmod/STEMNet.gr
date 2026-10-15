import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Recaptcha from '../components/Recaptcha';

export default function Register() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirm_password: '',
        age: '',
        grade: '',
        interest: '',
        github_user: '',
        linkedin_url: '',
        custom_link_1: '',
        custom_link_2: '',
        custom_link_3: '',
        custom_link_4: '',
        custom_link_5: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [recaptchaToken, setRecaptchaToken] = useState('');
    
    const navigate = useNavigate();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    useEffect(() => {
        fetch('https://stemnet.app/api/auth/me', { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setCurrentUser(data?.user || null))
            .catch(() => setCurrentUser(null));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match.');
            return;
        }

        if (!recaptchaToken) {
            setError('Please complete the reCAPTCHA.');
            return;
        }

        setLoading(true);

        try {
            await sendRegistrationRequest({ ...formData, recaptcha_token: recaptchaToken });
        } catch (err) {
            console.error('Registration error:', err);
            setError('An unexpected error occurred.');
            setLoading(false);
        }
    };

    const sendRegistrationRequest = async (payloadData) => {
        try {
            const res = await fetch('https://stemnet.app/api/register', {
                credentials: 'include',
method: 'POST',
                credentials: 'include',
headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadData),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message || 'Registration successful! Please check your email to verify.');
                navigate('/login');
            } else {
                setError(data.error || 'Registration failed.');
                if (window.grecaptcha) window.grecaptcha.reset();
                setRecaptchaToken('');
            }
        } catch (err) {
            console.error('Registration network error:', err);
            setError('An unexpected network error occurred.');
            if (window.grecaptcha) window.grecaptcha.reset();
            setRecaptchaToken('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar currentUser={null} theme={theme} toggleTheme={toggleTheme} />

            <main className="app-main-container">
                <View className="card" style={{ maxWidth: '560px', margin: '0 auto' }}>
                    <Text style={{ marginBottom: '0.5rem' }}>Join STEMNet</Text>
                    <Text style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        Create an account to showcase your STEM projects and connect with Greek robotics teams.
                    </Text>

                    {error && (
                        <View style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            {error}
                        </View>
                    )}

                    <form onSubmit={handleSubmit}>
                        <View className="form-group">
                            <label htmlFor="username">Username *</label>
                            <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required autoComplete="off" placeholder="e.g. robotics_nikos" />
                        </View>

                        <View className="form-group">
                            <label htmlFor="email">Email Address *</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="off" placeholder="example@email.com" />
                        </View>

                        <View className="form-group">
                            <label htmlFor="password">Password *</label>
                            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Min 8 chars, 1 number, 1 special char" />
                        </View>

                        <View className="form-group">
                            <label htmlFor="confirm_password">Confirm Password *</label>
                            <input type="password" id="confirm_password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} required placeholder="Re-enter password" />
                        </View>

                        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

                        <View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <View className="form-group">
                                <label htmlFor="age">Age *</label>
                                <input type="number" id="age" name="age" min="10" max="100" value={formData.age} onChange={handleChange} required placeholder="16" />
                            </View>

                            <View className="form-group">
                                <label htmlFor="grade">School Grade *</label>
                                <select id="grade" name="grade" value={formData.grade} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
                                    <option value="" disabled>Select Grade</option>
                                    <option value="Gymnasium">Gymnasium (A-C)</option>
                                    <option value="A Lyceum">A' Lyceum</option>
                                    <option value="B Lyceum">B' Lyceum</option>
                                    <option value="C Lyceum">C' Lyceum</option>
                                    <option value="University / Mentor">University / Mentor</option>
                                </select>
                            </View>
                        </View>

                        <View className="form-group">
                            <label htmlFor="interest">Main STEM Interest *</label>
                            <select id="interest" name="interest" value={formData.interest} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
                                <option value="" disabled>Select Primary Interest</option>
                                <option value="3D Modeling & CAD">3D Modeling & CAD</option>
                                <option value="Robotics & Microcontrollers">Robotics & Microcontrollers (Arduino/Raspberry Pi)</option>
                                <option value="Software & Web Engineering">Software & Web Engineering</option>
                                <option value="Electronics & PCB Design">Electronics & PCB Design</option>
                                <option value="AI & Data Science">AI & Data Science</option>
                                <option value="Physics & Applied Math">Physics & Applied Math</option>
                            </select>
                        </View>

                        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

                        <Text style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Socials & Portfolio (Optional)</Text>
                        
                        <View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <View className="form-group">
                                <label htmlFor="github_user">GitHub Username</label>
                                <input type="text" id="github_user" name="github_user" value={formData.github_user} onChange={handleChange} placeholder="alex-robotics" />
                            </View>

                            <View className="form-group">
                                <label htmlFor="linkedin_url">LinkedIn URL</label>
                                <input type="url" id="linkedin_url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                            </View>
                        </View>

                        <View className="form-group">
                            <label htmlFor="custom_link_1">Custom Links</label>
                            <input type="text" id="custom_link_1" name="custom_link_1" value={formData.custom_link_1} onChange={handleChange} placeholder="e.g. Discord Tag or Server Link" />
                        </View>

                        <View className="form-group">
                            <input type="text" id="custom_link_2" name="custom_link_2" value={formData.custom_link_2} onChange={handleChange} placeholder=" e.g. https://instagram.com/..." />
                        </View>

                        <View className="form-group">
                            <input type="text" id="custom_link_3" name="custom_link_3" value={formData.custom_link_3} onChange={handleChange} placeholder=" e.g. Slack Channel or Invite Link" />
                        </View>

                        <View className="form-group">
                            <input type="text" id="custom_link_4" name="custom_link_4" value={formData.custom_link_4} onChange={handleChange} placeholder=" e.g. https://myroboticslab.gr" />
                        </View>

                        <View className="form-group">
                            <input type="text" id="custom_link_5" name="custom_link_5" value={formData.custom_link_5} onChange={handleChange} placeholder=" e.g. https://example.com" />
                        </View>

                        <View className="form-group" style={{ marginTop: '0.5rem' }}>
                            <Recaptcha onChange={setRecaptchaToken} />
                        </View>

                        <TouchableOpacity type="submit" disabled={loading || !recaptchaToken} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', cursor: (loading || !recaptchaToken) ? 'not-allowed' : 'pointer' }}>
                            {loading ? 'Registering...' : 'Register Account'}
                        </TouchableOpacity>
                    </form>
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

