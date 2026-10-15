export default function ReplyComposer({ value, onChange, onSubmit, onCancel, placeholder = 'Write a reply...', submitting = false, theme = 'light' }) {
    return (
        <form
            onSubmit={onSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)' }}
        >
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={2}
                autoFocus
                style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)',
                    background: theme === 'dark' ? '#121212' : 'var(--card-bg, #ffffff)',
                    color: 'inherit',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', color: 'inherit', cursor: 'pointer' }}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitting || !value.trim()}
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 1.1rem', fontSize: '0.85rem' }}
                >
                    {submitting ? 'Sending...' : 'Reply'}
                </button>
            </div>
        </form>
    );
}