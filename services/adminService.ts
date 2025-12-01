import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { AdminUser, AdminRole } from '../types';

const ADMINS_COLLECTION = 'admins';

/**
 * Get admin user by email
 */
export const getAdminByEmail = async (email: string): Promise<AdminUser | null> => {
  try {
    const q = query(collection(db, ADMINS_COLLECTION), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as AdminUser;
  } catch (error) {
    console.error('Error fetching admin:', error);
    return null;
  }
};

/**
 * Create a new admin user (called on first registration)
 * First registered user becomes super_admin; subsequent users are admins
 */
export const createAdmin = async (uid: string, email: string): Promise<AdminUser> => {
  try {
    // Check if any admins exist
    const allAdmins = await getDocs(collection(db, ADMINS_COLLECTION));
    const role: AdminRole = allAdmins.empty ? 'super_admin' : 'admin';
    
    const adminUser: AdminUser = {
      id: uid,
      email,
      role,
      createdAt: new Date()
    };
    
    const ref = doc(db, ADMINS_COLLECTION, uid);
    await setDoc(ref, adminUser);
    return adminUser;
  } catch (error) {
    console.error('Error creating admin:', error);
    throw error;
  }
};

/**
 * Update admin role (super_admin only)
 */
export const updateAdminRole = async (uid: string, role: AdminRole): Promise<void> => {
  try {
    const ref = doc(db, ADMINS_COLLECTION, uid);
    await setDoc(ref, { role }, { merge: true });
  } catch (error) {
    console.error('Error updating admin role:', error);
    throw error;
  }
};

/**
 * Get all admin users
 */
export const getAllAdmins = async (): Promise<AdminUser[]> => {
  try {
    const snapshot = await getDocs(collection(db, ADMINS_COLLECTION));
    return snapshot.docs.map(d => d.data() as AdminUser);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
};
