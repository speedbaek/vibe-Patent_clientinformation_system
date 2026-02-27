import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FormProvider } from './context/FormContext.js';
import CustomerForm from './pages/CustomerForm.js';
import NotFound from './pages/NotFound.js';

export default function App() {
  return (
    <BrowserRouter>
      <FormProvider>
        <Routes>
          {/* 토큰으로 접속 */}
          <Route path="/:token" element={<CustomerForm />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </FormProvider>
    </BrowserRouter>
  );
}
