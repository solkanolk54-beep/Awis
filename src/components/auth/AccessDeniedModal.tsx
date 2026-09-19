import React from 'react';
import { ShieldAlert, Lock, ArrowRight, X, AlertTriangle, KeyRound } from 'lucide-react';
import { useRBAC } from '../../context/RBACContext';
import { Language } from '../../types';

interface AccessDeniedModalProps {
  currentLang?: Language;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({ currentLang = 'ar' }) => {
  const { accessDeniedModal, closeAccessDeniedModal, setIsAuthModalOpen, role } = useRBAC();

  if (!accessDeniedModal) return null;

  const isArabic = currentLang === 'ar';

  const roleNames: Record<string, { ar: string; en: string }> = {
    Citizen: { ar: 'المواطن (مستوى 1)', en: 'Citizen (Level 1)' },
    FieldUnit: { ar: 'الوحدة الميدانية (مستوى 2)', en: 'Field Unit (Level 2)' },
    CentralCommand: { ar: 'القيادة المركزية (مستوى 3)', en: 'Central Command (Level 3)' }
  };

  return (
    <div 
      id="access-denied-modal-backdrop"
      onClick={closeAccessDeniedModal}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        id="access-denied-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-slate-900 border-2 border-red-500/80 rounded-xl shadow-2xl overflow-hidden cursor-default"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header Alert Strip */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-slate-900 px-4 py-3 border-b border-red-500/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-300">
            <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-wide text-white flex items-center gap-2">
                <span>{isArabic ? 'صلاحيات الوصول مقيدة' : 'Access Restricted (RBAC Gate)'}</span>
                <span className="px-1.5 py-0.2 rounded bg-red-500/30 text-red-300 text-[10px] font-mono uppercase">
                  Security Lock
                </span>
              </h3>
              <p className="text-[11px] text-red-300/80 font-mono">
                {isArabic ? 'نظام التحقق الأمني لغرفة العمليات المركزية' : 'AWIS Operational Clearance Protocol'}
              </p>
            </div>
          </div>
          <button
            onClick={closeAccessDeniedModal}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-slate-100">
                {isArabic ? 'الإجراء المطلوب:' : 'Attempted Action:'}{' '}
                <span className="text-amber-300 font-mono underline">{accessDeniedModal.actionTitle}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {isArabic
                  ? accessDeniedModal.reason
                  : accessDeniedModal.reason}
              </p>
            </div>
          </div>

          {/* Clearance Level Comparison */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">
                {isArabic ? 'رتبتك الحالية' : 'Current Role'}
              </div>
              <div className="text-slate-200 font-bold mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{roleNames[role]?.[isArabic ? 'ar' : 'en'] || role}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/40">
              <div className="text-[10px] text-red-400 uppercase">
                {isArabic ? 'المستوى المطلوب' : 'Required Role'}
              </div>
              <div className="text-red-300 font-bold mt-0.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>{roleNames[accessDeniedModal.requiredRole]?.[isArabic ? 'ar' : 'en'] || accessDeniedModal.requiredRole}</span>
              </div>
            </div>
          </div>

          {/* Explanation Callout */}
          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
            {isArabic
              ? 'تتطلب عمليات تحريك أرتال الحماية المدنية، طائرات الإخماد، أو تغيير حالة الحوادث الرسمية تفويضاً صريحاً من مركز التنسيق الوطني لمنع التضارب وضمان سرعة الاستجابة.'
              : 'Mobilizing civil protection columns, water bombers, or official incident status transitions requires validated Central Command clearance.'}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={closeAccessDeniedModal}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {isArabic ? 'إلغاء' : 'Dismiss'}
          </button>

          <button
            onClick={() => {
              closeAccessDeniedModal();
              setIsAuthModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-red-900/30 transition cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isArabic ? 'تسجيل الدخول كضابط / ترقية الصلاحية' : 'Elevate Clearance / Sign In'}</span>
            <ArrowRight className={`w-3.5 h-3.5 ${isArabic ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
