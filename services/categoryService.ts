import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { CategoryDefinition } from '../types';
import { CATEGORIES as INITIAL_CATEGORIES } from '../constants';

const CATEGORY_COLLECTION = 'categories';

export const getCategories = async (): Promise<CategoryDefinition[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, CATEGORY_COLLECTION));
    
    // Seed if empty
    if (querySnapshot.empty) {
        console.log("Categories empty. Seeding...");
        const batch = writeBatch(db);
        INITIAL_CATEGORIES.forEach((cat, index) => {
            const docRef = doc(collection(db, CATEGORY_COLLECTION), cat.id);
            batch.set(docRef, { ...cat, order: index });
        });
        await batch.commit();
        return INITIAL_CATEGORIES;
    }

    const cats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryDefinition));
    // Sort by order
    return cats.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return INITIAL_CATEGORIES;
  }
};

export const saveCategory = async (category: CategoryDefinition): Promise<void> => {
  const docRef = doc(collection(db, CATEGORY_COLLECTION), category.id);
  await setDoc(docRef, category);
};

export const deleteCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, CATEGORY_COLLECTION, id));
};