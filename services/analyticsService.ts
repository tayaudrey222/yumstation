import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { AnalyticsEvent, DashboardStats } from '../types';

const EVENTS_COLLECTION = 'analytics_events';

export const logEvent = async (type: AnalyticsEvent['type'], data: any = {}) => {
  try {
    await addDoc(collection(db, EVENTS_COLLECTION), {
      type,
      data,
      timestamp: Timestamp.now()
    });
  } catch (e) {
    console.error("Failed to log analytics", e);
  }
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Note: In a production app with thousands of records, we would use Firebase Aggregation Queries 
    // or Cloud Functions to maintain counters. For this size, client-side counting is okay.
    
    // 1. Get Menu Item Count (We usually get this from menuService, but let's do a quick count)
    const menuSnapshot = await getDocs(collection(db, 'menuItems'));
    const totalItems = menuSnapshot.size;

    // 2. Get Categories Count
    const catSnapshot = await getDocs(collection(db, 'categories'));
    const totalCategories = catSnapshot.size;

    // 3. Get Orders (Checkout clicks in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const eventsQuery = query(
      collection(db, EVENTS_COLLECTION),
      where('type', '==', 'checkout_whatsapp'),
      where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo))
    );
    
    const eventsSnapshot = await getDocs(eventsQuery);
    const totalOrders = eventsSnapshot.size;
    
    let revenuePotential = 0;
    eventsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.data && data.data.total) {
        revenuePotential += data.data.total;
      }
    });

    return {
      totalItems,
      totalCategories,
      totalOrders,
      revenuePotential
    };
  } catch (e) {
    console.error("Error fetching stats", e);
    return { totalItems: 0, totalCategories: 0, totalOrders: 0, revenuePotential: 0 };
  }
};

export const getRecentActivity = async () => {
    try {
        const q = query(
            collection(db, EVENTS_COLLECTION),
            where('type', '==', 'checkout_whatsapp'),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        return [];
    }
}