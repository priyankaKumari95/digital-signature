import { useRef } from 'react';
import { X } from 'lucide-react';

export default function PlacementBox({ placement: p, dims, onChange, onRemove }) {
  const dragRef = useRef(null);

  const left = p.x * dims.width;
  const top = p.y * dims.height;
  const width = p.width * dims.width;
  const height = p.height * dims.height;

  const startMove = (e) => {
    e.stopPropagation();
    e.target.setPointerCapture?.(e.pointerId);
    dragRef.current = { mode: 'move', startX: e.clientX, startY: e.clientY, origX: left, origY: top };
  };

  const startResize = (e) => {
    e.stopPropagation();
    e.target.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      mode: 'resize',
      startX: e.clientX,
      origW: width,
      aspect: height / width,
    };
  };

  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === 'move') {
      const nx = Math.min(Math.max(d.origX + (e.clientX - d.startX), 0), dims.width - width);
      const ny = Math.min(Math.max(d.origY + (e.clientY - d.startY), 0), dims.height - height);
      onChange({ ...p, x: nx / dims.width, y: ny / dims.height });
    } else if (d.mode === 'resize') {
      const newW = Math.min(Math.max(d.origW + (e.clientX - d.startX), 40), dims.width - left);
      const newH = newW * d.aspect;
      if (top + newH > dims.height) return;
      onChange({ ...p, width: newW / dims.width, height: newH / dims.height });
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div
      className="group absolute cursor-move rounded border-2 border-brand-500 bg-brand-500/10"
      style={{ left, top, width, height }}
      onPointerDown={startMove}
      onPointerMove={onMove}
      onPointerUp={endDrag}
    >
      <img src={p.imageDataUrl} alt="signature" className="pointer-events-none h-full w-full object-contain" />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
      >
        <X size={12} />
      </button>
      <div
        onPointerDown={startResize}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize rounded-sm border-2 border-brand-600 bg-white"
      />
    </div>
  );
}
