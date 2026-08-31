import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    
    const [status, setStatus] = useState('Verifying your email...');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus('Invalid or missing verification token.');
            setIsError(true);
            return;
        }

        // Adjust this endpoint to match your actual backend route
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success || data.message === 'Email verified') {
                    setStatus('Email verified successfully! Redirecting to login...');
                    setIsError(false);
                    setTimeout(() => navigate('/login'), 3000);
                } else {
                    setStatus(data.error || 'Failed to verify email token.');
                    setIsError(true);
                }
            })
            .catch(() => {
                setStatus('Server error while verifying email.');
                setIsError(true);
            });
    }, [token, navigate]);

    return (
        <main style={{ maxWidth: '640px', margin: '4rem auto', padding: '1.5rem 1rem', textAlign: 'center' }}>
            <div className="card">
                <h2 style={{ marginBottom: '1rem' }}>Email Verification</h2>
                
                <div style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: 'var(--radius)',
                    backgroundColor: isError ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                    color: isError ? '#ef4444' : '#22c55e',
                    border: `1px solid ${isError ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                }}>
                    {status}
                </div>

                {isError && (
                    <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                        Return Home
                    </Link>
                )}
            </div>
        </main>
    );
}