import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

let scriptLoadingPromise = null;

function loadRecaptchaScript() {
    if (window.grecaptcha && window.grecaptcha.render) {
        return Promise.resolve();
    }
    if (scriptLoadingPromise) return scriptLoadingPromise;

    scriptLoadingPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src*="recaptcha/api.js"]');
        if (existing) {
            existing.addEventListener('load', resolve);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });

    return scriptLoadingPromise;
}

export default function Recaptcha({ onChange, onExpired }) {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);

    useEffect(() => {
        if (!SITE_KEY) {
            console.error('VITE_RECAPTCHA_SITE_KEY is missing. Check your .env file and restart the dev server.');
            return;
        }

        let mounted = true;

        loadRecaptchaScript()
            .then(() => {
                if (!mounted || !containerRef.current) return;
                if (widgetIdRef.current !== null) return;
                if (containerRef.current.childElementCount > 0) return;

                widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
                    sitekey: SITE_KEY,
                    callback: (token) => onChange && onChange(token),
                    'expired-callback': () => {
                        onChange && onChange('');
                        onExpired && onExpired();
                    },
                });
            })
            .catch((err) => {
                console.error('Failed to load reCAPTCHA script:', err);
            });

        return () => {
            mounted = false;
        };
    }, []);

    if (!SITE_KEY) {
        return (
            <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                reCAPTCHA is misconfigured (missing site key).
            </div>
        );
    }

    return (
        <>
            <style>{`
                .g-recaptcha-response {
                    display: none !important;
                    position: absolute !important;
                    width: 0 !important;
                    height: 0 !important;
                    overflow: hidden !important;
                }
            `}</style>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <div ref={containerRef}></div>
            </div>
        </>
    );
}