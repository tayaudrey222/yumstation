import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { InventoryItem } from '../types';

const INVENTORY_COLLECTION = 'inventory';

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const snapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }
};

export const getInventoryByMenuItem = async (menuItemId: string): Promise<InventoryItem | null> => {
  try {
    const q = query(collection(db, INVENTORY_COLLECTION), where('menuItemId', '==', menuItemId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as InventoryItem;
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return null;
  }
};

export const saveInventoryItem = async (item: InventoryItem): Promise<void> => {
  try {
    const collectionRef = collection(db, INVENTORY_COLLECTION);
    const docRef = item.id ? doc(collectionRef, item.id) : doc(collectionRef);
    const itemToSave = { ...item, id: docRef.id };
    await setDoc(docRef, itemToSave);
  } catch (error) {
    console.error('Error saving inventory item:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, INVENTORY_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
};

export const deductInventory = async (menuItemIdOrInventoryId: string, quantity: number): Promise<void> => {
  try {
    // Try to find by menuItemId first (for order deductions)
    let q = query(collection(db, INVENTORY_COLLECTION), where('menuItemId', '==', menuItemIdOrInventoryId));
    let snapshot = await getDocs(q);
    
    // If not found, try to find by inventory item ID directly
    if (snapshot.empty) {
      const docRef = doc(db, INVENTORY_COLLECTION, menuItemIdOrInventoryId);
      const docSnap = await getDocs(query(collection(db, INVENTORY_COLLECTION), where('menuItemId', '==', menuItemIdOrInventoryId)));
      if (!docSnap.empty) {
        snapshot = docSnap;
      }
    }
    
    if (!snapshot.empty) {
      const doc_ref = snapshot.docs[0].ref;
      const currentQty = snapshot.docs[0].data().quantity || 0;
      await updateDoc(doc_ref, { quantity: Math.max(0, currentQty - quantity) });
    }
  } catch (error) {
    console.error('Error deducting inventory:', error);
    throw error;
  }
};

export const restockInventoryById = async (inventoryId: string, quantityToAdd: number): Promise<void> => {
  try {
    const doc_ref = doc(db, INVENTORY_COLLECTION, inventoryId);
    const docSnap = await getDocs(query(collection(db, INVENTORY_COLLECTION), where('id', '==', inventoryId)));
    if (!docSnap.empty) {
      const currentQty = docSnap.docs[0].data().quantity || 0;
      await updateDoc(docSnap.docs[0].ref, { quantity: currentQty + quantityToAdd, lastRestocked: Timestamp.now() });
    }
  } catch (error) {
    console.error('Error restocking inventory:', error);
    throw error;
  }
};

export const restockInventory = async (menuItemId: string, quantityToAdd: number): Promise<void> => {
  try {
    const q = query(collection(db, INVENTORY_COLLECTION), where('menuItemId', '==', menuItemId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc_ref = snapshot.docs[0].ref;
      const currentQty = snapshot.docs[0].data().quantity || 0;
      await updateDoc(doc_ref, { quantity: currentQty + quantityToAdd, lastRestocked: Timestamp.now() });
    }
  } catch (error) {
    console.error('Error restocking inventory:', error);
    throw error;
  }
};

export const getLowStockItems = async (): Promise<InventoryItem[]> => {
  try {
    const items = await getInventoryItems();
    return items.filter(item => item.quantity <= item.reorderThreshold);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return [];
  }
};
