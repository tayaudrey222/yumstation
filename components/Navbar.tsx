import React, { useContext } from 'react';
import { ShoppingCart, ChefHat } from 'lucide-react';
import { CartContext, DataContext } from '../App';

const Navbar: React.FC = () => {
  const cartContext = useContext(CartContext);
  const dataContext = useContext(DataContext);
  
  const cartCount = cartContext?.cart.reduce((acc, item) => acc + item.qty, 0) || 0;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <nav className="bg-yum-orange text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-12 h-12 rounded-full border-2 border-yum-yellow bg-white flex items-center justify-center text-yum-orange shadow-sm overflow-hidden">
                <ChefHat size={28} />
             </div>
            <h1 className="font-brand text-2xl tracking-wide text-white drop-shadow-md">Yum Station</h1>
          </div>
          <button 
            onClick={cartContext?.toggleCart}
            className="bg-white text-yum-red px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-md hover:bg-gray-100 transition relative"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-yum-dark text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        
        {/* Scrollable Quick Links */}
        <div className="bg-yum-dark text-white py-2 overflow-x-auto no-scrollbar shadow-inner">
            <div className="container mx-auto px-4 flex gap-6 whitespace-nowrap text-sm font-medium">
                {dataContext?.categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => scrollToSection(cat.id)}
                    className="hover:text-yum-yellow transition uppercase text-xs tracking-wider"
                  >
                    {cat.title}
                  </button>
                ))}
            </div>
        </div>
      </nav>

      {/* Ticker */}
      <div className="bg-yum-dark text-white text-sm py-2 overflow-hidden border-b border-gray-700 relative z-40">
        <div className="ticker-wrap">
            <div className="ticker-content font-medium tracking-wide">
                🎉 UPCOMING EVENT: Yum Station Food Festival coming this Saturday! • 🍔 New Burger recipes dropping soon! • 🚚 Free delivery on orders over N15,000! • Crave and Enjoy!
            </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;