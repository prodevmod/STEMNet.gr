import { useState } from 'react';

const isVideoUrl = (url) => /\.(mp4|webm)$/i.test(url || '');

export default function PostMedia({ src, alt = 'Attachment', maxHeight = 500 }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) return null;

    const containerStyle = {
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--bg-color, rgba(0,0,0,0.03))',
        borderRadius: '8px',
        overflow: 'hidden',
        marginTop: '0.5rem',
        marginBottom: '0.75rem',
    };

    const mediaStyle = {
        maxWidth: '100%',
        width: 'auto',
        height: 'auto',
        maxHeight: `${maxHeight}px`,
        objectFit: 'contain',
        display: 'block',
    };

    if (isVideoUrl(src)) {
        return (
            <div style={containerStyle}>
                <video controls style={mediaStyle} onError={() => setFailed(true)}>
                    <source src={src} />
                </video>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <img src={src} alt={alt} style={mediaStyle} onError={() => setFailed(true)} />
        </div>
    );
}