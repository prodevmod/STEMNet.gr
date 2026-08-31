import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ConfirmEmailChange = ({ theme, toggleTheme }) => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [message, setMessage] = useState('Verifying new email...');

    useEffect(() => {
        if (!token) {
            setMessage('Invalid or missing token.');
            return;
        }

        fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/confirm-email-change`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            credentials: 'include'
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setMessage('Email updated successfully! Redirecting...');
                    setTimeout(() => navigate('/settings'), 2000);
                } else {
                    setMessage(data.error || 'Failed to verify email token.');
                }
            })
            .catch(() => setMessage('Server error while confirming email change.'));
    }, [token, navigate]);

    return (
        <div className="auth-page-wrapper">
            <div className="card narrow-card">
                <h2>Email Confirmation</h2>
                <p>{message}</p>
            </div>
        </div>
    );
};

export default ConfirmEmailChange;