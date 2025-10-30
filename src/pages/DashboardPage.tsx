import { useAuthStore } from '../stores/authStore';

function DashboardPage() {
  // ✨ الحل: استدعاء كل جزء من الحالة بشكل منفصل بدلاً من تجميعها في كائن واحد
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  function handleLogout() {
    logout(); // استدعاء دالة الخروج من المخزن
    window.location.href = '/'; // توجيه المستخدم لصفحة الدخول
  }

  // تم حذف `useEffect` بالكامل، حيث أن البيانات تأتي الآن مباشرة من المخزن المركزي.

  return (
    <div dir="rtl" className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              لوحة التحكم
            </h1>
            <p className="text-sm text-slate-500">
              {/* استخدام اسم المستخدم من المخزن */}
              مرحباً بك {user?.fullName || ''} في نظام الأرشيف المؤسسي
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600"
          >
            تسجيل الخروج
          </button>
        </div>

        {/* عرض بيانات المستخدم من المخزن مباشرة */}
        {!user ? (
          <div className="text-slate-500 text-sm">...جاري تحميل بيانات المستخدم</div>
        ) : (
          <div className="grid gap-4">
            <div className="bg-white rounded-xl shadow border border-slate-200 p-4 text-right">
              <h2 className="text-base font-semibold text-slate-700 mb-2">
                بيانات المستخدم
              </h2>
              <div className="text-sm text-slate-600 leading-relaxed space-y-1">
                <div>
                  <span className="font-medium text-slate-800">الاسم الكامل:</span>{' '}
                  {user.fullName}
                </div>
                <div>
                  <span className="font-medium text-slate-800">اسم الدخول:</span>{' '}
                  {user.username}
                </div>
                <div>
                  <span className="font-medium text-slate-800">الإدارة:</span>{' '}
                  {user.department ? user.department.name : '—'}
                </div>
                <div>
                  <span className="font-medium text-slate-800">
                    الصلاحيات (Roles):
                  </span>{' '}
                  {user.roles.length > 0 ? user.roles.join(', ') : 'لا توجد أدوار'}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-slate-200 p-4 text-right">
              <h2 className="text-base font-semibold text-slate-700 mb-2">
                لمحة سريعة
              </h2>
              <ul className="text-sm text-slate-600 leading-relaxed list-disc pr-5">
                <li>عدد الكتب الواردة المفتوحة لقسمك (قريباً 👷)</li>
                <li>الكتب الصادرة بانتظار التوقيع (قريباً 👷)</li>
                <li>الوثائق التي تم رفعها اليوم (قريباً 👷)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;




// import { useAuthStore } from '../stores/authStore'; // ✨ 1. استيراد المخزن

// function DashboardPage() {
//   // ✨ 2. قراءة الحالة والإجراءات من المخزن
//   const { user, logout } = useAuthStore((state) => ({
//     user: state.user,
//     logout: state.logout,
//   }));

//   function handleLogout() {
//     logout(); // ✨ 3. استدعاء دالة الخروج من المخزن
//     window.location.href = '/'; // توجيه المستخدم لصفحة الدخول
//   }

//   // ✨ 4. تم حذف `useEffect` بالكامل!
//   // بيانات المستخدم ستأتي من المخزن مباشرة.

//   return (
//     <div dir="rtl" className="min-h-screen p-6">
//       <div className="max-w-3xl mx-auto">
//         <div className="flex justify-between items-start mb-6">
//           <div>
//             <h1 className="text-2xl font-semibold text-slate-800">
//               لوحة التحكم
//             </h1>
//             <p className="text-sm text-slate-500">
//               {/* ✨ 5. استخدام اسم المستخدم من المخزن */}
//               مرحباً بك {user?.fullName || ''} في نظام الأرشيف المؤسسي
//             </p>
//           </div>

//           <button
//             onClick={handleLogout}
//             className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600"
//           >
//             تسجيل الخروج
//           </button>
//         </div>

//         {/* ✨ 6. عرض بيانات المستخدم من المخزن مباشرة */}
//         {!user ? (
//           <div className="text-slate-500 text-sm">...جاري تحميل بيانات المستخدم</div>
//         ) : (
//           <div className="grid gap-4">
//             <div className="bg-white rounded-xl shadow border border-slate-200 p-4 text-right">
//               <h2 className="text-base font-semibold text-slate-700 mb-2">
//                 بيانات المستخدم
//               </h2>
//               <div className="text-sm text-slate-600 leading-relaxed space-y-1">
//                 <div>
//                   <span className="font-medium text-slate-800">الاسم الكامل:</span>{' '}
//                   {user.fullName}
//                 </div>
//                 <div>
//                   <span className="font-medium text-slate-800">اسم الدخول:</span>{' '}
//                   {user.username}
//                 </div>
//                 {/* <div>
//                   <span className="font-medium text-slate-800">الوظيفة:</span>{' '}
//                   {user.jobTitle ?? '—'}
//                 </div> */}
//                 {/* <div>
//                   <span className="font-medium text-slate-800">الحالة:</span>{' '}
//                   {user.isActive ? 'نشط ✅' : 'موقوف ⛔'}
//                 </div> */}
//                 <div>
//                   <span className="font-medium text-slate-800">الإدارة:</span>{' '}
//                   {user.department ? user.department.name : '—'}
//                 </div>
//                 <div>
//                   <span className="font-medium text-slate-800">
//                     الصلاحيات (Roles):
//                   </span>{' '}
//                   {user.roles.length > 0 ? user.roles.join(', ') : 'لا توجد أدوار'}
//                 </div>
//                 {/* <div>
//                   <span className="font-medium text-slate-800">مستخدم منذ:</span>{' '}
//                   {new Date(user.createdAt).toLocaleString()}
//                 </div> */}
//               </div>
//             </div>

//             <div className="bg-white rounded-xl shadow border border-slate-200 p-4 text-right">
//               <h2 className="text-base font-semibold text-slate-700 mb-2">
//                 لمحة سريعة
//               </h2>
//               <ul className="text-sm text-slate-600 leading-relaxed list-disc pr-5">
//                 <li>عدد الكتب الواردة المفتوحة لقسمك (قريباً 👷)</li>
//                 <li>الكتب الصادرة بانتظار التوقيع (قريباً 👷)</li>
//                 <li>الوثائق التي تم رفعها اليوم (قريباً 👷)</li>
//               </ul>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default DashboardPage;





// import { useEffect, useState } from "react";
// import { getToken, clearToken } from "../auth";

// type MeResponse = {
//   id: number;
//   fullName: string;
//   username: string;
//   isActive: boolean;
//   department: { id: number; name: string } | null;
//   roles: string[];
//   jobTitle: string | null;
//   lastLoginAt: string | null;
//   createdAt: string;
// } | null;

// function DashboardPage() {
//   const [me, setMe] = useState<MeResponse>(null);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     async function loadMe() {
//       const token = getToken();
//       if (!token) {
//         window.location.href = "/";
//         return;
//       }

//       try {
//         const res = await fetch("http://localhost:3000/users/me", {
//           method: "GET",
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (res.status === 401) {
//           // التوكن خربان أو انتهت صلاحيته
//           clearToken();
//           window.location.href = "/";
//           return;
//         }

//         if (!res.ok) {
//           setError("تعذر تحميل بيانات المستخدم");
//           return;
//         }

//         const data = await res.json();
//         setMe(data);
//       } catch (err) {
//         setError("خطأ في الاتصال بالخادم");
//       }
//     }

//     loadMe();
//   }, []);

//   function handleLogout() {
//     clearToken();
//     window.location.href = "/";
//   }

//   return (
//     <div dir="rtl" className="min-h-screen p-6">
//       <div className="max-w-3xl mx-auto">
//         <div className="flex justify-between items-start mb-6">
//           <div>
//             <h1 className="text-2xl font-semibold text-slate-800">
//               لوحة التحكم
//             </h1>
//             <p className="text-sm text-slate-500">
//               مرحباً بك في نظام الأرشيف المؤسسي
//             </p>
//           </div>

//           <button
//             onClick={handleLogout}
//             className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600"
//           >
//             تسجيل الخروج
//           </button>
//         </div>

//         {error && (
//           <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">
//             {error}
//           </div>
//         )}

//         {!me ? (
//           <div className="text-slate-500 text-sm">...جاري التحميل</div>
//         ) : (
//           <div className="grid gap-4">
//             <div className="bg-white rounded-xl shadow border border-slate-200 p-4 text-right">
//               <h2 className="text-base font-semibold text-slate-700 mb-2">
//                 بيانات المستخدم
//               </h2>
//               <div className="text-sm text-slate-600 leading-relaxed space-y-1">
//                 <div>
//                   <span className="font-medium text-slate-800">
//                     الاسم الكامل:
//                   </span>{" "}
//                   {me.fullName}
//                 </div>
//                 <div>
//                   <span className="font-medium text-slate-800">
//                     اسم الدخول:
//                   </span>{" "}
//                   {me.username}
//                 </div>
//                 <div>
//                   <span className="font-medium text-slate-800">
//                     الوظيفة:
//                   </span>{" "}
//                   {me.jobTitle ?? "—"}
//                 </div>
//                 <div>
//                   <span className="font-medium text-slate-800">
//                     الحالة:
//                   </span>{" "}
//                   {me.isActive ? "نشط ✅" : "موقوف ⛔"}
//                 </div>
//                 <div>
//                   <span className="font-medium text-slate-800">
//                     الإدارة:
//                   </span>{" "}
//                   {me.department ? me.department.name : "—"}
//                 </div>
//                 <div>
//                   <span className="font-medium text-slate-800">
//                     الصلاحيات (Roles):
//                   </span>{" "}
//                   {me.roles.length > 0 ? me.roles.join(", ") : "لا توجد أدوار بعد"}
//                 </div>
//                 <div>
//                   <span className="font-medium text-slate-800">
//                     مستخدم منذ:
//                   </span>{" "}
//                   {new Date(me.createdAt).toLocaleString()}
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white rounded-xl shadow border border-slate-200 p-4 text-right">
//               <h2 className="text-base font-semibold text-slate-700 mb-2">
//                 لمحة سريعة
//               </h2>
//               <ul className="text-sm text-slate-600 leading-relaxed list-disc pr-5">
//                 <li>
//                   عدد الكتب الواردة المفتوحة لقسمك (قريباً 👷)
//                 </li>
//                 <li>
//                   الكتب الصادرة بانتظار التوقيع (قريباً 👷)
//                 </li>
//                 <li>
//                   الوثائق التي تم رفعها اليوم (قريباً 👷)
//                 </li>
//               </ul>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default DashboardPage;
