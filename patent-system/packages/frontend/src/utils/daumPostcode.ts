import { Address } from '../types/index.js';

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeResult) => void;
        onclose?: (state: string) => void;
        width?: string;
        height?: string;
      }) => { open: () => void; embed: (el: HTMLElement) => void };
    };
  }
}

interface DaumPostcodeResult {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: 'R' | 'J';
  buildingName: string;
  apartment: string;
}

/** 모바일 여부 판별 */
function isMobileDevice(): boolean {
  return window.innerWidth <= 520 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function openAddressSearch(): Promise<Address> {
  return new Promise((resolve, reject) => {
    if (!window.daum?.Postcode) {
      reject(new Error('주소검색 스크립트가 로드되지 않았습니다.'));
      return;
    }

    if (isMobileDevice()) {
      // 모바일: 풀스크린 오버레이 임베드 모드
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: #fff;
        display: flex;
        flex-direction: column;
      `;

      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #d1d5db;
        background: #fafbfc;
        flex-shrink: 0;
      `;
      header.innerHTML = `
        <span style="font-size:16px;font-weight:600;">주소 검색</span>
        <button id="daum-addr-close" style="background:none;border:none;font-size:24px;cursor:pointer;padding:4px 8px;color:#666;">✕</button>
      `;

      const embedWrap = document.createElement('div');
      embedWrap.style.cssText = 'flex:1;overflow:auto;';

      overlay.appendChild(header);
      overlay.appendChild(embedWrap);
      document.body.appendChild(overlay);

      // 스크롤 방지
      document.body.style.overflow = 'hidden';

      function cleanup() {
        document.body.style.overflow = '';
        if (overlay.parentNode) overlay.remove();
      }

      const closeBtn = header.querySelector('#daum-addr-close');
      closeBtn?.addEventListener('click', () => {
        cleanup();
        reject(new Error('사용자가 닫았습니다.'));
      });

      new window.daum.Postcode({
        oncomplete(data: DaumPostcodeResult) {
          cleanup();
          const roadAddr =
            data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
          resolve({
            zipcode: data.zonecode,
            roadAddr,
            detailAddr: '',
          });
        },
        onclose(state: string) {
          if (state === 'FORCE_CLOSE') {
            cleanup();
            reject(new Error('사용자가 닫았습니다.'));
          }
        },
        width: '100%',
        height: '100%',
      }).embed(embedWrap);
    } else {
      // PC: 기존 팝업 모드
      new window.daum.Postcode({
        oncomplete(data: DaumPostcodeResult) {
          const roadAddr =
            data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
          resolve({
            zipcode: data.zonecode,
            roadAddr,
            detailAddr: '',
          });
        },
      }).open();
    }
  });
}
