import { useRef, useEffect, useState } from 'react';
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
  const [signed, setSigned] = useState(!!initialData);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 캔버스 크기 설정
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.offsetWidth;
      canvas.height = 160;
    }

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: '#fff',
      penColor: '#000',
    });

    pad.addEventListener('endStroke', () => {
      setSigned(true);
      onSignatureChange(pad.toDataURL('image/png'));
    });

    padRef.current = pad;

    // 기존 서명 복원
    if (initialData) {
      pad.fromDataURL(initialData);
    }

    return () => {
      pad.off();
    };
  }, [applicantIndex]);

  function handleClear() {
    padRef.current?.clear();
    setSigned(false);
    onSignatureChange('');
  }

  return (
    <div className="sig-wrap">
      <div className="sig-canvas-wrap">
        <canvas ref={canvasRef} className="sig-canvas" />
      </div>
      <div className="sig-controls">
        <span className={`sig-status ${signed ? 'signed' : ''}`}>
          {signed ? '✓ 서명 완료' : '아직 서명하지 않았습니다'}
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClear}>
          지우기
        </button>
      </div>
    </div>
  );
}
