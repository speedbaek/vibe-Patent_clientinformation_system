import sealSrc from '../assets/seal-teheran.png';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        {/* 좌측: 캐치프레이즈 */}
        <div className="footer-left">
          <div className="footer-catchphrase">
            <span>길눈이 밝은,</span>
            <span className="blue">사업파트너 테헤란</span>
          </div>
        </div>

        {/* 우측: 회사정보 + 인감도장 */}
        <div className="footer-right">
          <div className="footer-seal-wrap">
            <span className="footer-company-name">특허법인 테헤란</span>
            <img src={sealSrc} alt="인감도장" className="footer-seal" />
          </div>
          <div className="footer-info">
            <p>서울 강남구 테헤란로 418, 다봉타워 5층 (대치동)</p>
            <p>Tel: 02-2038-7679 | Fax: 02-2038-0879</p>
            <p>Email: patent@thrlaw.co.kr</p>
            <p>
              H.P:{' '}
              <a href="http://www.teheranpat.com" target="_blank" rel="noopener noreferrer">
                www.teheranpat.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
