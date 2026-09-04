import { useState, useRef, useEffect, useCallback } from 'react';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

const CONTAINER_SIZE = 280;
const OUTPUT_SIZE = 500;

export default function ImageCropper({ file, onCancel, onCropped }) {
    const isGif = file.type === 'image/gif';

    const [imgUrl, setImgUrl] = useState('');
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(1);
    const [maxScale, setMaxScale] = useState(4);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [processingLabel, setProcessingLabel] = useState('');

    const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
    const gifFramesRef = useRef(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setImgUrl(url);
        setImageLoaded(false);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => {
        if (!isGif) return;
        let cancelled = false;
        (async () => {
            const buffer = await file.arrayBuffer();
            const gif = parseGIF(buffer);
            const frames = decompressFrames(gif, true);
            if (!cancelled) {
                gifFramesRef.current = { frames, logicalWidth: gif.lsd.width, logicalHeight: gif.lsd.height };
            }
        })();
        return () => { cancelled = true; };
    }, [file, isGif]);

    const clampPos = useCallback((x, y, s, size) => {
        if (!size.w || !size.h) return { x, y };
        const dispW = size.w * s;
        const dispH = size.h * s;
        const minX = Math.min(0, CONTAINER_SIZE - dispW);
        const minY = Math.min(0, CONTAINER_SIZE - dispH);
        return {
            x: Math.max(minX, Math.min(0, x)),
            y: Math.max(minY, Math.min(0, y)),
        };
    }, []);

    const handleImageLoad = (e) => {
        const w = e.target.naturalWidth;
        const h = e.target.naturalHeight;
        const size = { w, h };
        // "contain" scale — the whole image is visible at load, nothing is
        // pre-cropped into a square. The user zooms in from here if/when
        // they actually want to crop tighter.
        const initialFit = Math.min(CONTAINER_SIZE / w, CONTAINER_SIZE / h);

        setNaturalSize(size);
        setMinScale(initialFit);
        setMaxScale(initialFit * 4);
        setScale(initialFit);
        setPos(
            clampPos(
                (CONTAINER_SIZE - w * initialFit) / 2,
                (CONTAINER_SIZE - h * initialFit) / 2,
                initialFit,
                size
            )
        );
        setImageLoaded(true);
    };

    const handlePointerDown = (e) => {
        if (!imageLoaded) return;
        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!dragging || !imageLoaded) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPos(clampPos(dragStart.current.posX + dx, dragStart.current.posY + dy, scale, naturalSize));
    };

    const handlePointerUp = () => setDragging(false);

    const handleZoomChange = (e) => {
        if (!imageLoaded) return;
        const newScale = parseFloat(e.target.value);
        const centerSourceX = (CONTAINER_SIZE / 2 - pos.x) / scale;
        const centerSourceY = (CONTAINER_SIZE / 2 - pos.y) / scale;
        const newX = CONTAINER_SIZE / 2 - centerSourceX * newScale;
        const newY = CONTAINER_SIZE / 2 - centerSourceY * newScale;
        setScale(newScale);
        setPos(clampPos(newX, newY, newScale, naturalSize));
    };

    const getCropGeometry = () => {
        const sourceX = -pos.x / scale;
        const sourceY = -pos.y / scale;
        const sourceSize = CONTAINER_SIZE / scale;
        return { sourceX, sourceY, sourceSize };
    };

    const handleConfirmStatic = () => {
        const { sourceX, sourceY, sourceSize } = getCropGeometry();
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

            const mimeType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
            const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;

            canvas.toBlob((blob) => {
                if (!blob) return;
                onCropped(new File([blob], file.name, { type: mimeType }));
            }, mimeType, quality);
        };
        img.src = imgUrl;
    };

    const handleConfirmGif = async () => {
        if (!gifFramesRef.current) return;
        setProcessing(true);
        setProcessingLabel('Reading frames...');

        const { frames, logicalWidth, logicalHeight } = gifFramesRef.current;
        const { sourceX, sourceY, sourceSize } = getCropGeometry();

        const dispScaleX = naturalSize.w / logicalWidth;
        const dispScaleY = naturalSize.h / logicalHeight;

        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = logicalWidth;
        compositeCanvas.height = logicalHeight;
        const compositeCtx = compositeCanvas.getContext('2d');

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = OUTPUT_SIZE;
        cropCanvas.height = OUTPUT_SIZE;
        const cropCtx = cropCanvas.getContext('2d');

        const gif = GIFEncoder();

        setProcessingLabel(`Cropping ${frames.length} frames...`);

        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const frameImageData = new ImageData(
                new Uint8ClampedArray(frame.patch),
                frame.dims.width,
                frame.dims.height
            );

            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = frame.dims.width;
            frameCanvas.height = frame.dims.height;
            frameCanvas.getContext('2d').putImageData(frameImageData, 0, 0);

            if (i === 0 || frame.disposalType === 2) {
                compositeCtx.clearRect(0, 0, logicalWidth, logicalHeight);
            }
            compositeCtx.drawImage(frameCanvas, frame.dims.left, frame.dims.top);

            const srcX = sourceX / dispScaleX;
            const srcY = sourceY / dispScaleY;
            const srcSize = sourceSize / dispScaleX;

            cropCtx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
            cropCtx.drawImage(compositeCanvas, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

            const { data } = cropCtx.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
            const palette = quantize(data, 256);
            const index = applyPalette(data, palette);

            gif.writeFrame(index, OUTPUT_SIZE, OUTPUT_SIZE, {
                palette,
                delay: frame.delay || 100,
            });

            setProcessingLabel(`Cropping frame ${i + 1} of ${frames.length}...`);
            if (i % 3 === 0) {
                await new Promise((resolve) => setTimeout(resolve, 0));
            }
        }

        gif.finish();
        const bytes = gif.bytes();
        setProcessing(false);
        onCropped(new File([bytes], file.name, { type: 'image/gif' }));
    };

    const handleConfirm = () => {
        if (isGif) {
            handleConfirmGif();
        } else {
            handleConfirmStatic();
        }
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
                        position: 'relative', background: '#000',
                        cursor: imageLoaded ? (dragging ? 'grabbing' : 'grab') : 'default',
                        touchAction: 'none', border: '2px solid var(--border-color)',
                    }}
                >
                    {imgUrl && (
                        <img
                            src={imgUrl}
                            alt="Crop preview"
                            onLoad={handleImageLoad}
                            draggable={false}
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: naturalSize.w || 'auto',
                                height: naturalSize.h || 'auto',
                                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                                transformOrigin: '0 0',
                                userSelect: 'none',
                                pointerEvents: 'none',
                                visibility: imageLoaded ? 'visible' : 'hidden',
                            }}
                        />
                    )}
                    {!imageLoaded && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '0.8rem' }}>
                            Loading...
                        </div>
                    )}
                </div>

                <div style={{ margin: '1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>−</span>
                    <input
                        type="range"
                        min={minScale}
                        max={maxScale}
                        step={imageLoaded ? (maxScale - minScale) / 100 : 0.01}
                        value={scale}
                        onChange={handleZoomChange}
                        disabled={!imageLoaded}
                        style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.85rem' }}>+</span>
                </div>

                {isGif && (
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', margin: '0 0 1rem 0' }}>
                        This GIF's animation will be preserved.
                    </p>
                )}

                {processing ? (
                    <div style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                        {processingLabel}
                    </div>
                ) : (
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
                            disabled={!imageLoaded || (isGif && !gifFramesRef.current)}
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '0.6rem', opacity: (!imageLoaded || (isGif && !gifFramesRef.current)) ? 0.6 : 1 }}
                        >
                            Save
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}