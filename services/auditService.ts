import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

const AUDIT_COLLECTION = 'auditLogs';

export type AuditEventType = 'admin_created' | 'role_changed' | 'order_confirmed' | 'other';

export interface AuditEntry {
  id?: string;
  type: AuditEventType;
  actorId?: string;
  actorEmail?: string;
  targetId?: string;
  targetEmail?: string;
  details?: any;
  timestamp?: any; // Firestore Timestamp
}

export const logAudit = async (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
  try {
    const col = collection(db, AUDIT_COLLECTION);
    await addDoc(col, { ...entry, timestamp: new Date() });
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
};

export const getRecentAuditLogs = async (count = 50): Promise<AuditEntry[]> => {
  try {
    const q = query(collection(db, AUDIT_COLLECTION), orderBy('timestamp', 'desc'), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as AuditEntry));
  } catch (err) {
    console.error('Failed to fetch audit logs', err);
    return [];
  }
};
