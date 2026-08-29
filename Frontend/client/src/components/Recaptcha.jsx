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
        let mounted = true;

        loadRecaptchaScript().then(() => {
            if (!mounted || !containerRef.current || widgetIdRef.current !== null) return;
            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
                sitekey: SITE_KEY,
                callback: (token) => onChange && onChange(token),
                'expired-callback': () => {
                    onChange && onChange('');
                    onExpired && onExpired();
                },
            });
        });

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={containerRef}></div>;
}