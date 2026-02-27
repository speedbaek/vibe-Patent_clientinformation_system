export default function TokenExpired() {
  return (
    <div className="error-page">
      <h1>⏰ 링크가 만료되었습니다</h1>
      <p>입력 링크의 유효기간(7일)이 경과하여 더 이상 접속할 수 없습니다.</p>
      <p>새로운 링크를 요청하시려면 담당 관리팀에 문의해 주세요.</p>
    </div>
  );
}
