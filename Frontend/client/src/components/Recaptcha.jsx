import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function Recaptcha({ onChange, onExpired }) {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);

    useEffect(() => {
        if (!SITE_KEY) return;

        const renderWidget = () => {
            if (widgetIdRef.current !== null || !containerRef.current) return;
            if (containerRef.current.childElementCount > 0) return;

            try {
                widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
                    sitekey: SITE_KEY,
                    callback: (token) => onChange && onChange(token),
                    'expired-callback': () => {
                        onChange && onChange('');
                        onExpired && onExpired();
                    },
                });
            } catch (err) {
                console.error('reCAPTCHA render error:', err);
            }
        };

        // Check if global script has loaded
        if (window.grecaptcha && window.grecaptcha.render) {
            renderWidget();
        } else {
            const checkInterval = setInterval(() => {
                if (window.grecaptcha && window.grecaptcha.render) {
                    renderWidget();
                    clearInterval(checkInterval);
                }
            }, 100);

            return () => clearInterval(checkInterval);
        }
    }, [onChange, onExpired]);

    if (!SITE_KEY) {
        return (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>
                reCAPTCHA is misconfigured (missing site key).
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '1rem 0' }}>
            <div ref={containerRef}></div>
        </div>
    );
}