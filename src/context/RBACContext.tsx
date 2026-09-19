import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, signInWithGoogle, signInAnonymouslyUser, signOutCurrentUser, saveUserProfileToCloud, subscribeToUserProfile, getUserProfileFromCloud } from '../firebaseConfig';
import { RBACRole, UserProfile, RBACPermissions } from '../types';

export interface AccessDeniedInfo {
  actionTitle: string;
  requiredRole: RBACRole;
  reason: string;
}

export interface RBACContextValue {
  // Current Auth State
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  authLoading: boolean;
  
  // High-Level RBAC States (Explicitly partitioned)
  role: RBACRole;
  isCitizen: boolean;
  isFieldUnit: boolean;
  isCentralCommand: boolean;
  clearanceLevel: 1 | 2 | 3;
  
  // Specific Operational Capability Gates
  permissions: RBACPermissions;
  
  // Auth & Role Actions
  loginWithGoogle: () => Promise<void>;
  loginAsTacticalRole: (targetRole: RBACRole, details?: Partial<UserProfile>) => Promise<void>;
  switchRole: (newRole: RBACRole) => Promise<void>;
  logout: () => Promise<void>;
  
  // UI Guards & Authorization Modals
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  accessDeniedModal: AccessDeniedInfo | null;
  closeAccessDeniedModal: () => void;
  
  // Guard Execution Helper
  checkAndExecute: (actionTitle: string, requiredRole: RBACRole, callback: () => void) => boolean;
}

const DEFAULT_PERMISSIONS: Record<RBACRole, RBACPermissions> = {
  Citizen: {
    canDispatchResources: false,
    canConfirmRejectIncidents: false,
    canEditIncidentStatus: false,
    canAccessDroneRecon: false,
    canAccessFieldOps: false,
    canTriggerSimulations: false,
    canAccessAnalytics: false,
    canAccessPostFireReports: false,
    canSubmitCitizenReport: true,
    canAccessBurnRateModeling: false,
    canAccessSatelliteUplink: false,
    canDeclareNationalEmergency: false
  },
  FieldUnit: {
    canDispatchResources: false,
    canConfirmRejectIncidents: false,
    canEditIncidentStatus: true,
    canAccessDroneRecon: true,
    canAccessFieldOps: true,
    canTriggerSimulations: false,
    canAccessAnalytics: false,
    canAccessPostFireReports: false,
    canSubmitCitizenReport: true,
    canAccessBurnRateModeling: true,
    canAccessSatelliteUplink: true,
    canDeclareNationalEmergency: false
  },
  CentralCommand: {
    canDispatchResources: true,
    canConfirmRejectIncidents: true,
    canEditIncidentStatus: true,
    canAccessDroneRecon: true,
    canAccessFieldOps: true,
    canTriggerSimulations: true,
    canAccessAnalytics: true,
    canAccessPostFireReports: true,
    canSubmitCitizenReport: true,
    canAccessBurnRateModeling: true,
    canAccessSatelliteUplink: true,
    canDeclareNationalEmergency: true
  }
};

const RBACContext = createContext<RBACContextValue | null>(null);

const LOCAL_ROLE_KEY = 'awis_rbac_role_override';

export const RBACProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [accessDeniedModal, setAccessDeniedModal] = useState<AccessDeniedInfo | null>(null);

  // Fallback / Initial Role (defaults to CentralCommand for immediate command room utility, or stored preference)
  const [activeRole, setActiveRole] = useState<RBACRole>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_ROLE_KEY) : null;
    if (saved === 'Citizen' || saved === 'FieldUnit' || saved === 'CentralCommand') {
      return saved;
    }
    return 'CentralCommand';
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch or subscribe to user profile in Firestore
        try {
          const profile = await getUserProfileFromCloud(user.uid);
          if (profile) {
            setUserProfile(profile);
            setActiveRole(profile.role);
          } else {
            // First time login - initialize profile with activeRole
            const newProfile: UserProfile = {
              id: user.uid,
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || (user.isAnonymous ? 'Guest Responder' : 'Civil Protection Officer'),
              photoURL: user.photoURL,
              role: activeRole,
              clearanceLevel: activeRole === 'CentralCommand' ? 3 : activeRole === 'FieldUnit' ? 2 : 1,
              isAnonymous: user.isAnonymous,
              lastLoginAt: new Date().toISOString()
            };
            setUserProfile(newProfile);
            saveUserProfileToCloud(newProfile).catch(() => {});
          }
        } catch (e) {
          console.warn('Could not retrieve Firestore user profile, using memory state:', e);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, [activeRole]);

  // Subscribe to real-time changes if user exists
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToUserProfile(currentUser.uid, (cloudProfile) => {
      if (cloudProfile) {
        setUserProfile(cloudProfile);
        setActiveRole(cloudProfile.role);
        localStorage.setItem(LOCAL_ROLE_KEY, cloudProfile.role);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Login with Google OAuth
  const loginWithGoogle = async () => {
    setAuthLoading(true);
    try {
      const user = await signInWithGoogle();
      const existing = await getUserProfileFromCloud(user.uid);
      const assignedRole = existing?.role || activeRole;
      const profile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Google Officer',
        photoURL: user.photoURL,
        role: assignedRole,
        clearanceLevel: assignedRole === 'CentralCommand' ? 3 : assignedRole === 'FieldUnit' ? 2 : 1,
        isAnonymous: false,
        lastLoginAt: new Date().toISOString()
      };
      await saveUserProfileToCloud(profile);
      setUserProfile(profile);
      setActiveRole(assignedRole);
      localStorage.setItem(LOCAL_ROLE_KEY, assignedRole);
      setIsAuthModalOpen(false);
    } catch (err) {
      console.error('Login with Google failed:', err);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  // Login / Switch to specific Tactical Role
  const loginAsTacticalRole = async (targetRole: RBACRole, details?: Partial<UserProfile>) => {
    setAuthLoading(true);
    try {
      let user = currentUser;
      if (!user) {
        try {
          user = await signInAnonymouslyUser();
        } catch {
          // If anonymous sign in is disabled or offline, maintain synthetic local user
          user = null;
        }
      }

      const uid = user ? user.uid : `demo-${targetRole.toLowerCase()}-${Date.now().toString(36)}`;
      const profile: UserProfile = {
        id: uid,
        uid: uid,
        email: user?.email || (targetRole === 'Citizen' ? 'citizen@awis.dz' : targetRole === 'FieldUnit' ? 'patrol.colonne@protectioncivile.dz' : 'dgpc.command@interieur.gov.dz'),
        displayName: details?.displayName || (
          targetRole === 'CentralCommand'
            ? 'Commandant DGPC (Central Command)'
            : targetRole === 'FieldUnit'
            ? 'Chef de Colonne Mobile (Tizi Ouzou)'
            : 'Citoyen Vigilant (Public Citizen)'
        ),
        role: targetRole,
        badgeNumber: details?.badgeNumber || (targetRole === 'CentralCommand' ? 'DGPC-NAT-001' : targetRole === 'FieldUnit' ? 'COL-MOB-15' : undefined),
        unitName: details?.unitName || (targetRole === 'CentralCommand' ? 'National Coordination Centre' : targetRole === 'FieldUnit' ? 'Forestry & Civil Brigade #4' : undefined),
        wilaya: details?.wilaya || (targetRole === 'CentralCommand' ? 'Algiers (الجزائر العاصمة)' : targetRole === 'FieldUnit' ? 'Tizi Ouzou (تيزي وزو)' : 'Béjaïa (بجاية)'),
        clearanceLevel: targetRole === 'CentralCommand' ? 3 : targetRole === 'FieldUnit' ? 2 : 1,
        isAnonymous: !user || user.isAnonymous,
        lastLoginAt: new Date().toISOString()
      };

      setUserProfile(profile);
      setActiveRole(targetRole);
      localStorage.setItem(LOCAL_ROLE_KEY, targetRole);

      if (user) {
        saveUserProfileToCloud(profile).catch(() => {});
      }
      setIsAuthModalOpen(false);
    } catch (err) {
      console.error('Tactical role switch failed:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Switch role directly
  const switchRole = async (newRole: RBACRole) => {
    setActiveRole(newRole);
    localStorage.setItem(LOCAL_ROLE_KEY, newRole);

    if (currentUser && userProfile) {
      const updatedProfile: UserProfile = {
        ...userProfile,
        role: newRole,
        clearanceLevel: newRole === 'CentralCommand' ? 3 : newRole === 'FieldUnit' ? 2 : 1,
        updatedAt: new Date().toISOString()
      };
      setUserProfile(updatedProfile);
      saveUserProfileToCloud(updatedProfile).catch(() => {});
    }
  };

  // Sign Out
  const logout = async () => {
    setAuthLoading(true);
    try {
      await signOutCurrentUser();
      setUserProfile(null);
      setCurrentUser(null);
      // Reset to Citizen by default when logging out
      setActiveRole('Citizen');
      localStorage.setItem(LOCAL_ROLE_KEY, 'Citizen');
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const closeAccessDeniedModal = () => {
    setAccessDeniedModal(null);
  };

  // Authorization Guard Function
  const checkAndExecute = (actionTitle: string, requiredRole: RBACRole, callback: () => void): boolean => {
    const roleHierarchy: Record<RBACRole, number> = {
      Citizen: 1,
      FieldUnit: 2,
      CentralCommand: 3
    };

    const currentLevel = roleHierarchy[activeRole];
    const requiredLevel = roleHierarchy[requiredRole];

    if (currentLevel >= requiredLevel) {
      callback();
      return true;
    }

    // Access Denied: Trigger feedback modal
    const reason =
      requiredRole === 'CentralCommand'
        ? 'Restricted to Central Command (DGPC & National Disaster Operations). Dispatching vehicles, aircraft, and official status changes require operational command clearance.'
        : 'Restricted to Civil Protection Field Units and Central Command. Tactical field telemetry and operational missions require brigade verification.';

    setAccessDeniedModal({
      actionTitle,
      requiredRole,
      reason
    });
    return false;
  };

  const isCitizen = activeRole === 'Citizen';
  const isFieldUnit = activeRole === 'FieldUnit';
  const isCentralCommand = activeRole === 'CentralCommand';
  const clearanceLevel: 1 | 2 | 3 = isCentralCommand ? 3 : isFieldUnit ? 2 : 1;
  const permissions = DEFAULT_PERMISSIONS[activeRole];

  const value = useMemo<RBACContextValue>(() => ({
    currentUser,
    userProfile,
    authLoading,
    role: activeRole,
    isCitizen,
    isFieldUnit,
    isCentralCommand,
    clearanceLevel,
    permissions,
    loginWithGoogle,
    loginAsTacticalRole,
    switchRole,
    logout,
    isAuthModalOpen,
    setIsAuthModalOpen,
    accessDeniedModal,
    closeAccessDeniedModal,
    checkAndExecute
  }), [
    currentUser,
    userProfile,
    authLoading,
    activeRole,
    isCitizen,
    isFieldUnit,
    isCentralCommand,
    clearanceLevel,
    permissions,
    isAuthModalOpen,
    accessDeniedModal
  ]);

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
};

export function useRBAC(): RBACContextValue {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
}
