// src/main.tsx

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
import MyDeskPage from "./pages/MyDeskPage";
import RbacPage from './pages/RbacPage';
import UsersAdminPage from './pages/UsersAdminPage';
import AuditPage from "./pages/AuditPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";

// ⬇️ مزوّد الصلاحيات
import { PermissionsProvider } from './permissions/PermissionsContext';

document.documentElement.dir = 'rtl';
document.documentElement.lang = 'ar';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PermissionsProvider>
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
                <Route path="/my-desk" element={<MyDeskPage />} />
                <Route path="/rbac" element={<RbacPage />} />
                <Route path="/usersadmin" element={<UsersAdminPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/change-password" element={<ChangePasswordPage/>} />
              </Route>
            </Route>
          </Routes>
        </AppInitializer>
      </BrowserRouter>
    </PermissionsProvider>
  </React.StrictMode>
);




// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import './index.css';

// import AppInitializer from './components/AppInitializer';
// import ProtectedRoute from './components/ProtectedRoute';
// import AppLayout from './components/AppLayout';

// import LoginPage from './pages/LoginPage';
// import DashboardPage from './pages/DashboardPage';
// import DepartmentsPage from './pages/DepartmentsPage';
// import IncomingPage from './pages/IncomingPage';
// import IncomingDetailsPage from './pages/IncomingDetailsPage';
// import OutgoingPage from './pages/OutgoingPage';
// import OutgoingDetailsPage from './pages/OutgoingDetailsPage';
// import MyDeskPage from "./pages/MyDeskPage";

// document.documentElement.dir = 'rtl';
// document.documentElement.lang = 'ar';

// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <AppInitializer>
//         <Routes>
//           <Route path="/" element={<LoginPage />} />

//           {/* كل المسارات المحمية داخل Layout واحد */}
//           <Route element={<ProtectedRoute />}>
//             <Route element={<AppLayout />}>
//               <Route path="/dashboard" element={<DashboardPage />} />
//               <Route path="/departments" element={<DepartmentsPage />} />
//               <Route path="/incoming" element={<IncomingPage />} />
//               <Route path="/incoming/:id" element={<IncomingDetailsPage />} />
//               <Route path="/outgoing" element={<OutgoingPage />} />
//               <Route path="/outgoing/:id" element={<OutgoingDetailsPage />} />
//               <Route path="/my-desk" element={<MyDeskPage />} />
//             </Route>
//           </Route>
//         </Routes>
//       </AppInitializer>
//     </BrowserRouter>
//   </React.StrictMode>
// );



