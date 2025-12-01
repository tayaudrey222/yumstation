import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Order } from '../types';

const ORDERS_COLLECTION = 'orders';

export const createOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    try {
        await addDoc(collection(db, ORDERS_COLLECTION), {
            ...order,
            status: 'pending',
            createdAt: Timestamp.now()
        });
    } catch (error) {
        console.error("Error creating order:", error);
        throw error;
    }
};

export const getOrders = async (): Promise<Order[]> => {
    try {
        const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Order));
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
};