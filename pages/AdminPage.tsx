import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../App';
import { MenuItem, CategoryDefinition, DashboardStats, Order } from '../types';
import { saveMenuItem, deleteMenuItem } from '../services/menuService';
import { saveCategory, deleteCategory } from '../services/categoryService';
import { getOrders } from '../services/orderService';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { 
    Trash2, Edit2, Plus, LogOut, LayoutDashboard, 
    UtensilsCrossed, Layers, BarChart3, Settings, Save,
    TrendingUp, ShoppingBag, DollarSign, X, Receipt, ArrowRight
} from 'lucide-react';

const availableIcons = ['bowl', 'sprout', 'utensils', 'carrot', 'drumstick', 'cookie', 'leaf', 'sandwich', 'flame', 'glass', 'star'];
const availableColors = ['orange', 'yellow', 'red', 'green', 'blue', 'purple', 'stone', 'brown'];

const AdminPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu' | 'categories'>('dashboard');
  
  const dataContext = useContext(DataContext);
  
  // Dashboard & Order Stats
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
      totalItems: 0, 
      totalCategories: 0, 
      totalOrders: 0, 
      revenuePotential: 0
  });

  // Editing States
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<CategoryDefinition> | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
        if (currentUser) {
            fetchOrders();
        }
    });
    return () => unsubscribe();
  }, []);

  const fetchOrders = async () => {
      const allOrders = await getOrders();
      setOrders(allOrders);
      
      // Calculate Stats
      const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      setStats({
          totalItems: dataContext?.menuItems.length || 0,
          totalCategories: dataContext?.categories.length || 0,
          totalOrders: allOrders.length,
          revenuePotential: totalRevenue
      });
  };

  // Re-calculate menu/cat stats if they change
  useEffect(() => {
      if (dataContext) {
          setStats(prev => ({
              ...prev,
              totalItems: dataContext.menuItems.length,
              totalCategories: dataContext.categories.length
          }));
      }
  }, [dataContext]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (isRegistering) {
            await createUserWithEmailAndPassword(auth, email, password);
            toast.success('Account created! Welcome Admin.');
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success('Welcome back Admin');
        }
    } catch (error: any) {
        toast.error('Authentication failed: ' + error.message);
    }
  };

  const handleLogout = async () => {
      await signOut(auth);
      toast.success('Logged out');
  };

  // --- MENU HANDLERS ---
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name || !editingItem.category) return;

    const itemToSave: MenuItem = {
        id: editingItem.id || '',
        name: editingItem.name,
        category: editingItem.category,
        price: editingItem.price || 0,
        description: editingItem.description || '',
        isAvailable: editingItem.isAvailable ?? true,
        isComingSoon: editingItem.isComingSoon ?? false,
    };

    try {
        await saveMenuItem(itemToSave);
        toast.success('Menu Item saved!');
        setEditingItem(null);
        dataContext?.refreshData();
    } catch (err) {
        toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Delete this menu item?')) {
        await deleteMenuItem(id);
        toast.success('Item deleted');
        dataContext?.refreshData();
    }
  };

  // --- CATEGORY HANDLERS ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.title || !editingCategory.id) return;

    const catToSave: CategoryDefinition = {
        id: editingCategory.id.toLowerCase().replace(/\s+/g, '-'),
        title: editingCategory.title,
        icon: editingCategory.icon || 'utensils',
        colorTheme: (editingCategory.colorTheme as any) || 'orange',
        order: editingCategory.order || 0
    };

    try {
        await saveCategory(catToSave);
        toast.success('Category saved!');
        setEditingCategory(null);
        dataContext?.refreshData();
    } catch (err) {
        toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
      if (window.confirm('Delete this category? Items in this category will remain but might be hidden.')) {
          await deleteCategory(id);
          toast.success('Category deleted');
          dataContext?.refreshData();
      }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-yum-dark text-white">Loading...</div>;

  if (!user) {
    return (
        <div className="min-h-screen bg-yum-dark flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                <h2 className="text-2xl font-brand text-yum-orange mb-6 text-center">Yum Station Admin</h2>
                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yum-orange outline-none"
                            value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@yumstation.com" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yum-orange outline-none"
                            value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full bg-yum-orange text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition">
                        {isRegistering ? 'Create Account' : 'Login'}
                    </button>
                    
                    <div className="text-center mt-4">
                        <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-yum-orange hover:underline">
                            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                        </button>
                    </div>

                    <Link to="/" className="block text-center text-sm text-gray-500 hover:text-yum-dark mt-2">Back to Website</Link>
                </form>
            </div>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-yum-dark text-white flex flex-col shadow-2xl z-20">
            <div className="p-6 border-b border-gray-700 flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-yum-orange flex items-center justify-center font-brand text-xl">Y</div>
                <span className="font-bold text-lg tracking-wide">Yum Admin</span>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                    <LayoutDashboard size={20} /> Dashboard
                </button>
                <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'orders' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                    <Receipt size={20} /> Orders
                </button>
                <button onClick={() => setActiveTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'menu' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                    <UtensilsCrossed size={20} /> Menu Items
                </button>
                <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'categories' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                    <Layers size={20} /> Categories
                </button>
            </nav>
            <div className="p-4 border-t border-gray-700">
                <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm px-2">
                    <LogOut size={16} className="rotate-180"/> View Live Site
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white py-2 rounded-lg transition text-sm">
                    <LogOut size={16} /> Sign Out
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
            
            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-3xl font-bold text-gray-800">Overview</h2>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Menu Items</p>
                                    <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.totalItems}</h3>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UtensilsCrossed size={20} /></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Categories</p>
                                    <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.totalCategories}</h3>
                                </div>
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Layers size={20} /></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Total Orders</p>
                                    <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.totalOrders}</h3>
                                </div>
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><ShoppingBag size={20} /></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                                    <h3 className="text-3xl font-bold text-gray-800 mt-1">N{stats.revenuePotential.toLocaleString()}</h3>
                                </div>
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><DollarSign size={20} /></div>
                            </div>
                        </div>
                    </div>

                    {/* Recent 5 Orders */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Recent Orders</h3>
                            <button onClick={() => setActiveTab('orders')} className="text-sm text-yum-orange hover:underline">View All</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {orders.slice(0, 5).map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-800">{order.customerName}</td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${order.orderType === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {order.orderType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-yum-orange">
                                                N{order.totalAmount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {orders.length === 0 && (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No orders yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ORDERS TAB --- */}
            {activeTab === 'orders' && (
                <div className="space-y-6 animate-fade-in">
                     <h2 className="text-3xl font-bold text-gray-800">Order History</h2>
                     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase">
                                    <tr>
                                        <th className="p-4">Customer</th>
                                        <th className="p-4">Contact</th>
                                        <th className="p-4">Items</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4 text-right">Total</th>
                                        <th className="p-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                            <td className="p-4 font-bold text-gray-800">{order.customerName}</td>
                                            <td className="p-4 text-gray-600">
                                                <div className="flex flex-col">
                                                    <span>{order.phone}</span>
                                                    {order.orderType === 'delivery' && <span className="text-xs text-gray-400 truncate max-w-[150px]">{order.address}</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600">{order.items.length} items</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${order.orderType === 'delivery' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                    {order.orderType}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500 text-xs">
                                                {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleString() : ''}
                                            </td>
                                            <td className="p-4 text-right font-bold text-yum-orange">N{order.totalAmount.toLocaleString()}</td>
                                            <td className="p-4 text-gray-400"><ArrowRight size={16} /></td>
                                        </tr>
                                    ))}
                                    {orders.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">No orders found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                     </div>
                </div>
            )}

            {/* --- MENU TAB --- */}
            {activeTab === 'menu' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-3xl font-bold text-gray-800">Menu Management</h2>
                        <button onClick={() => setEditingItem({})} className="bg-yum-orange text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-orange-600 flex items-center gap-2">
                            <Plus size={18} /> Add Item
                        </button>
                    </div>

                    {/* Filter */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
                        <span className="text-gray-500 text-sm font-bold uppercase">Filter:</span>
                        <select 
                            value={filterCategory} 
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="bg-gray-100 border-none rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-yum-orange"
                        >
                            <option value="all">All Categories</option>
                            {dataContext?.categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Price</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {dataContext?.menuItems
                                    .filter(item => filterCategory === 'all' || item.category === filterCategory)
                                    .map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition">
                                        <td className="p-4 font-medium text-gray-800">{item.name}</td>
                                        <td className="p-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{item.category}</span></td>
                                        <td className="p-4 font-bold text-gray-600">N{item.price.toLocaleString()}</td>
                                        <td className="p-4">
                                            {item.isComingSoon ? <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded text-xs font-bold">Coming Soon</span> : 
                                             item.isAvailable ? <span className="text-green-500 bg-green-50 px-2 py-1 rounded text-xs font-bold">Active</span> : 
                                             <span className="text-red-500 bg-red-50 px-2 py-1 rounded text-xs font-bold">Unavailable</span>}
                                        </td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button onClick={() => setEditingItem(item)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- CATEGORIES TAB --- */}
            {activeTab === 'categories' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-bold text-gray-800">Categories</h2>
                        <button onClick={() => setEditingCategory({})} className="bg-yum-orange text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-orange-600 flex items-center gap-2">
                            <Plus size={18} /> New Category
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dataContext?.categories.map(cat => (
                            <div key={cat.id} className={`bg-white rounded-2xl shadow-sm border-t-4 p-6 relative group hover:shadow-md transition ${
                                cat.colorTheme === 'orange' ? 'border-orange-500' :
                                cat.colorTheme === 'red' ? 'border-red-500' :
                                cat.colorTheme === 'green' ? 'border-green-500' :
                                cat.colorTheme === 'blue' ? 'border-blue-500' :
                                cat.colorTheme === 'purple' ? 'border-purple-500' : 'border-gray-500'
                            }`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-gray-800">{cat.title}</h3>
                                    <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">#{cat.id}</span>
                                </div>
                                <div className="flex gap-2 text-sm text-gray-500 mb-4">
                                    <span className="flex items-center gap-1"><BarChart3 size={14}/> {cat.order}</span>
                                    <span className="flex items-center gap-1"><Settings size={14}/> {cat.icon}</span>
                                </div>
                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <button onClick={() => setEditingCategory(cat)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium transition">Edit</button>
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 py-2 rounded-lg text-sm font-medium transition">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}
            
            {/* Menu Item Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
                        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">{editingItem.id ? 'Edit Item' : 'New Item'}</h3>
                            <button onClick={() => setEditingItem(null)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                        </div>
                        <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                            <div>
                                <label className="label-text">Item Name</label>
                                <input className="input-field" required value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label-text">Category</label>
                                    <select className="input-field" required value={editingItem.category || ''} onChange={e => setEditingItem({...editingItem, category: e.target.value})}>
                                        <option value="">Select...</option>
                                        {dataContext?.categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-text">Price</label>
                                    <input className="input-field" type="number" value={editingItem.price || ''} onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div>
                                <label className="label-text">Description</label>
                                <textarea className="input-field resize-none" rows={2} value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
                            </div>
                            <div className="flex gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 text-yum-orange rounded focus:ring-yum-orange" checked={editingItem.isAvailable ?? true} onChange={e => setEditingItem({...editingItem, isAvailable: e.target.checked})} />
                                    <span className="text-sm font-medium text-gray-700">Available</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 text-yum-orange rounded focus:ring-yum-orange" checked={editingItem.isComingSoon ?? false} onChange={e => setEditingItem({...editingItem, isComingSoon: e.target.checked})} />
                                    <span className="text-sm font-medium text-gray-700">Coming Soon</span>
                                </label>
                            </div>
                            <button type="submit" className="w-full bg-yum-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition mt-4">Save Item</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {editingCategory && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
                        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">{editingCategory.id ? 'Edit Category' : 'New Category'}</h3>
                            <button onClick={() => setEditingCategory(null)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label-text">Category ID (Slug)</label>
                                    <input className="input-field" required placeholder="e.g. rice-bowls" value={editingCategory.id || ''} onChange={e => setEditingCategory({...editingCategory, id: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label-text">Display Title</label>
                                    <input className="input-field" required placeholder="e.g. Rice Bowls" value={editingCategory.title || ''} onChange={e => setEditingCategory({...editingCategory, title: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label-text">Icon</label>
                                    <select className="input-field" value={editingCategory.icon || 'utensils'} onChange={e => setEditingCategory({...editingCategory, icon: e.target.value})}>
                                        {availableIcons.map(i => <option key={i} value={i}>{i}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-text">Color Theme</label>
                                    <select className="input-field" value={editingCategory.colorTheme || 'orange'} onChange={e => setEditingCategory({...editingCategory, colorTheme: e.target.value})}>
                                        {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label-text">Sort Order</label>
                                <input type="number" className="input-field" value={editingCategory.order || 0} onChange={e => setEditingCategory({...editingCategory, order: parseInt(e.target.value)})} />
                            </div>
                            <button type="submit" className="w-full bg-yum-orange text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition mt-4">Save Category</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
                        <div className="bg-yum-orange p-4 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-bold text-lg">Order Details</h3>
                                <p className="text-xs opacity-90">{selectedOrder.id}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="flex justify-between border-b border-gray-100 pb-4">
                                <div>
                                    <p className="label-text">Customer</p>
                                    <p className="font-bold text-gray-800 text-lg">{selectedOrder.customerName}</p>
                                    <p className="text-sm text-gray-500">{selectedOrder.phone}</p>
                                </div>
                                <div className="text-right">
                                    <p className="label-text">Date</p>
                                    <p className="text-sm text-gray-600">
                                        {selectedOrder.createdAt?.seconds ? new Date(selectedOrder.createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                                    </p>
                                    <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-bold uppercase ${selectedOrder.orderType === 'delivery' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                        {selectedOrder.orderType}
                                    </span>
                                </div>
                            </div>

                            {selectedOrder.orderType === 'delivery' && (
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <p className="label-text mb-1">Delivery Address</p>
                                    <p className="text-gray-700 text-sm leading-relaxed">{selectedOrder.address}</p>
                                </div>
                            )}

                            <div>
                                <p className="label-text mb-2">Items</p>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-400">{item.qty}x</span>
                                                <span className="text-gray-800">{item.name}</span>
                                            </div>
                                            <span className="text-gray-600">N{(typeof item.price === 'number' ? item.price * item.qty : 0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                            <span className="font-bold text-gray-500 uppercase text-xs">Total Amount</span>
                            <span className="font-bold text-2xl text-yum-dark">N{selectedOrder.totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}
        </main>
        
        <style>{`
            .label-text { display: block; font-size: 0.75rem; font-weight: 700; color: #9ca3af; margin-bottom: 0.25rem; text-transform: uppercase; }
            .input-field { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; outline: none; transition: all; }
            .input-field:focus { border-color: #F2891C; ring: 2px; ring-color: #F2891C; }
        `}</style>
    </div>
  );
};

export default AdminPage;