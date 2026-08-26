import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

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
    
    const navigate = useNavigate();

    // Theme persistence
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    // Check auth status for navbar
    useEffect(() => {
        fetch('/api/auth/me', { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setCurrentUser(data?.user || null))
            .catch(() => setCurrentUser(null));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirm_password) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

        if (window.grecaptcha && recaptchaKey) {
            window.grecaptcha.ready(() => {
                window.grecaptcha.execute(recaptchaKey, { action: 'submit' }).then((token) => {
                    sendRegistrationRequest({ ...formData, 'g-recaptcha-response': token });
                }).catch(() => {
                    sendRegistrationRequest(formData);
                });
            });
        } else {
            sendRegistrationRequest(formData);
        }
    };

    const sendRegistrationRequest = async (payloadData) => {
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
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
            }
        } catch (err) {
            console.error('Registration network error:', err);
            setError('An unexpected network error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />

            <main className="app-main-container">
                <div className="card" style={{ maxWidth: '560px', margin: '0 auto' }}>
                    <h2 style={{ marginBottom: '0.5rem' }}>Join STEMNet</h2>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        Create an account to showcase your STEM projects and connect with Greek robotics teams.
                    </p>

                    {error && (
                        <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="username">Username *</label>
                            <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required autoComplete="off" placeholder="e.g. robotics_nikos" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email Address *</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="off" placeholder="example@email.com" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password *</label>
                            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Min 8 chars, 1 number, 1 special char" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm_password">Confirm Password *</label>
                            <input type="password" id="confirm_password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} required placeholder="Re-enter password" />
                        </div>

                        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label htmlFor="age">Age *</label>
                                <input type="number" id="age" name="age" min="10" max="100" value={formData.age} onChange={handleChange} required placeholder="16" />
                            </div>

                            <div className="form-group">
                                <label htmlFor="grade">School Grade *</label>
                                <select id="grade" name="grade" value={formData.grade} onChange={handleChange} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
                                    <option value="" disabled>Select Grade</option>
                                    <option value="Gymnasium">Gymnasium (A-C)</option>
                                    <option value="A Lyceum">A' Lyceum</option>
                                    <option value="B Lyceum">B' Lyceum</option>
                                    <option value="C Lyceum">C' Lyceum</option>
                                    <option value="University / Mentor">University / Mentor</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
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
                        </div>

                        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

                        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Socials & Portfolio (Optional)</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label htmlFor="github_user">GitHub Username</label>
                                <input type="text" id="github_user" name="github_user" value={formData.github_user} onChange={handleChange} placeholder="alex-robotics" />
                            </div>

                            <div className="form-group">
                                <label htmlFor="linkedin_url">LinkedIn URL</label>
                                <input type="url" id="linkedin_url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="custom_link_1">Discord / Tag</label>
                            <input type="text" id="custom_link_1" name="custom_link_1" value={formData.custom_link_1} onChange={handleChange} placeholder="Discord Tag or Server Link" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="custom_link_2">Instagram Profile</label>
                            <input type="text" id="custom_link_2" name="custom_link_2" value={formData.custom_link_2} onChange={handleChange} placeholder="https://instagram.com/..." />
                        </div>

                        <div className="form-group">
                            <label htmlFor="custom_link_3">Slack Workspace Link</label>
                            <input type="text" id="custom_link_3" name="custom_link_3" value={formData.custom_link_3} onChange={handleChange} placeholder="Slack Channel or Invite Link" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="custom_link_4">Personal Website / CAD Portfolio</label>
                            <input type="text" id="custom_link_4" name="custom_link_4" value={formData.custom_link_4} onChange={handleChange} placeholder="https://myroboticslab.gr" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="custom_link_5">Other Custom Link</label>
                            <input type="text" id="custom_link_5" name="custom_link_5" value={formData.custom_link_5} onChange={handleChange} placeholder="Any link or handle" />
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
                            {loading ? 'Registering...' : 'Register Account'}
                        </button>
                    </form>
                </div>
            </main>
        </>
    );
}