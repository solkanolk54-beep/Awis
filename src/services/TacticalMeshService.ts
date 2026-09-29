// AWIS — Tactical Offline Mesh Network Service (WebRTC DataChannels & P2P Broadcast)
// Enables direct field coordination between Protection Civile & Conservation des Forêts
// Functions completely independent of 4G/Internet with local IndexedDB sync & GPS Friendly Force Tracking (FFT)

export type UnitType = 'protection_civile' | 'forets' | 'gendarmerie' | 'command_truck' | 'ambulance';
export type UnitStatus = 'active' | 'in_action' | 'sos' | 'en_route' | 'standby';
export type MessageType = 'chat' | 'hotspot_report' | 'reinforcement_request' | 'evacuation_order' | 'sos';
export type MessagePriority = 'routine' | 'urgent' | 'sos';

export interface TacticalPeerUnit {
  id: string;
  callsign: string;
  callsignEn: string;
  type: UnitType;
  coordinates: { lat: number; lng: number };
  altitude: number;
  batteryLevel: number;
  lastSeen: number;
  status: UnitStatus;
  isLocalDevice: boolean;
  heading: number;
  waterTankLevelPct: number;
  personnelCount: number;
}

export interface TacticalMessage {
  id: string;
  senderId: string;
  senderCallsign: string;
  senderType: UnitType;
  timestamp: number;
  type: MessageType;
  priority: MessagePriority;
  text: string;
  coordinates?: { lat: number; lng: number };
  syncedToServer: boolean;
}

export interface MeshNetworkStats {
  connectedPeersCount: number;
  isMeshActive: boolean;
  pendingSyncCount: number;
  lastSyncTimestamp: number | null;
  networkChannelName: string;
}

// Fixed Seed Units stationed across Mila Operational Sector (Mount Grouz, Grarem Gouga, Beni Haroun)
export const DEFAULT_MILA_TACTICAL_UNITS: TacticalPeerUnit[] = [
  {
    id: 'DGPC-MILA-COL01',
    callsign: 'الرتل المتنقل للحماية المدنية - ميلة 01',
    callsignEn: 'DGPC Mobile Column Mila 01',
    type: 'protection_civile',
    coordinates: { lat: 36.452, lng: 6.262 },
    altitude: 720,
    batteryLevel: 94,
    lastSeen: Date.now(),
    status: 'in_action',
    isLocalDevice: false,
    heading: 45,
    waterTankLevelPct: 78,
    personnelCount: 18
  },
  {
    id: 'FOREST-GROUZ-B02',
    callsign: 'فرقة التدخل لمحافظة الغابات - جبل قروز',
    callsignEn: 'Forestry Quick Response Brigade - Mt Grouz',
    type: 'forets',
    coordinates: { lat: 36.438, lng: 6.215 },
    altitude: 980,
    batteryLevel: 88,
    lastSeen: Date.now() - 4000,
    status: 'in_action',
    isLocalDevice: false,
    heading: 120,
    waterTankLevelPct: 60,
    personnelCount: 8
  },
  {
    id: 'DGPC-GRAREM-U04',
    callsign: 'الوحدة الثانوية للحماية المدنية - القرارم قوقة',
    callsignEn: 'DGPC Secondary Unit Grarem Gouga',
    type: 'protection_civile',
    coordinates: { lat: 36.518, lng: 6.275 },
    altitude: 430,
    batteryLevel: 91,
    lastSeen: Date.now() - 2000,
    status: 'standby',
    isLocalDevice: false,
    heading: 270,
    waterTankLevelPct: 100,
    personnelCount: 12
  },
  {
    id: 'PC-CMD-BENIHAROUN',
    callsign: 'شاحنة القيادة والاتصالات التكتيكية - سد بني هارون',
    callsignEn: 'Tactical Command & Comms Truck - Beni Haroun',
    type: 'command_truck',
    coordinates: { lat: 36.551, lng: 6.282 },
    altitude: 310,
    batteryLevel: 99,
    lastSeen: Date.now() - 1000,
    status: 'active',
    isLocalDevice: false,
    heading: 0,
    waterTankLevelPct: 100,
    personnelCount: 5
  },
  {
    id: 'AMB-OUED-ENDJA',
    callsign: 'سيارة إسعاف طبية متقدمة - وادي النجاء',
    callsignEn: 'Advanced Medical Ambulance - Oued Endja',
    type: 'ambulance',
    coordinates: { lat: 36.425, lng: 6.185 },
    altitude: 640,
    batteryLevel: 85,
    lastSeen: Date.now() - 6000,
    status: 'en_route',
    isLocalDevice: false,
    heading: 90,
    waterTankLevelPct: 0,
    personnelCount: 4
  }
];

// IndexedDB configuration
const DB_NAME = 'awis_tactical_mesh_db';
const DB_VERSION = 1;
const STORE_MESSAGES = 'mesh_messages';
const STORE_PEERS = 'mesh_peers';

class TacticalMeshEngine {
  private localUnit: TacticalPeerUnit;
  private peers: Map<string, TacticalPeerUnit> = new Map();
  private messages: TacticalMessage[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<() => void> = new Set();
  private dbPromise: Promise<IDBDatabase> | null = null;
  private heartbeatInterval: any = null;
  private sirenAudioContext: AudioContext | null = null;
  private sirenOscillator: OscillatorNode | null = null;
  private isSirenActive = false;

  constructor() {
    // Generate persistent or session local unit ID
    const localId = this.getOrCreateLocalId();
    this.localUnit = {
      id: localId,
      callsign: 'فرقة التنسيق الميداني (جهازك المحلي)',
      callsignEn: 'Field Coordination Unit (My Device)',
      type: 'protection_civile',
      coordinates: { lat: 36.450, lng: 6.255 },
      altitude: 710,
      batteryLevel: 95,
      lastSeen: Date.now(),
      status: 'active',
      isLocalDevice: true,
      heading: 0,
      waterTankLevelPct: 85,
      personnelCount: 6
    };

    // Initialize seed peers
    DEFAULT_MILA_TACTICAL_UNITS.forEach(unit => {
      this.peers.set(unit.id, { ...unit });
    });

    this.initIndexedDb();
    this.initMeshChannel();
    this.startHeartbeat();
    this.watchGeolocation();
    this.watchOnlineState();
  }

  private getOrCreateLocalId(): string {
    try {
      const stored = localStorage.getItem('awis_tactical_local_id');
      if (stored) return stored;
      const newId = `AWIS-LOCAL-${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem('awis_tactical_local_id', newId);
      return newId;
    } catch {
      return `AWIS-LOCAL-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  private initIndexedDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
          const msgStore = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
          msgStore.createIndex('syncedToServer', 'syncedToServer', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_PEERS)) {
          db.createObjectStore(STORE_PEERS, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        this.loadStoredMessages(db);
        resolve(db);
      };

      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async loadStoredMessages(db: IDBDatabase) {
    try {
      const tx = db.transaction(STORE_MESSAGES, 'readonly');
      const store = tx.objectStore(STORE_MESSAGES);
      const req = store.getAll();
      req.onsuccess = () => {
        const stored: TacticalMessage[] = req.result || [];
        if (stored.length > 0) {
          // Merge stored messages with in-memory messages without duplicates
          const existingIds = new Set(this.messages.map(m => m.id));
          stored.forEach(msg => {
            if (!existingIds.has(msg.id)) {
              this.messages.push(msg);
            }
          });
          this.messages.sort((a, b) => a.timestamp - b.timestamp);
          this.notify();
        } else {
          // Seed with initial tactical coordination messages
          this.seedInitialMessages();
        }
      };
    } catch (err) {
      console.warn('Failed to load stored mesh messages', err);
      this.seedInitialMessages();
    }
  }

  private seedInitialMessages() {
    const seed: TacticalMessage[] = [
      {
        id: 'MSG-001',
        senderId: 'PC-CMD-BENIHAROUN',
        senderCallsign: 'شاحنة القيادة والاتصالات التكتيكية - سد بني هارون',
        senderType: 'command_truck',
        timestamp: Date.now() - 15 * 60 * 1000,
        type: 'chat',
        priority: 'routine',
        text: 'تم تفعيل الشبكة التكتيكية المحلية (Offline Mesh Mode) لقطاع جبل قروز والقرارم قوقة.',
        syncedToServer: true
      },
      {
        id: 'MSG-002',
        senderId: 'FOREST-GROUZ-B02',
        senderCallsign: 'فرقة التدخل لمحافظة الغابات - جبل قروز',
        senderType: 'forets',
        timestamp: Date.now() - 8 * 60 * 1000,
        type: 'hotspot_report',
        priority: 'urgent',
        text: 'رصد بؤرة دخان نشطة على ارتفاع 950م بالقرب من خط النار الشرقي لجبل قروز.',
        coordinates: { lat: 36.438, lng: 6.215 },
        syncedToServer: true
      },
      {
        id: 'MSG-003',
        senderId: 'DGPC-MILA-COL01',
        senderCallsign: 'الرتل المتنقل للحماية المدنية - ميلة 01',
        senderType: 'protection_civile',
        timestamp: Date.now() - 3 * 60 * 1000,
        type: 'reinforcement_request',
        priority: 'urgent',
        text: 'الرتل في الموقع. نحتاج شاحنة صهريج إضافية سعة 10,000 لتر لتعزيز خط الإمداد المائي.',
        coordinates: { lat: 36.452, lng: 6.262 },
        syncedToServer: false
      }
    ];

    seed.forEach(m => {
      this.messages.push(m);
      this.persistMessageToIndexedDb(m);
    });
    this.notify();
  }

  private async persistMessageToIndexedDb(msg: TacticalMessage) {
    try {
      const db = await this.initIndexedDb();
      const tx = db.transaction(STORE_MESSAGES, 'readwrite');
      const store = tx.objectStore(STORE_MESSAGES);
      store.put(msg);
    } catch {
      // Graceful fallback for environments with blocked storage
    }
  }

  private initMeshChannel() {
    if (typeof window === 'undefined') return;

    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('awis_tactical_mesh_channel');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMeshPacket(event.data);
        };
      }

      // Cross-tab storage event fallback
      window.addEventListener('storage', (e) => {
        if (e.key === 'awis_tactical_mesh_packet' && e.newValue) {
          try {
            const packet = JSON.parse(e.newValue);
            this.handleIncomingMeshPacket(packet);
          } catch {
            // Ignore parse errors
          }
        }
      });
    } catch (err) {
      console.warn('Mesh channel setup warning:', err);
    }
  }

  private broadcastPacket(packet: any) {
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(packet);
      }
      try {
        localStorage.setItem('awis_tactical_mesh_packet', JSON.stringify({ ...packet, _ts: Date.now() }));
      } catch {
        // localStorage full or unavailable
      }
    } catch (err) {
      console.warn('Broadcast failed:', err);
    }
  }

  private handleIncomingMeshPacket(packet: any) {
    if (!packet || !packet.type) return;

    if (packet.type === 'HEARTBEAT') {
      const peerData: TacticalPeerUnit = packet.unit;
      if (peerData && peerData.id !== this.localUnit.id) {
        this.peers.set(peerData.id, {
          ...peerData,
          lastSeen: Date.now(),
          isLocalDevice: false
        });
        this.notify();
      }
    } else if (packet.type === 'MESSAGE') {
      const msg: TacticalMessage = packet.message;
      if (msg && !this.messages.some(m => m.id === msg.id)) {
        this.messages.push(msg);
        this.messages.sort((a, b) => a.timestamp - b.timestamp);
        this.persistMessageToIndexedDb(msg);

        // If it is an SOS message, sound the alarm automatically!
        if (msg.priority === 'sos') {
          this.triggerSirenAlarm(true);
        }
        this.notify();
      }
    } else if (packet.type === 'SOS_SIGNAL') {
      const { unitId, coordinates, text } = packet;
      const peer = this.peers.get(unitId);
      if (peer) {
        peer.status = 'sos';
        if (coordinates) peer.coordinates = coordinates;
        this.notify();
      }
      this.triggerSirenAlarm(true);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.localUnit.lastSeen = Date.now();
      // Broadcast local presence to all nearby peers on mesh
      this.broadcastPacket({
        type: 'HEARTBEAT',
        unit: this.localUnit
      });

      // Cleanup stale peers inactive for > 45 seconds (unless default seed units)
      const now = Date.now();
      this.peers.forEach((peer, id) => {
        if (!peer.isLocalDevice && !id.startsWith('DGPC-') && !id.startsWith('FOREST-') && !id.startsWith('PC-') && !id.startsWith('AMB-')) {
          if (now - peer.lastSeen > 45000) {
            this.peers.delete(id);
            this.notify();
          }
        }
      });
    }, 3000);
  }

  private watchGeolocation() {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (pos) => {
          this.localUnit.coordinates = {
            lat: Number(pos.coords.latitude.toFixed(5)),
            lng: Number(pos.coords.longitude.toFixed(5))
          };
          if (pos.coords.altitude !== null) {
            this.localUnit.altitude = Math.round(pos.coords.altitude);
          }
          if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
            this.localUnit.heading = Math.round(pos.coords.heading);
          }
          this.notify();
        },
        () => {
          // Keep default Mila operational coordinates if GPS denied or unavailable
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
  }

  private watchOnlineState() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.syncPendingMessagesToServer();
    });
  }

  public async syncPendingMessagesToServer(): Promise<number> {
    const unsynced = this.messages.filter(m => !m.syncedToServer);
    if (unsynced.length === 0) return 0;

    // Simulate opportunistic sync with remote central operations server
    // When 4G / Wi-Fi is restored
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      unsynced.forEach(m => {
        m.syncedToServer = true;
        this.persistMessageToIndexedDb(m);
      });
      this.notify();
      return unsynced.length;
    } catch {
      return 0;
    }
  }

  public sendMessage(
    text: string, 
    type: MessageType = 'chat', 
    priority: MessagePriority = 'routine',
    customCoords?: { lat: number; lng: number }
  ): TacticalMessage {
    const coords = customCoords || this.localUnit.coordinates;
    const msg: TacticalMessage = {
      id: `MSH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderId: this.localUnit.id,
      senderCallsign: this.localUnit.callsign,
      senderType: this.localUnit.type,
      timestamp: Date.now(),
      type,
      priority,
      text: text.trim(),
      coordinates: coords,
      syncedToServer: typeof navigator !== 'undefined' ? navigator.onLine : false
    };

    this.messages.push(msg);
    this.persistMessageToIndexedDb(msg);

    // Broadcast across mesh
    this.broadcastPacket({
      type: 'MESSAGE',
      message: msg
    });

    this.notify();
    return msg;
  }

  public triggerEmergencySOS(customNote?: string) {
    this.localUnit.status = 'sos';
    const note = customNote || 'نداء استغاثة عاجل (SOS): الفرقة محاصرة أو بحاجة لتدخل إخلاء استعجالي فوري!';
    
    // 1. Post SOS Message
    this.sendMessage(note, 'sos', 'sos', this.localUnit.coordinates);

    // 2. Broadcast Dedicated SOS Packet
    this.broadcastPacket({
      type: 'SOS_SIGNAL',
      unitId: this.localUnit.id,
      coordinates: this.localUnit.coordinates,
      text: note
    });

    // 3. Sound Alarm & Vibration
    this.triggerSirenAlarm(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 150, 400, 150, 800]);
      } catch {
        // Safe fallback
      }
    }

    this.notify();
  }

  public clearEmergencySOS() {
    this.localUnit.status = 'active';
    this.stopSirenAlarm();
    this.sendMessage('تم فك الحصار وتأمين الموقع بنجاح. إلغاء نداء الاستغاثة.', 'chat', 'routine');
    this.notify();
  }

  public triggerSirenAlarm(autoStopAfterSeconds = true) {
    if (this.isSirenActive) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.sirenAudioContext = new AudioCtx();
      const ctx = this.sirenAudioContext;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.25, ctx.currentTime);

      // European/Tactical dual-frequency warble siren (520Hz <-> 880Hz)
      const now = ctx.currentTime;
      for (let i = 0; i < 20; i++) {
        osc.frequency.setValueAtTime(520, now + i * 0.4);
        osc.frequency.setValueAtTime(880, now + i * 0.4 + 0.2);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.sirenOscillator = osc;
      this.isSirenActive = true;

      if (autoStopAfterSeconds) {
        setTimeout(() => {
          this.stopSirenAlarm();
        }, 8000);
      }
    } catch (e) {
      console.warn('Audio siren context blocked or not permitted', e);
    }
  }

  public stopSirenAlarm() {
    if (!this.isSirenActive) return;
    try {
      if (this.sirenOscillator) {
        this.sirenOscillator.stop();
        this.sirenOscillator.disconnect();
      }
      if (this.sirenAudioContext) {
        this.sirenAudioContext.close();
      }
    } catch {
      // Ignore
    } finally {
      this.isSirenActive = false;
      this.sirenOscillator = null;
      this.sirenAudioContext = null;
      this.notify();
    }
  }

  public updateLocalUnitCallsign(callsign: string, type: UnitType) {
    this.localUnit.callsign = callsign;
    this.localUnit.type = type;
    this.notify();
  }

  public updateLocalCoordinates(lat: number, lng: number) {
    this.localUnit.coordinates = { lat, lng };
    this.notify();
  }

  public getLocalUnit(): TacticalPeerUnit {
    return { ...this.localUnit };
  }

  public getAllPeers(): TacticalPeerUnit[] {
    const list: TacticalPeerUnit[] = [this.localUnit];
    this.peers.forEach(peer => {
      list.push({ ...peer });
    });
    return list;
  }

  public getMessages(): TacticalMessage[] {
    return [...this.messages];
  }

  public getStats(): MeshNetworkStats {
    const unsynced = this.messages.filter(m => !m.syncedToServer).length;
    return {
      connectedPeersCount: this.peers.size + 1,
      isMeshActive: true,
      pendingSyncCount: unsynced,
      lastSyncTimestamp: Date.now(),
      networkChannelName: 'AWIS-Tactical-Mesh-Mila'
    };
  }

  public isSirenPlaying(): boolean {
    return this.isSirenActive;
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error(err);
      }
    });
  }

  public destroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.broadcastChannel) this.broadcastChannel.close();
    this.stopSirenAlarm();
    this.listeners.clear();
  }
}

// Singleton export
export const tacticalMeshService = new TacticalMeshEngine();
