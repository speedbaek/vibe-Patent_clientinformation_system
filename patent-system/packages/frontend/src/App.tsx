import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { FormProvider, useFormContext } from './context/FormContext.js';
import CustomerForm from './pages/CustomerForm.js';
import AdminPage from './pages/AdminPage.js';
import AdditionalUpload from './pages/AdditionalUpload.js';
import Footer from './components/Footer.js';
import logoSrc from './assets/logo-teheran.png';

function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dispatch } = useFormContext();
  // 관리자 페이지에서는 로고 숨김
  if (location.pathname === '/admin') return null;

  function handleLogoClick() {
    dispatch({ type: 'RESET' });
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app-logo-header">
      <img
        src={logoSrc}
        alt="특허법인 테헤란"
        className="app-logo"
        onClick={handleLogoClick}
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
}

function AppFooter() {
  const location = useLocation();
  // 관리자 페이지에서는 푸터 숨김
  if (location.pathname === '/admin') return null;
  return <Footer />;
}

export default function App() {
  return (
    <BrowserRouter>
      <FormProvider>
        <AppHeader />
        <Routes>
          {/* 공개 폼 - 누구나 접속 가능 */}
          <Route path="/" element={<CustomerForm />} />
          {/* 첨부서류 추가제출 */}
          <Route path="/upload-additional" element={<AdditionalUpload />} />
          {/* 관리자 조회 페이지 */}
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<CustomerForm />} />
        </Routes>
        <AppFooter />
      </FormProvider>
    </BrowserRouter>
  );
}
