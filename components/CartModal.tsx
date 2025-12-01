import React, { useContext, useState } from 'react';
import { X, Minus, Plus, ShoppingBasket, ArrowRight, Bike, Footprints, User as UserIcon } from 'lucide-react';
import { CartContext } from '../App';
import { createOrder } from '../services/orderService';
import toast from 'react-hot-toast';

const CartModal: React.FC = () => {
  const context = useContext(CartContext);
  const [view, setView] = useState<'cart' | 'checkout'>('cart');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!context || !context.isCartOpen) return null;

  const { cart, updateQty, toggleCart } = context;
  const total = cart.reduce((sum, item) => {
    const price = typeof item.price === 'number' ? item.price : 0;
    return sum + (price * item.qty);
  }, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setView('checkout');
  };

  const handleBackToCart = () => {
    setView('cart');
  };

  const finalizeOrder = async () => {
    if (!name.trim()) {
        toast.error("Please enter your name.");
        return;
    }
    if (!phone.trim()) {
        toast.error("Please enter your phone number.");
        return;
    }
    if (orderType === 'delivery' && !address.trim()) {
        toast.error("Please enter your delivery address.");
        return;
    }

    setIsSubmitting(true);

    try {
        // 1. Save to Database
        await createOrder({
            customerName: name,
            phone,
            address: orderType === 'delivery' ? address : undefined,
            orderType,
            items: cart,
            totalAmount: total
        });

        // 2. Construct WhatsApp Message
        const orderId = '#' + Math.random().toString(36).substr(2, 6).toUpperCase();
        let message = `Hello Yum Station! I would like to place an order (${orderId}):\n\n`;
        
        cart.forEach(item => {
            const p = typeof item.price === 'number' ? item.price : 0;
            const subtotal = p * item.qty;
            message += `▪ ${item.qty}x ${item.name} - N${subtotal.toLocaleString()}\n`;
        });

        message += `\n*TOTAL: N${total.toLocaleString()}*`;
        message += `\n\n----------------`;
        message += `\n*Customer:* ${name}`;
        message += `\n*Order Type:* ${orderType.toUpperCase()}`;
        message += `\n*Phone:* ${phone}`;
        
        if (orderType === 'delivery') {
            message += `\n*Address:* ${address}`;
        }

        // 3. Open WhatsApp
        const url = `https://wa.me/2348061781845?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        // 4. Close Modal
        toggleCart();
        toast.success("Order processed! Check WhatsApp.");
        
    } catch (error) {
        toast.error("Something went wrong. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center backdrop-blur-sm transition-opacity animate-fade-in">
      <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col h-[650px] sm:h-[650px]">
        
        {/* Header */}
        <div className="bg-yum-orange p-4 flex justify-between items-center text-white shrink-0">
            <h3 className="font-brand text-2xl">{view === 'cart' ? 'Your Order' : 'Checkout'}</h3>
            <button onClick={toggleCart} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition">
                <X size={18} />
            </button>
        </div>

        {/* Views */}
        {view === 'cart' ? (
             <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 overflow-y-auto flex-1 space-y-3">
                    {cart.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <ShoppingBasket size={48} className="mx-auto mb-3 opacity-30" />
                            <p>Your cart is empty.</p>
                            <button onClick={toggleCart} className="mt-4 text-yum-orange font-bold text-sm hover:underline">Start Ordering</button>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex-1 pr-2">
                                    <h4 className="font-bold text-yum-dark text-sm">{item.name}</h4>
                                    <p className="text-xs text-gray-500">N{item.price.toLocaleString()} each</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-white border border-gray-200 rounded text-gray-600 flex items-center justify-center hover:bg-gray-100"><Minus size={14}/></button>
                                    <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-yum-orange text-white rounded flex items-center justify-center hover:bg-orange-600"><Plus size={14}/></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-gray-600 font-medium">Total Amount</span>
                        <span className="text-2xl font-bold text-yum-dark">N{total.toLocaleString()}</span>
                    </div>
                    <button 
                        onClick={handleCheckout} 
                        disabled={cart.length === 0}
                        className="w-full bg-yum-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg transition flex justify-center items-center gap-2"
                    >
                        Proceed to Checkout <ArrowRight size={18} />
                    </button>
                </div>
             </div>
        ) : (
            <div className="flex flex-col flex-1 overflow-hidden bg-gray-50">
                <div className="p-5 flex-1 overflow-y-auto space-y-5">
                    {/* Order Type */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Method</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setOrderType('delivery')}
                                className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition shadow-sm ${orderType === 'delivery' ? 'bg-yum-orange text-white border-yum-orange' : 'bg-white text-gray-600 border-gray-200'}`}
                            >
                                <Bike className="mb-1" size={24} />
                                <span className="text-sm font-bold">Delivery</span>
                            </button>
                            <button 
                                onClick={() => setOrderType('pickup')}
                                className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition shadow-sm ${orderType === 'pickup' ? 'bg-yum-orange text-white border-yum-orange' : 'bg-white text-gray-600 border-gray-200'}`}
                            >
                                <Footprints className="mb-1" size={24} />
                                <span className="text-sm font-bold">Pickup</span>
                            </button>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div>
                         <label className="block text-sm font-bold text-gray-700 mb-2">Your Name <span className="text-red-500">*</span></label>
                         <div className="relative">
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe" 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yum-orange focus:border-transparent bg-white shadow-sm"
                            />
                            <UserIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
                         </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                        <input 
                            type="tel" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="080..." 
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yum-orange focus:border-transparent bg-white shadow-sm"
                        />
                    </div>

                    {/* Delivery Info */}
                    {orderType === 'delivery' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Address <span className="text-red-500">*</span></label>
                            <textarea 
                                rows={3} 
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Street name, House number, Landmark..." 
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yum-orange focus:border-transparent bg-white shadow-sm resize-none"
                            ></textarea>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 bg-white border-t border-gray-100 shrink-0 flex flex-col gap-3">
                    <button 
                        onClick={finalizeOrder} 
                        disabled={isSubmitting}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl shadow-lg transition flex justify-center items-center gap-2"
                    >
                         {isSubmitting ? 'Processing...' : 'Send Order on WhatsApp'}
                    </button>
                    <button onClick={handleBackToCart} className="w-full text-gray-500 font-medium text-sm hover:text-gray-800 transition">
                        Back to Cart
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;