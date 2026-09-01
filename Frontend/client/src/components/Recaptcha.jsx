import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

let scriptPromise = null;

function loadRecaptchaScript() {
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
        if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
            resolve();
            return;
        }

        const callbackName = '__onGrecaptchaLoaded';
        window[callbackName] = () => {
            resolve();
            delete window[callbackName];
        };

        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit`;
        script.async = true;
        script.defer = true;
        script.onerror = (err) => {
            scriptPromise = null;
            reject(err);
        };
        document.head.appendChild(script);
    });

    return scriptPromise;
}

export default function Recaptcha({ onChange, onExpired }) {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);

    useEffect(() => {
        if (!SITE_KEY) return;
        let isMounted = true;

        loadRecaptchaScript()
            .then(() => {
                if (!isMounted || !containerRef.current) return;

                window.grecaptcha.ready(() => {
                    if (!isMounted || !containerRef.current) return;
                    if (widgetIdRef.current !== null) return;
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
                });
            })
            .catch((err) => {
                console.error('Failed to load reCAPTCHA script:', err);
            });

        return () => {
            isMounted = false;
        };
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