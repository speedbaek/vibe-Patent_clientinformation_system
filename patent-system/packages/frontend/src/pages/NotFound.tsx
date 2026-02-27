import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="error-page">
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>요청하신 페이지가 존재하지 않습니다.</p>
      <p>올바른 접속 링크를 확인해 주세요.</p>
    </div>
  );
}
