import { useState, useRef, useEffect, useCallback } from 'react';

const CONTAINER_SIZE = 280;
const OUTPUT_SIZE = 500;

export default function ImageCropper({ file, onCancel, onCropped }) {
    const [imgUrl, setImgUrl] = useState('');
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
    const imgRef = useRef(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setImgUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const clampPos = useCallback((x, y, s) => {
        const dispW = naturalSize.w * s;
        const dispH = naturalSize.h * s;
        const minX = Math.min(0, CONTAINER_SIZE - dispW);
        const minY = Math.min(0, CONTAINER_SIZE - dispH);
        return {
            x: Math.max(minX, Math.min(0, x)),
            y: Math.max(minY, Math.min(0, y)),
        };
    }, [naturalSize]);

    const handleImageLoad = (e) => {
        const w = e.target.naturalWidth;
        const h = e.target.naturalHeight;
        const initialMin = Math.max(CONTAINER_SIZE / w, CONTAINER_SIZE / h);
        setNaturalSize({ w, h });
        setMinScale(initialMin);
        setScale(initialMin);
        setPos({
            x: (CONTAINER_SIZE - w * initialMin) / 2,
            y: (CONTAINER_SIZE - h * initialMin) / 2,
        });
    };

    const handlePointerDown = (e) => {
        setDragging(true);
        dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            posX: pos.x,
            posY: pos.y,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const next = clampPos(dragStart.current.posX + dx, dragStart.current.posY + dy, scale);
        setPos(next);
    };

    const handlePointerUp = () => setDragging(false);

    const handleZoomChange = (e) => {
        const newScale = parseFloat(e.target.value);
        const centerSourceX = (CONTAINER_SIZE / 2 - pos.x) / scale;
        const centerSourceY = (CONTAINER_SIZE / 2 - pos.y) / scale;
        const newX = CONTAINER_SIZE / 2 - centerSourceX * newScale;
        const newY = CONTAINER_SIZE / 2 - centerSourceY * newScale;
        setScale(newScale);
        setPos(clampPos(newX, newY, newScale));
    };

    const handleConfirm = () => {
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext('2d');

        const sourceX = -pos.x / scale;
        const sourceY = -pos.y / scale;
        const sourceSize = CONTAINER_SIZE / scale;

        const img = imgRef.current;
        ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        const mimeType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
        const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;

        canvas.toBlob((blob) => {
            if (!blob) return;
            const croppedFile = new File([blob], file.name, { type: mimeType });
            onCropped(croppedFile);
        }, mimeType, quality);
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
            }}
        >
            <div style={{ background: 'var(--card-bg, #1a1a1a)', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '380px', boxSizing: 'border-box' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', textAlign: 'center' }}>Adjust your photo</h3>

                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={{
                        width: `${CONTAINER_SIZE}px`, height: `${CONTAINER_SIZE}px`,
                        margin: '0 auto', borderRadius: '50%', overflow: 'hidden',
                        position: 'relative', background: '#000', cursor: dragging ? 'grabbing' : 'grab',
                        touchAction: 'none', border: '2px solid var(--border-color)',
                    }}
                >
                    {imgUrl && (
                        <img
                            ref={imgRef}
                            src={imgUrl}
                            alt="Crop preview"
                            onLoad={handleImageLoad}
                            draggable={false}
                            style={{
                                position: 'absolute',
                                left: `${pos.x}px`,
                                top: `${pos.y}px`,
                                width: `${naturalSize.w * scale}px`,
                                height: `${naturalSize.h * scale}px`,
                                userSelect: 'none',
                                pointerEvents: 'none',
                            }}
                        />
                    )}
                </div>

                <div style={{ margin: '1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>−</span>
                    <input
                        type="range"
                        min={minScale}
                        max={minScale * 4}
                        step={(minScale * 3) / 100}
                        value={scale}
                        onChange={handleZoomChange}
                        style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.85rem' }}>+</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '0.6rem' }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}