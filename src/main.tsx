import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// استيراد المكونات الجديدة
import AppInitializer from './components/AppInitializer';
import ProtectedRoute from './components/ProtectedRoute';

// استيراد الصفحات
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DepartmentsPage from './pages/DepartmentsPage';
import IncomingPage from './pages/IncomingPage';
import IncomingDetailsPage from './pages/IncomingDetailsPage';
import OutgoingPage from './pages/OutgoingPage';
import OutgoingDetailsPage from './pages/OutgoingDetailsPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 1. نغلف التطبيق بـ AppInitializer */}
      <AppInitializer>
        <Routes>
          {/* المسار العام: صفحة تسجيل الدخول */}
          <Route path="/" element={<LoginPage />} />

          {/* 2. نستخدم ProtectedRoute لتغليف جميع المسارات المحمية */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/incoming" element={<IncomingPage />} />
            <Route path="/incoming/:id" element={<IncomingDetailsPage />} />
            <Route path="/outgoing" element={<OutgoingPage />} />
            <Route path="/outgoing/:id" element={<OutgoingDetailsPage />} />
          </Route>
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  </React.StrictMode>,
);




// import React from "react";
// import ReactDOM from "react-dom/client";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import './index.css'


// import "./index.css";
// import LoginPage from "./pages/LoginPage";
// import DashboardPage from "./pages/DashboardPage";
// import DepartmentsPage from "./pages/DepartmentsPage";
// import IncomingPage from "./pages/IncomingPage";
// import IncomingDetailsPage from "./pages/IncomingDetailsPage";
// import OutgoingPage from "./pages/OutgoingPage";
// import OutgoingDetailsPage from "./pages/OutgoingDetailsPage";



// ReactDOM.createRoot(document.getElementById("root")!).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<LoginPage />} />
//         <Route path="/dashboard" element={<DashboardPage />} />
//         <Route path="/departments" element={<DepartmentsPage />} /> 
//         <Route path="/incoming" element={<IncomingPage />} /> 
//         <Route path="/incoming/:id" element={<IncomingDetailsPage />} />
//         <Route path="/outgoing" element={<OutgoingPage />} /> 
//         <Route path="/outgoing/:id" element={<OutgoingDetailsPage />} />       
//       </Routes>
//     </BrowserRouter>
//   </React.StrictMode>
// );






// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.tsx'

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )
