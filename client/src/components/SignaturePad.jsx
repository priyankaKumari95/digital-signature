import { useEffect, useRef, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { Eraser, PenLine, Type } from 'lucide-react';

const TYPED_FONTS = [
  { label: 'Signature', value: "'Brush Script MT', 'Segoe Script', cursive" },
  { label: 'Formal', value: "'Palatino Linotype', Georgia, serif" },
  { label: 'Modern', value: "'Segoe UI', system-ui, sans-serif" },
];

export default function SignaturePad({ onSave, saveLabel = 'Use signature', showName = false }) {
  const [mode, setMode] = useState('draw');
  const [typedText, setTypedText] = useState('');
  const [font, setFont] = useState(TYPED_FONTS[0].value);
  const [name, setName] = useState('');

  const canvasRef = useRef(null);
  const padRef = useRef(null);

  useEffect(() => {
    if (mode !== 'draw') return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);

    const pad = new SignaturePadLib(canvas, {
      penColor: '#1e293b',
      backgroundColor: 'rgba(0,0,0,0)',
    });
    padRef.current = pad;
    return () => pad.off();
  }, [mode]);

  const clear = () => {
    if (mode === 'draw') padRef.current?.clear();
    else setTypedText('');
  };

  const typedToDataUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `64px ${font}`;
    ctx.fillText(typedText, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  };

  const handleSave = () => {
    let dataUrl;
    if (mode === 'draw') {
      if (!padRef.current || padRef.current.isEmpty()) return;
      dataUrl = padRef.current.toDataURL('image/png');
    } else {
      if (!typedText.trim()) return;
      dataUrl = typedToDataUrl();
    }
    onSave({ dataUrl, type: mode === 'draw' ? 'drawn' : 'typed', name: name.trim() });
  };

  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border border-slate-200 p-1">
        <button
          type="button"
          onClick={() => setMode('draw')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
            mode === 'draw' ? 'bg-brand-600 text-white' : 'text-slate-600'
          }`}
        >
          <PenLine size={15} /> Draw
        </button>
        <button
          type="button"
          onClick={() => setMode('type')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
            mode === 'type' ? 'bg-brand-600 text-white' : 'text-slate-600'
          }`}
        >
          <Type size={15} /> Type
        </button>
      </div>

      {mode === 'draw' ? (
        <canvas
          ref={canvasRef}
          className="h-44 w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 touch-none"
        />
      ) : (
        <div>
          <input
            className="input"
            placeholder="Type your name"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            {TYPED_FONTS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setFont(f.value)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  font === f.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div
            className="mt-3 flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-4xl text-slate-800"
            style={{ fontFamily: font }}
          >
            {typedText || <span className="text-base text-slate-400">Preview</span>}
          </div>
        </div>
      )}

      {showName && (
        <input
          className="input mt-3"
          placeholder="Signature name (e.g. My signature)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={clear} className="btn-secondary">
          <Eraser size={15} /> Clear
        </button>
        <button type="button" onClick={handleSave} className="btn-primary">
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
