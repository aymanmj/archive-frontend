// src/components/incoming/IncomingActions.tsx

import { useState } from "react";
import api from "../../api/apiClient";

type Props = {
  incomingId: string | number;
  onDone?: () => void; // لإعادة التحميل بعد الإجراء
};

export default function IncomingActions({ incomingId, onDone }: Props) {
  const [tab, setTab] = useState<'forward'|'assign'|'status'|'note'>('forward');
  const [loading, setLoading] = useState(false);

  // forward
  const [targetDept, setTargetDept] = useState<number | ''>('');
  const [assignUserId, setAssignUserId] = useState<number | ''>('');
  const [closePrev, setClosePrev] = useState(true);
  const [note, setNote] = useState('');

  // status
  const [distId, setDistId] = useState<string>('');
  const [newStatus, setNewStatus] = useState<'Open'|'InProgress'|'Closed'|'Escalated'>('InProgress');
  const [statusNote, setStatusNote] = useState('');

  // assign
  const [assignDistId, setAssignDistId] = useState<string>('');
  const [newAssignee, setNewAssignee] = useState<number | ''>('');
  const [assignNote, setAssignNote] = useState('');

  // note only
  const [noteDistId, setNoteDistId] = useState<string>('');
  const [onlyNote, setOnlyNote] = useState('');

  const handleForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDept) return alert('اختر القسم المستهدف');
    setLoading(true);
    try {
      await api.post(`/incoming/${incomingId}/forward`, {
        targetDepartmentId: Number(targetDept),
        assignedToUserId: assignUserId === '' ? undefined : Number(assignUserId),
        note: note || null,
        closePrevious: !!closePrev,
      });
      onDone?.();
      setNote('');
      setAssignUserId('');
      setTargetDept('');
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'فشل الإحالة');
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distId) return alert('ادخل رقم توزيع صالح');
    setLoading(true);
    try {
      await api.patch(`/incoming/distributions/${distId}/status`, {
        status: newStatus,
        note: statusNote || null,
      });
      onDone?.();
      setStatusNote('');
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'فشل تغيير الحالة');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignDistId) return alert('ادخل رقم توزيع صالح');
    if (!newAssignee) return alert('ادخل المستخدم المكلّف');
    setLoading(true);
    try {
      await api.patch(`/incoming/distributions/${assignDistId}/assign`, {
        assignedToUserId: Number(newAssignee),
        note: assignNote || null,
      });
      onDone?.();
      setAssignNote('');
      setNewAssignee('');
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'فشل التعيين');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteDistId) return alert('ادخل رقم توزيع صالح');
    if (!onlyNote.trim()) return alert('اكتب ملاحظة');
    setLoading(true);
    try {
      await api.post(`/incoming/distributions/${noteDistId}/notes`, {
        note: onlyNote,
      });
      onDone?.();
      setOnlyNote('');
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'فشل إضافة الملاحظة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-3" dir="rtl">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => setTab('forward')} className={`px-3 py-1.5 rounded-xl border ${tab==='forward'?'bg-blue-600 text-white':'hover:bg-gray-50'}`}>إحالة</button>
        <button onClick={() => setTab('assign')}  className={`px-3 py-1.5 rounded-xl border ${tab==='assign'?'bg-blue-600 text-white':'hover:bg-gray-50'}`}>تعيين</button>
        <button onClick={() => setTab('status')}  className={`px-3 py-1.5 rounded-xl border ${tab==='status'?'bg-blue-600 text-white':'hover:bg-gray-50'}`}>تغيير الحالة</button>
        <button onClick={() => setTab('note')}    className={`px-3 py-1.5 rounded-xl border ${tab==='note'?'bg-blue-600 text-white':'hover:bg-gray-50'}`}>ملاحظة</button>
      </div>

      {tab==='forward' && (
        <form onSubmit={handleForward} className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs">القسم المستهدف</label>
            <input className="w-full border rounded-xl p-2" type="number" value={targetDept === '' ? '' : targetDept} onChange={e=>setTargetDept(e.target.value===''?'':Number(e.target.value))}/>
          </div>
          <div>
            <label className="text-xs">المكلّف (اختياري)</label>
            <input className="w-full border rounded-xl p-2" type="number" value={assignUserId === '' ? '' : assignUserId} onChange={e=>setAssignUserId(e.target.value===''?'':Number(e.target.value))}/>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs">ملاحظة</label>
            <input className="w-full border rounded-xl p-2" value={note} onChange={e=>setNote(e.target.value)}/>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input id="closePrev" type="checkbox" checked={closePrev} onChange={e=>setClosePrev(e.target.checked)}/>
            <label htmlFor="closePrev" className="text-sm">إغلاق التوزيع السابق تلقائيًا</label>
          </div>
          <div className="sm:col-span-2">
            <button disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2">{loading?'...':'تنفيذ الإحالة'}</button>
          </div>
        </form>
      )}

      {tab==='assign' && (
        <form onSubmit={handleAssign} className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs">رقم التوزيع</label>
            <input className="w-full border rounded-xl p-2" value={distId||''} onChange={e=>setAssignDistId(e.target.value)}/>
          </div>
          <div>
            <label className="text-xs">المكلّف الجديد (UserId)</label>
            <input className="w-full border rounded-xl p-2" type="number" value={newAssignee === '' ? '' : newAssignee} onChange={e=>setNewAssignee(e.target.value===''?'':Number(e.target.value))}/>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs">ملاحظة</label>
            <input className="w-full border rounded-xl p-2" value={assignNote} onChange={e=>setAssignNote(e.target.value)}/>
          </div>
          <div className="sm:col-span-2">
            <button disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2">{loading?'...':'تطبيق التعيين'}</button>
          </div>
        </form>
      )}

      {tab==='status' && (
        <form onSubmit={handleStatus} className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs">رقم التوزيع</label>
            <input className="w-full border rounded-xl p-2" value={distId} onChange={e=>setDistId(e.target.value)}/>
          </div>
          <div>
            <label className="text-xs">الحالة الجديدة</label>
            <select className="w-full border rounded-xl p-2 bg-white" value={newStatus} onChange={e=>setNewStatus(e.target.value as any)}>
              <option value="Open">Open</option>
              <option value="InProgress">InProgress</option>
              <option value="Closed">Closed</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs">ملاحظة</label>
            <input className="w-full border rounded-xl p-2" value={statusNote} onChange={e=>setStatusNote(e.target.value)}/>
          </div>
          <div className="sm:col-span-2">
            <button disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2">{loading?'...':'تغيير الحالة'}</button>
          </div>
        </form>
      )}

      {tab==='note' && (
        <form onSubmit={handleNoteOnly} className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs">رقم التوزيع</label>
            <input className="w-full border rounded-xl p-2" value={noteDistId} onChange={e=>setNoteDistId(e.target.value)}/>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs">ملاحظة</label>
            <input className="w-full border rounded-xl p-2" value={onlyNote} onChange={e=>setOnlyNote(e.target.value)}/>
          </div>
          <div className="sm:col-span-2">
            <button disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2">{loading?'...':'إضافة الملاحظة'}</button>
          </div>
        </form>
      )}
    </section>
  );
}
