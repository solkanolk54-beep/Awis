import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  User,
  Radio,
  Building2,
  CheckCircle2,
  Lock,
  LogOut,
  X,
  KeyRound,
  Sparkles,
  Smartphone,
  Truck,
  Flame,
  Plane,
  FileCheck2,
  Cloud
} from 'lucide-react';
import { useRBAC } from '../../context/RBACContext';
import { RBACRole, Language } from '../../types';

interface RBACModalProps {
  currentLang?: Language;
}

export const RBACModal: React.FC<RBACModalProps> = ({ currentLang = 'ar' }) => {
  const {
    currentUser,
    userProfile,
    role,
    authLoading,
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginWithGoogle,
    loginAsTacticalRole,
    switchRole,
    logout,
    permissions
  } = useRBAC();

  const [selectedWilaya, setSelectedWilaya] = useState<string>('Algiers');
  const [officerName, setOfficerName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isArabic = currentLang === 'ar';

  if (!isAuthModalOpen) return null;

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Google authentication failed');
    }
  };

  const handleRoleSelect = async (newRole: RBACRole) => {
    setErrorMessage(null);
    try {
      if (currentUser) {
        await switchRole(newRole);
      } else {
        await loginAsTacticalRole(newRole, {
          displayName: officerName.trim() || undefined,
          wilaya: selectedWilaya
        });
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to switch role');
    }
  };

  const roleCards: {
    id: RBACRole;
    title: { ar: string; en: string };
    subtitle: { ar: string; en: string };
    clearance: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    borderColor: string;
    bgColor: string;
    capabilities: { ar: string[]; en: string[] };
  }[] = [
    {
      id: 'Citizen',
      title: { ar: 'المواطن & السكان المحليين', en: 'Citizen & Local Resident' },
      subtitle: { ar: 'مستوى الوصول العام (Public Safety)', en: 'Public Safety Alert Tier' },
      clearance: 'Clearance Level 1',
      icon: Smartphone,
      accentColor: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      bgColor: 'bg-amber-950/20',
      capabilities: {
        ar: [
          'تلقي تنبيهات الإنذار المبكر وإشعارات الإخلاء',
          'خريطة المخاطر وحرائق الغابات المرصودة',
          'إرسال بلاغات رصد الدخان مع الصور والموقع الجغرافي',
          'دليل السلامة وإرشادات الحماية المدنية'
        ],
        en: [
          'Receive early warning & evacuation alerts',
          'Live public wildfire & weather risk map',
          'Submit smoke & fire observation reports',
          'Access public civil protection safety guidelines'
        ]
      }
    },
    {
      id: 'FieldUnit',
      title: { ar: 'الوحدة الميدانية والرتل المتنقل', en: 'Field Unit & Mobile Column' },
      subtitle: { ar: 'فرق التدخل للحماية المدنية وخبراء الغابات', en: 'Civil Protection & Forestry Brigades' },
      clearance: 'Clearance Level 2',
      icon: Truck,
      accentColor: 'text-blue-400',
      borderColor: 'border-blue-500/40',
      bgColor: 'bg-blue-950/20',
      capabilities: {
        ar: [
          'كل صلاحيات المواطن + شاشة العمليات الميدانية دون اتصال',
          'استطلاع الدرون التكتيكي والكاميرات الحرارية',
          'ملاحة نقاط التزود بالمياه ونقاط المراقبة الغابية',
          'تحديث تقارير التدخل الميداني على خط النار'
        ],
        en: [
          'All citizen features + Offline forest ops terminal',
          'Tactical drone reconnaissance & thermal camera',
          'Forest water supply points & watchtowers navigation',
          'Live frontline telemetry & field status updates'
        ]
      }
    },
    {
      id: 'CentralCommand',
      title: { ar: 'القيادة المركزية وغرفة العمليات', en: 'Central Command & DGPC' },
      subtitle: { ar: 'مركز القيادة الوطني وولاة الجمهورية', en: 'National Crisis & Dispatch Center' },
      clearance: 'Clearance Level 3 (Full Operational)',
      icon: Building2,
      accentColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/40',
      bgColor: 'bg-emerald-950/20',
      capabilities: {
        ar: [
          'الصلاحية الحصرية لتوزيع وتحريك أرتال الحماية المدنية',
          'توجيه طائرات الإخماد (Beriev Be-200 & Air Tractor)',
          'اعتماد وتأكيد الحوادث الرسمية وتغيير حالات الطوارئ',
          'محاكاة انتشار النيران بالذكاء الاصطناعي (D3 Burn Rate)',
          'التقارير التحليلية والاستخباراتية الوطنية'
        ],
        en: [
          'Exclusive authority to dispatch tactical ground fleets',
          'Deploy Beriev Be-200 & Air Tractor water bombers',
          'Official incident confirmation & emergency state declaration',
          'D3 AI burn rate spread simulations & isochrones',
          'National intelligence & post-fire satellite analytics'
        ]
      }
    }
  ];

  return (
    <div 
      id="rbac-modal-backdrop"
      onClick={() => setIsAuthModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        id="rbac-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-[#0e1422] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto cursor-default"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-slate-900 border border-emerald-500/50 shadow-md">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {isArabic
                    ? 'إدارة الهوية والتحكم في الصلاحيات (Firebase Auth & RBAC)'
                    : 'Firebase Authentication & Role-Based Access Control'}
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                  AWIS Security Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isArabic
                  ? 'التحكم الهرمي في صلاحيات التوجيه التكتيكي والعمليات الحساسة (المواطن / الوحدة الميدانية / القيادة المركزية)'
                  : 'Multi-Tier Operational Gate (Citizen / FieldUnit / CentralCommand)'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-red-950/60 border border-red-500/60 text-xs text-red-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Active Auth Status Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-12 h-12 rounded-full border border-emerald-500/40 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                    role === 'CentralCommand'
                      ? 'bg-emerald-400'
                      : role === 'FieldUnit'
                      ? 'bg-blue-400'
                      : 'bg-amber-400'
                  }`}
                  title={`Active Role: ${role}`}
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">
                    {userProfile?.displayName || currentUser?.displayName || (isArabic ? 'مستجيب طوارئ' : 'Emergency Responder')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      role === 'CentralCommand'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : role === 'FieldUnit'
                        ? 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {role} (L{userProfile?.clearanceLevel || (role === 'CentralCommand' ? 3 : role === 'FieldUnit' ? 2 : 1)})
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>{currentUser?.email || (isArabic ? 'جلسة تشغيلية مؤقتة' : 'Tactical Session')}</span>
                  {userProfile?.badgeNumber && (
                    <>
                      <span>•</span>
                      <span className="text-slate-300 font-semibold">{userProfile.badgeNumber}</span>
                    </>
                  )}
                  {userProfile?.wilaya && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400">{userProfile.wilaya}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Actions (Google Login or Logout) */}
            <div className="flex items-center gap-2">
              {!currentUser ? (
                <button
                  onClick={handleGoogleLogin}
                  disabled={authLoading}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition shadow cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isArabic ? 'تسجيل الدخول عبر Google' : 'Sign In with Google'}</span>
                </button>
              ) : (
                <button
                  onClick={logout}
                  disabled={authLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'تسجيل الخروج' : 'Sign Out'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Section: Select Role / Clearance Tier */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>{isArabic ? 'تحديد الرتبة ومستوى التفويض الأمني' : 'Select Operational Role & Clearance Tier'}</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {isArabic ? 'انقر لتفعيل الرتبة فورياً ومزامنتها مع Firestore' : 'Click to activate role & sync to Cloud'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {roleCards.map((c) => {
                const Icon = c.icon;
                const isSelected = role === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleRoleSelect(c.id)}
                    className={`relative p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${c.borderColor} ${c.bgColor} shadow-lg ring-2 ring-offset-2 ring-offset-slate-900 ring-emerald-500/50`
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isArabic ? 'الرتبة النشطة' : 'Active'}</span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className={`p-2 rounded-lg bg-slate-800/90 border border-slate-700 ${c.accentColor}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                            {c.clearance}
                          </span>
                          <h4 className="text-sm font-bold text-white leading-tight">
                            {c.title[isArabic ? 'ar' : 'en']}
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 mb-3.5 font-sans">
                        {c.subtitle[isArabic ? 'ar' : 'en']}
                      </p>

                      {/* Capabilities List */}
                      <div className="space-y-1.5 border-t border-slate-800/80 pt-3 text-[11px]">
                        {c.capabilities[isArabic ? 'ar' : 'en'].map((cap, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-slate-300 leading-tight">
                            <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                            <span>{cap}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">
                        {c.id === 'CentralCommand'
                          ? (isArabic ? 'صلاحيات كاملة للتحريك' : 'Full Dispatch Authority')
                          : c.id === 'FieldUnit'
                          ? (isArabic ? 'استطلاع وعمليات ميدانية' : 'Tactical Telemetry & Recon')
                          : (isArabic ? 'رصد وبلاغات وتنبيهات' : 'Alerts & Smoke Reports')}
                      </span>
                      <button
                        type="button"
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-emerald-500 text-black font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? (isArabic ? 'مفعل' : 'Selected') : (isArabic ? 'تفعيل' : 'Activate')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time RBAC Security Matrix Checklist */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isArabic ? 'مصفوفة الصلاحيات اللحظية لرتبتك الحالية' : 'Active RBAC Operational Permissions Matrix'}</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                {role} ({userProfile?.clearanceLevel || (role === 'CentralCommand' ? 'Level 3' : role === 'FieldUnit' ? 'Level 2' : 'Level 1')})
              </span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${permissions.canDispatchResources ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                <span>{isArabic ? 'تحريك أرتال الحماية المدنية' : 'Dispatch Fleets'}</span>
                {permissions.canDispatchResources ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${permissions.canConfirmRejectIncidents ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                <span>{isArabic ? 'اعتماد وإغلاق الحوادث' : 'Confirm Incidents'}</span>
                {permissions.canConfirmRejectIncidents ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${permissions.canAccessDroneRecon ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                <span>{isArabic ? 'استطلاع الدرون الحراري' : 'Thermal Drone Recon'}</span>
                {permissions.canAccessDroneRecon ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${permissions.canAccessFieldOps ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                <span>{isArabic ? 'العمليات الميدانية دون شبكة' : 'Offline Field Ops'}</span>
                {permissions.canAccessFieldOps ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${permissions.canTriggerSimulations ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                <span>{isArabic ? 'إدارة سيناريوهات المحاكاة' : 'Tactical Simulations'}</span>
                {permissions.canTriggerSimulations ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${permissions.canAccessBurnRateModeling ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                <span>{isArabic ? 'نمذجة الانتشار (D3)' : 'D3 Burn Spread'}</span>
                {permissions.canAccessBurnRateModeling ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${permissions.canAccessAnalytics ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                <span>{isArabic ? 'التحليلات الوطنية المتقدمة' : 'National Analytics'}</span>
                {permissions.canAccessAnalytics ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${permissions.canSubmitCitizenReport ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                <span>{isArabic ? 'تقديم بلاغات رصد الدخان' : 'Citizen Reporting'}</span>
                {permissions.canSubmitCitizenReport ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {isArabic
                ? 'مزامنة سحابية مؤمنة عبر Firebase Authentication و Cloud Firestore'
                : 'Secured via Firebase Authentication & Cloud Firestore Rules'}
            </span>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow cursor-pointer"
          >
            {isArabic ? 'تأكيد وإغلاق' : 'Confirm & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
