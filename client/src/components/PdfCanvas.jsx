import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Spinner from './ui/Spinner';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfCanvas({
  data,
  pageNumber = 1,
  targetWidth = 700,
  onDocumentLoaded,
  renderOverlay,
}) {
  const canvasRef = useRef(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask = null;
    let pdf = null;

    async function render() {
      setLoading(true);
      setError(null);
      try {
        // copy: pdf.js detaches the ArrayBuffer it's given
        const bytes = data instanceof Uint8Array ? data.slice() : new Uint8Array(data);
        pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        onDocumentLoaded?.(pdf.numPages);

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const scale = targetWidth / base.width;
        const dpr = window.devicePixelRatio || 1;
        const cssViewport = page.getViewport({ scale });
        const renderViewport = page.getViewport({ scale: scale * dpr });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        canvas.style.width = `${cssViewport.width}px`;
        canvas.style.height = `${cssViewport.height}px`;

        const ctx = canvas.getContext('2d');
        renderTask = page.render({ canvasContext: ctx, viewport: renderViewport });
        await renderTask.promise;
        if (cancelled) return;
        setDims({ width: cssViewport.width, height: cssViewport.height });
      } catch (err) {
        if (!cancelled && err?.name !== 'RenderingCancelledException') {
          setError('Unable to render this PDF.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    render();
    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        // noop
      }
    };
  }, [data, pageNumber, targetWidth, onDocumentLoaded]);

  return (
    <div className="relative inline-block">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <Spinner />
        </div>
      )}
      {error ? (
        <div className="flex h-96 w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm text-red-600">
          {error}
        </div>
      ) : (
        <canvas ref={canvasRef} className="block rounded-lg border border-slate-200 shadow-sm" />
      )}
      {!loading && !error && dims.width > 0 && renderOverlay && (
        <div className="absolute left-0 top-0" style={{ width: dims.width, height: dims.height }}>
          {renderOverlay(dims)}
        </div>
      )}
    </div>
  );
}
