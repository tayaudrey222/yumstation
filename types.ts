export interface MenuItem {
  id: string;
  category: string;
  name: string;
  price: number | 'Ask for price';
  description?: string;
  isAvailable: boolean;
  isComingSoon?: boolean;
}

export interface CartItem extends MenuItem {
  qty: number;
}

export type OrderType = 'delivery' | 'pickup';

export interface Order {
    id: string;
    customerName: string;
    phone: string;
    address?: string; // Optional if pickup
    orderType: OrderType;
    items: CartItem[];
    totalAmount: number;
    createdAt: any; // Firestore Timestamp
    status: 'pending' | 'completed' | 'cancelled';
}

export interface CategoryDefinition {
  id: string;
  title: string;
  icon: string; 
  colorTheme: 'orange' | 'yellow' | 'red' | 'green' | 'blue' | 'purple' | 'stone' | 'brown';
  order?: number;
}

export interface AnalyticsEvent {
  id?: string;
  type: 'checkout_whatsapp' | 'view_category' | 'add_to_cart';
  data?: any;
  timestamp: any; // Firestore Timestamp
}

export interface DashboardStats {
  totalItems: number;
  totalCategories: number;
  totalOrders: number;
  revenuePotential: number; // Sum of cart totals from checkout events
}