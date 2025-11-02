import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import AppInitializer from './components/AppInitializer';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DepartmentsPage from './pages/DepartmentsPage';
import IncomingPage from './pages/IncomingPage';
import IncomingDetailsPage from './pages/IncomingDetailsPage';
import OutgoingPage from './pages/OutgoingPage';
import OutgoingDetailsPage from './pages/OutgoingDetailsPage';

document.documentElement.dir = 'rtl';
document.documentElement.lang = 'ar';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppInitializer>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          {/* كل المسارات المحمية داخل Layout واحد */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/incoming" element={<IncomingPage />} />
              <Route path="/incoming/:id" element={<IncomingDetailsPage />} />
              <Route path="/outgoing" element={<OutgoingPage />} />
              <Route path="/outgoing/:id" element={<OutgoingDetailsPage />} />
            </Route>
          </Route>
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  </React.StrictMode>
);





// // src/main.tsx
// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import './index.css';

// // مكونات التهيئة والحماية
// import AppInitializer from './components/AppInitializer';
// import ProtectedRoute from './components/ProtectedRoute';

// // الصفحات
// import LoginPage from './pages/LoginPage';
// import DashboardPage from './pages/DashboardPage';
// import DepartmentsPage from './pages/DepartmentsPage';
// import IncomingPage from './pages/IncomingPage';
// import IncomingDetailsPage from './pages/IncomingDetailsPage';
// import OutgoingPage from './pages/OutgoingPage';
// import OutgoingDetailsPage from './pages/OutgoingDetailsPage';

// // ✅ تفعيل RTL عربي عالميًا مرة واحدة
// if (typeof document !== 'undefined') {
//   document.documentElement.setAttribute('dir', 'rtl');
//   document.documentElement.setAttribute('lang', 'ar');
//   document.body.classList.add('rtl'); // يستفيد من قواعد CSS في index.css
// }

// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <BrowserRouter /* basename={import.meta.env.BASE_URL || '/'} */>
//       <AppInitializer>
//         <Routes>
//           {/* مسار عام: تسجيل الدخول */}
//           <Route path="/" element={<LoginPage />} />

//           {/* مسارات محمية */}
//           <Route element={<ProtectedRoute />}>
//             <Route path="/dashboard" element={<DashboardPage />} />
//             <Route path="/departments" element={<DepartmentsPage />} />
//             <Route path="/incoming" element={<IncomingPage />} />
//             <Route path="/incoming/:id" element={<IncomingDetailsPage />} />
//             <Route path="/outgoing" element={<OutgoingPage />} />
//             <Route path="/outgoing/:id" element={<OutgoingDetailsPage />} />
//           </Route>
//         </Routes>
//       </AppInitializer>
//     </BrowserRouter>
//   </React.StrictMode>,
// );

