import React, { useEffect, useState } from 'react';
import { 
  Flame, 
  ShieldAlert, 
  Layers, 
  Activity, 
  Radio, 
  Smartphone, 
  Trees, 
  FileText, 
  BarChart3, 
  PlayCircle, 
  Globe, 
  UserCheck, 
  Clock,
  Sparkles,
  Wifi,
  WifiOff,
  HardDrive,
  Bell,
  BellRing,
  Camera
} from 'lucide-react';
import { Language, UserRole } from '../../types';
import { translations } from '../../i18n/translations';
import { OfflineCacheStats } from '../../services/offlineCacheService';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenSimulation?: () => void;
  isSimulating?: boolean;
  simulationStep?: number;
  onOpenCitizenReport?: () => void;
  onOpenFieldOps?: () => void;
  onOpenAnalytics?: () => void;
  onOpenPostFireReport?: () => void;
  onOpenDroneSimulation?: () => void;
  isOnline?: boolean;
  isSimulatedOffline?: boolean;
  onOpenOfflineManager?: () => void;
  offlineStats?: OfflineCacheStats | null;
  onOpenNotifications?: () => void;
  notificationPermission?: NotificationPermission;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  currentRole = 'national_command',
  onRoleChange = (_role: UserRole) => {},
  activeTab = 'command',
  onTabChange = (_tab: string) => {},
  onOpenSimulation = () => {},
  isSimulating = false,
  simulationStep = 0,
  onOpenCitizenReport,
  onOpenFieldOps,
  onOpenAnalytics,
  onOpenPostFireReport,
  onOpenDroneSimulation,
  isOnline = true,
  isSimulatedOffline = false,
  onOpenOfflineManager,
  offlineStats,
  onOpenNotifications,
  notificationPermission = 'default'
}) => {
  const t = translations[currentLang];
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Africa/Algiers' }) + ' (UTC+1 DZ)');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const rolesList: { id: UserRole; label: string }[] = [
    { id: 'national_command', label: t.roleNationalCommand },
    { id: 'civil_protection', label: t.roleCivilProtection },
    { id: 'wilaya_command', label: t.roleWilayaCommand },
    { id: 'forestry_expert', label: t.roleForestryExpert },
    { id: 'field_team', label: t.roleFieldTeam },
    { id: 'data_analyst', label: t.roleDataAnalyst },
    { id: 'citizen', label: t.roleCitizen },
    { id: 'super_admin', label: t.roleSuperAdmin }
  ];

  return (
    <header className="border-b border-slate-800 bg-[#090d16] sticky top-0 z-40 shadow-xl">
      {/* Simulation Disclaimer Banner */}
      <div className="bg-amber-950/40 border-b border-amber-600/30 px-4 py-1 text-xs text-amber-300 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span className="font-semibold tracking-wide uppercase">
            {t.simulationNotice}
          </span>
          <span className="hidden md:inline text-amber-400/70 border-l border-amber-600/30 pl-2">
            AWIS-CORE v4.3.1 (Spatial PostGIS & DeepForest AI Models)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSimulation}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition cursor-pointer text-xs"
          >
            <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.simulateDemo}</span>
            {isSimulating && (
              <span className="bg-amber-500 text-black px-1 rounded text-[10px] font-bold">
                T+{simulationStep}m
              </span>
            )}
          </button>
          <div className="hidden sm:flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{timeStr}</span>
          </div>
        </div>
      </div>

      {/* Main Top Institution Bar */}
      <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 via-emerald-800 to-slate-900 border border-emerald-500/40 shadow-inner">
            <span className="text-xl select-none" role="img" aria-label="Algeria Flag">🇩🇿</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>{t.systemAcronym}</span>
                <span className="text-xs font-normal text-emerald-400 hidden sm:inline px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                  NATIONAL PLATFORM
                </span>
              </h1>
              <span className="text-xs text-slate-500 hidden lg:inline">|</span>
              <span className="text-xs font-medium text-slate-300 hidden lg:inline">
                {t.systemTitle}
              </span>
            </div>
            <p className="text-[11px] text-amber-400/90 font-serif italic tracking-wide">
              &ldquo;{t.tagline}&rdquo;
            </p>
          </div>
        </div>

        {/* Global Controls: Role, Offline Status & Language */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Offline / Forest Cache Status Button */}
          {onOpenOfflineManager && (
            <button
              onClick={onOpenOfflineManager}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                isOnline && !isSimulatedOffline
                  ? 'bg-slate-900/90 border-slate-700/80 text-emerald-400 hover:border-emerald-500/50 hover:bg-slate-800'
                  : 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse shadow-lg shadow-amber-950/50'
              }`}
              title={isOnline && !isSimulatedOffline ? 'Cloud Synced - Click to Manage Offline Cache' : 'Offline Forest Mode Active - Click to Manage'}
            >
              {isOnline && !isSimulatedOffline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden md:inline">
                {isOnline && !isSimulatedOffline 
                  ? (currentLang === 'ar' ? 'متصل' : 'Online') 
                  : (currentLang === 'ar' ? 'وضع الغابات (أوفلاين)' : 'Offline Forest')}
              </span>
              {offlineStats?.incidentsCount ? (
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 hidden sm:inline">
                  {offlineStats.incidentsCount} Hotspots
                </span>
              ) : null}
              {offlineStats?.pendingQueuedReports ? (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-black animate-bounce">
                  {offlineStats.pendingQueuedReports}
                </span>
              ) : null}
            </button>
          )}

          {/* Browser Push Notifications Button */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                notificationPermission === 'granted'
                  ? 'bg-slate-900/90 border-slate-700/80 text-amber-300 hover:border-amber-500/50 hover:bg-slate-800'
                  : 'bg-red-950/70 border-red-500/70 text-red-300 animate-pulse'
              }`}
              title={
                notificationPermission === 'granted'
                  ? (currentLang === 'ar' ? 'إشعارات الدفع في الخلفية مفعلة - انقر للإدارة' : 'Push Alerts Active - Click to Manage')
                  : (currentLang === 'ar' ? 'تفعيل إشعارات الطوارئ في الخلفية' : 'Enable Emergency Push Alerts')
              }
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">
                {currentLang === 'ar' ? 'إشعارات الطوارئ' : 'Push Alerts'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-400'
                    : 'bg-red-400 animate-ping'
                }`}
              />
            </button>
          )}

          {/* Active Role Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 hidden sm:inline">{t.activeRole}:</span>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-emerald-300 font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {rolesList.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 text-xs font-mono">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <button
              onClick={() => onLanguageChange('ar')}
              className={`px-2 py-0.5 rounded transition ${currentLang === 'ar' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              العربية
            </button>
            <button
              onClick={() => onLanguageChange('fr')}
              className={`px-2 py-0.5 rounded transition ${currentLang === 'fr' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              FR
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-0.5 rounded transition ${currentLang === 'en' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <nav className="max-w-[1920px] mx-auto px-4 flex items-center gap-1 overflow-x-auto text-xs font-medium border-t border-slate-800/80 scrollbar-none py-1">
        <button
          onClick={() => onTabChange('command')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'command'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.navCommandCenter}</span>
        </button>

        <button
          onClick={() => onTabChange('fusion')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'fusion'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t.navAlertFusion}</span>
        </button>

        <button
          onClick={() => onTabChange('risk')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'risk'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span>{t.navRiskEngine}</span>
        </button>

        <button
          onClick={() => onTabChange('digitalTwin')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'digitalTwin'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Trees className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.navDigitalTwin}</span>
        </button>

        <button
          onClick={() => {
            onTabChange('citizen');
            onOpenCitizenReport?.();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'citizen'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.navCitizenApp}</span>
        </button>

        <button
          onClick={() => {
            onTabChange('fieldOps');
            onOpenFieldOps?.();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'fieldOps'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>{t.navFieldOps}</span>
        </button>

        <button
          onClick={() => {
            onTabChange('analytics');
            onOpenAnalytics?.();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
          <span>{t.navAnalytics}</span>
        </button>

        <button
          onClick={() => {
            onTabChange('postFire');
            onOpenPostFireReport?.();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition cursor-pointer ${
            activeTab === 'postFire'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-slate-300" />
          <span>{t.navPostFire}</span>
        </button>

        {onOpenDroneSimulation && (
          <button
            onClick={onOpenDroneSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition cursor-pointer text-slate-300 hover:text-emerald-300 hover:bg-slate-800/60 border border-emerald-500/20 bg-emerald-950/30 ml-auto"
            title="Airborne Drone Reconnaissance Cockpit & Dual Camera Simulator"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-emerald-300">
              {currentLang === 'ar' ? 'استطلاع الدرون (Recon)' : 'Drone Recon'}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              FLIR / RGB
            </span>
          </button>
        )}
      </nav>
    </header>
  );
};
