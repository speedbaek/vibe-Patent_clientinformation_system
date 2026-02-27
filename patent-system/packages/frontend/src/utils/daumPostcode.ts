import { Address } from '../types/index.js';

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeResult) => void;
      }) => { open: () => void };
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

export function openAddressSearch(): Promise<Address> {
  return new Promise((resolve, reject) => {
    if (!window.daum?.Postcode) {
      reject(new Error('주소검색 스크립트가 로드되지 않았습니다.'));
      return;
    }

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
  });
}
