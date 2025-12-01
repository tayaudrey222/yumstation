import React, { useState, useEffect, createContext, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import { CartItem, MenuItem, CategoryDefinition } from './types';
import { Toaster } from 'react-hot-toast';
import { getMenuItems } from './services/menuService';
import { getCategories } from './services/categoryService';

// --- Contexts ---
interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  isCartOpen: boolean;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

interface DataContextType {
  menuItems: MenuItem[];
  categories: CategoryDefinition[];
  refreshData: () => void;
  isLoading: boolean;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

// --- App ---
const App: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [menuData, catData] = await Promise.all([
        getMenuItems(),
        getCategories()
      ]);
      setMenuItems(menuData);
      setCategories(catData);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addToCart = (item: MenuItem) => {
    if (typeof item.price !== 'number') return; 

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          return { ...item, qty: Math.max(0, item.qty + delta) };
        }
        return item;
      }).filter(item => item.qty > 0);
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);
  const toggleCart = () => setIsCartOpen(!isCartOpen);

  return (
    <DataContext.Provider value={{ menuItems, categories, refreshData: fetchData, isLoading }}>
      <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, toggleCart, isCartOpen }}>
        <HashRouter>
          <div className="min-h-screen">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Toaster 
             position="top-center"
             toastOptions={{
               className: 'bg-yum-dark text-white rounded-full px-4 py-2 shadow-lg text-sm font-medium',
               style: { background: '#1F2937', color: '#fff' }
             }}
          />
        </HashRouter>
      </CartContext.Provider>
    </DataContext.Provider>
  );
};

export default App;