import goingIcon from '../assets/going.svg';
import interestedIcon from '../assets/interested.svg';

export default function RsvpButtons({ goingCount = 0, interestedCount = 0, userStatus, onRsvp }) {
    const btnStyle = (active) => ({
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        color: active ? '#22c55e' : 'inherit',
        fontSize: 'inherit',
        fontWeight: active ? 700 : 400,
    });

    return (
        <>
            <button type="button" onClick={() => onRsvp('going')} style={btnStyle(userStatus === 'going')}>
                <img src={goingIcon} alt="Going" style={{ width: '18px', height: '18px', filter: userStatus === 'going' ? 'none' : 'var(--icon-filter)' }} />
                <span>{goingCount > 0 ? goingCount : 'Going'}</span>
            </button>
            <button type="button" onClick={() => onRsvp('interested')} style={btnStyle(userStatus === 'interested')}>
                <img src={interestedIcon} alt="Interested" style={{ width: '18px', height: '18px', filter: userStatus === 'interested' ? 'none' : 'var(--icon-filter)' }} />
                <span>{interestedCount > 0 ? interestedCount : 'Interested'}</span>
            </button>
        </>
    );
}