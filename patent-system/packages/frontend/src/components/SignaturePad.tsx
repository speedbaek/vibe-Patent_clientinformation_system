import { useRef, useEffect, useState, useCallback } from 'react';
import SignaturePadLib from 'signature_pad';

interface SignaturePadProps {
  applicantIndex: number;
  initialData?: string;
  onSignatureChange: (dataUrl: string) => void;
}

export default function SignaturePad({
  applicantIndex,
  initialData,
  onSignatureChange,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [signed, setSigned] = useState(!!initialData);

  /** 캔버스를 부모 너비에 맞게 고해상도로 리사이즈 */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = wrap.offsetWidth;
    const height = Math.min(160, Math.max(120, width * 0.3));

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    // 리사이즈 후 기존 서명 복원
    if (padRef.current && initialData && signed) {
      padRef.current.fromDataURL(initialData, {
        width: width,
        height: height,
      });
    }
  }, [initialData, signed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: '#fff',
      penColor: '#000',
      minWidth: 1,
      maxWidth: 2.5,
    });

    pad.addEventListener('endStroke', () => {
      setSigned(true);
      onSignatureChange(pad.toDataURL('image/png'));
    });

    padRef.current = pad;

    // 기존 서명 복원
    if (initialData) {
      const wrap = wrapRef.current;
      if (wrap) {
        pad.fromDataURL(initialData, {
          width: wrap.offsetWidth,
          height: Math.min(160, Math.max(120, wrap.offsetWidth * 0.3)),
        });
      }
    }

    // 윈도우 리사이즈 (회전 포함) 대응
    const handleResize = () => {
      // 서명 데이터를 임시 저장 후 리사이즈
      const data = pad.isEmpty() ? null : pad.toDataURL();
      resizeCanvas();
      if (data) {
        const wrap = wrapRef.current;
        if (wrap) {
          pad.fromDataURL(data, {
            width: wrap.offsetWidth,
            height: Math.min(160, Math.max(120, wrap.offsetWidth * 0.3)),
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      pad.off();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [applicantIndex]);

  /** 터치 중 페이지 스크롤 방지 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventScroll = (e: TouchEvent) => {
      if (e.target === canvas) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  function handleClear() {
    padRef.current?.clear();

    // 배경색 다시 적용 (clear는 투명으로 바뀜)
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.scale(ratio, ratio);
      }
    }

    setSigned(false);
    onSignatureChange('');
  }

  return (
    <div className="sig-wrap">
      <div className="sig-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="sig-canvas"
          style={{ touchAction: 'none' }}
        />
      </div>
      <div className="sig-controls">
        <span className={`sig-status ${signed ? 'signed' : ''}`}>
          {signed ? '서명 완료' : '위 영역에 서명해 주세요'}
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClear}>
          지우기
        </button>
      </div>
    </div>
  );
}
