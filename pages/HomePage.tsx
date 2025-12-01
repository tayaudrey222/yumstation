import React, { useContext } from 'react';
import Navbar from '../components/Navbar';
import MenuSection from '../components/MenuSection';
import CartModal from '../components/CartModal';
import { DataContext, CartContext } from '../App';
import { ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  const dataContext = useContext(DataContext);
  const cartContext = useContext(CartContext);
  
  // Group items by category
  const getItemsForCategory = (catId: string) => {
    return dataContext?.menuItems.filter(item => item.category === catId) || [];
  };

  const cartCount = cartContext?.cart.reduce((acc, item) => acc + item.qty, 0) || 0;
  const cartTotal = cartContext?.cart.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price * item.qty : 0), 0) || 0;

  return (
    <>
      <Navbar />
      
      {/* Hero */}
      <header className="text-center py-8 px-4">
        <h2 className="text-4xl font-brand text-yum-orange mb-2 drop-shadow-sm">Crave and Enjoy</h2> 
        <p className="text-gray-700 max-w-md mx-auto font-medium text-sm">Tap "Add" to build your order, then send it to us on WhatsApp!</p>
      </header>

      <main className="container mx-auto px-4 max-w-3xl pb-32">
        {dataContext?.isLoading ? (
            <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yum-orange mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading Menu...</p>
            </div>
        ) : (
            dataContext?.categories.map(category => (
                <MenuSection 
                    key={category.id} 
                    category={category} 
                    items={getItemsForCategory(category.id)} 
                />
            ))
        )}
      </main>

      {/* Footer */}
      <footer className="bg-yum-dark text-white mt-12 pt-12 pb-24 px-4 border-t-4 border-yum-orange">
        <div className="container mx-auto flex flex-col items-center text-center space-y-6">
            <div className="flex flex-col items-center gap-3">
                <div className="h-20 w-20 rounded-full border-2 border-yum-yellow bg-white flex items-center justify-center text-yum-dark">
                    <span className="font-brand text-3xl">Y</span>
                </div>
                <h2 className="font-brand text-4xl text-yum-yellow">Yum Station</h2>
                <p className="text-xl font-medium text-white tracking-wide italic">Crave and Enjoy</p>
            </div>
            <div className="text-gray-500 text-xs mt-8 border-t border-gray-800 w-full pt-4 flex flex-col items-center gap-3">
                <p>&copy; 2025 Yum Station. All rights reserved.</p>
                <p>
                  Built by <a href="https://tacdigitals.com" target="_blank" rel="noopener noreferrer" className="text-yum-orange hover:text-white transition font-medium">TacDigitals</a>
                </p>
                <Link to="/admin" className="text-gray-700 hover:text-gray-500 transition text-[10px] uppercase tracking-widest mt-4">
                  Admin Login
                </Link>
            </div>
        </div>
      </footer>

      {/* Sticky Cart Bar */}
      <div 
        className={`fixed bottom-0 left-0 w-full bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-100 p-4 z-50 transition-transform duration-300 flex justify-between items-center ${cartCount > 0 ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium">{cartCount} items selected</span>
            <span className="text-xl font-bold text-yum-red font-brand">N{cartTotal.toLocaleString()}</span>
        </div>
        <button 
            onClick={cartContext?.toggleCart}
            className="bg-yum-orange text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-orange-600 transition flex items-center gap-2"
        >
            View Cart <ChevronUp size={18} />
        </button>
      </div>

      <CartModal />
    </>
  );
};

export default HomePage;