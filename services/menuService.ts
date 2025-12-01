import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { MenuItem } from '../types';
import { INITIAL_MENU_ITEMS } from '../constants';

const MENU_COLLECTION = 'menuItems';

export const getMenuItems = async (): Promise<MenuItem[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, MENU_COLLECTION));
    
    // Seed database on first run if empty
    if (querySnapshot.empty) {
        console.log("Database empty. Seeding initial data...");
        const batch = writeBatch(db);
        INITIAL_MENU_ITEMS.forEach(item => {
            const docRef = doc(collection(db, MENU_COLLECTION), item.id);
            batch.set(docRef, item);
        });
        await batch.commit();
        return INITIAL_MENU_ITEMS;
    }

    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
  } catch (error) {
    console.error("Error getting menu items:", error);
    // Fallback to local constants if DB fails (e.g. offline or permission denied)
    return INITIAL_MENU_ITEMS;
  }
};

export const saveMenuItem = async (item: MenuItem): Promise<void> => {
  // If id is missing or empty, create a new doc ref to get an ID
  const collectionRef = collection(db, MENU_COLLECTION);
  const docRef = item.id ? doc(collectionRef, item.id) : doc(collectionRef);
  
  const itemToSave = { ...item, id: docRef.id };
  await setDoc(docRef, itemToSave);
};

export const deleteMenuItem = async (id: string): Promise<void> => {
   await deleteDoc(doc(db, MENU_COLLECTION, id));
};