import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FormProvider } from './context/FormContext.js';
import CustomerForm from './pages/CustomerForm.js';
import AdminPage from './pages/AdminPage.js';
import AdditionalUpload from './pages/AdditionalUpload.js';

export default function App() {
  return (
    <BrowserRouter>
      <FormProvider>
        <Routes>
          {/* 공개 폼 - 누구나 접속 가능 */}
          <Route path="/" element={<CustomerForm />} />
          {/* 첨부서류 추가제출 */}
          <Route path="/upload-additional" element={<AdditionalUpload />} />
          {/* 관리자 조회 페이지 */}
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<CustomerForm />} />
        </Routes>
      </FormProvider>
    </BrowserRouter>
  );
}
