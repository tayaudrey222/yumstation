import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../App';
import { MenuItem, CategoryDefinition, DashboardStats, Order, AdminRole, InventoryItem } from '../types';
import { saveMenuItem, deleteMenuItem } from '../services/menuService';
import { saveCategory, deleteCategory } from '../services/categoryService';
import { getOrders, updateOrderStatus } from '../services/orderService';
import { getAdminByEmail, createAdmin, getAllAdmins, updateAdminRole } from '../services/adminService';
import { logAudit, getRecentAuditLogs } from '../services/auditService';
import { getInventoryItems, saveInventoryItem, deleteInventoryItem, restockInventory, restockInventoryById, getLowStockItems, deductInventory } from '../services/inventoryService';
import { Timestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { 
    Trash2, Edit2, Plus, LogOut, LayoutDashboard, 
    UtensilsCrossed, Layers, BarChart3, Settings, Save,
    TrendingUp, ShoppingBag, DollarSign, X, Receipt, ArrowRight, Menu
} from 'lucide-react';

const availableIcons = ['bowl', 'sprout', 'utensils', 'carrot', 'drumstick', 'cookie', 'leaf', 'sandwich', 'flame', 'glass', 'star'];
const availableColors = ['orange', 'yellow', 'red', 'green', 'blue', 'purple', 'stone', 'brown'];

const AdminPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AdminRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

    // Tabs
    const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu' | 'categories' | 'users' | 'inventory'>('dashboard');
    const [showSidebar, setShowSidebar] = useState(false);
  
  const dataContext = useContext(DataContext);
    const [admins, setAdmins] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
    const [editingInventory, setEditingInventory] = useState<Partial<InventoryItem> | null>(null);
  
  // Dashboard & Order Stats
  const [orders, setOrders] = useState<Order[]>([]);
    const [unconfirmedCount, setUnconfirmedCount] = useState<number>(0);
    const [confirmTarget, setConfirmTarget] = useState<Order | null>(null);
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            // Fetch user role
            const adminUser = await getAdminByEmail(currentUser.email || '');
            if (adminUser) {
                setUserRole(adminUser.role);
            }
            fetchOrders();
        }
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Close mobile sidebar when switching tabs
  useEffect(() => {
      setShowSidebar(false);
  }, [activeTab]);

  const fetchOrders = async () => {
      const allOrders = await getOrders();
      setOrders(allOrders);
      
      // Calculate Stats using only confirmed (completed) orders
      const completed = allOrders.filter(o => o.status === 'completed');
      const pending = allOrders.filter(o => o.status === 'pending');
      const totalRevenue = completed.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      setStats({
          totalItems: dataContext?.menuItems.length || 0,
          totalCategories: dataContext?.categories.length || 0,
          totalOrders: completed.length,
          revenuePotential: totalRevenue
      });
      setUnconfirmedCount(pending.length);
  };

  const fetchAdmins = async () => {
      try {
          if (userRole !== 'super_admin') return;
          const list = await getAllAdmins();
          setAdmins(list);
      } catch (err) {
          console.error('Failed to fetch admins', err);
      }
  };

  useEffect(() => {
      if (userRole === 'super_admin') {
          fetchAdmins();
          fetchInventory();
      }
  }, [userRole]);

  const fetchAuditLogs = async () => {
      try {
          const logs = await getRecentAuditLogs(100);
          setAuditLogs(logs);
      } catch (err) {
          console.error('Failed to load audit logs', err);
      }
  };

  const fetchInventory = async () => {
      try {
          const items = await getInventoryItems();
          setInventory(items);
          const low = await getLowStockItems();
          setLowStockItems(low);
      } catch (err) {
          console.error('Failed to fetch inventory', err);
      }
  };

  const handleChangeRole = async (uid: string, newRole: AdminRole) => {
      try {
          const target = admins.find(a => a.id === uid) || null;
          const oldRole = target?.role || 'admin';
          await updateAdminRole(uid, newRole);
          // audit
          await logAudit({ type: 'role_changed', actorId: user?.uid, actorEmail: user?.email || '', targetId: uid, targetEmail: target?.email || '', details: { from: oldRole, to: newRole } });
          toast.success('Role updated');
          fetchAdmins();
      } catch (err) {
          toast.error('Failed to update role');
      }
  };

  const handleConfirmOrder = async (orderId: string) => {
      // open confirmation modal instead of immediately confirming
      const target = orders.find(o => o.id === orderId) || null;
      setConfirmTarget(target);
  };

  const handleCancelOrder = async (orderId: string) => {
      if (!window.confirm('Cancel this order?')) return;
      try {
          await updateOrderStatus(orderId, 'cancelled');
          toast('Order cancelled');
          fetchOrders();
      } catch (err) {
          toast.error('Failed to cancel order');
      }
  };

  const confirmApprove = async () => {
      if (!confirmTarget) return;
      try {
          await updateOrderStatus(confirmTarget.id, 'completed', { confirmedAt: Timestamp.now(), confirmedTotal: confirmTarget.totalAmount });
          
          // Deduct inventory for each item in the order
          for (const item of confirmTarget.items) {
              await deductInventory(item.id, item.qty);
          }
          
          // audit
          await logAudit({ type: 'order_confirmed', actorId: user?.uid, actorEmail: user?.email || '', targetId: confirmTarget.id, details: { confirmedTotal: confirmTarget.totalAmount } });
          toast.success('Order confirmed & inventory updated');
          setConfirmTarget(null);
          fetchOrders();
          fetchInventory(); // Refresh inventory to show updated stock
      } catch (err) {
          toast.error('Failed to confirm order');
          console.error(err);
      }
  };

  const confirmCancel = () => setConfirmTarget(null);

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
            const result = await createUserWithEmailAndPassword(auth, email, password);
            // Create admin record with default role and use returned role
            const adminUser = await createAdmin(result.user.uid, email);
            if (adminUser) setUserRole(adminUser.role);
            // audit: admin created (self-registration)
            await logAudit({ type: 'admin_created', actorId: result.user.uid, actorEmail: email, targetId: adminUser.id, targetEmail: adminUser.email, details: { role: adminUser.role } });
            toast.success('Account created! Welcome Admin.');
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            // Fetch role on login
            const adminUser = await getAdminByEmail(email);
            if (adminUser) setUserRole(adminUser.role);
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

  // Toggle availability directly from the list (not the modal)
  const handleToggleAvailability = async (itemId: string) => {
      const item = dataContext?.menuItems.find(i => i.id === itemId);
      if (!item) return;
      try {
          await saveMenuItem({ ...item, isAvailable: !item.isAvailable });
          toast.success(`${item.name} is now ${!item.isAvailable ? 'Available' : 'Unavailable'}`);
          dataContext?.refreshData();
      } catch (err) {
          console.error('Failed to toggle availability', err);
          toast.error('Failed to update availability');
      }
  };

  // --- INVENTORY HANDLERS ---
  const handleSaveInventory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingInventory || editingInventory.quantity === undefined || !editingInventory.itemName) {
          toast.error('Missing required fields');
          return;
      }
      
      try {
          const isMenuLinked = !!(editingInventory.menuItemId);
          const invItem: InventoryItem = {
              id: editingInventory.id || Date.now().toString(),
              menuItemId: editingInventory.menuItemId,
              itemName: editingInventory.itemName || '',
              quantity: editingInventory.quantity || 0,
              unit: editingInventory.unit || 'pieces',
              reorderThreshold: editingInventory.reorderThreshold || 5,
              isMenuLinked: isMenuLinked,
              lastRestocked: Timestamp.now()
          };
          await saveInventoryItem(invItem);
          toast.success('Inventory item saved!');
          setEditingInventory(null);
          fetchInventory();
      } catch (err) {
          console.error(err);
          toast.error('Failed to save inventory item');
      }
  };

  const handleDeleteInventory = async (id: string) => {
      if (window.confirm('Delete this inventory record?')) {
          try {
              await deleteInventoryItem(id);
              toast.success('Inventory record deleted');
              fetchInventory();
          } catch (err) {
              toast.error('Failed to delete inventory record');
          }
      }
  };

  const handleRestockInventory = async (id: string, currentQty: number) => {
      const qty = prompt(`Add to stock (current: ${currentQty}):`, '10');
      if (!qty || isNaN(parseInt(qty))) return;
      
      try {
          const qtyNum = parseInt(qty);
          const item = inventory.find(i => i.id === id);
          if (item) {
              // Use the new restockInventoryById function
              await restockInventoryById(item.id, qtyNum);
              toast.success(`Added ${qtyNum} to stock`);
              fetchInventory();
          }
      } catch (err) {
          toast.error('Failed to restock item');
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
        {/* Sidebar for desktop */}
        <aside className="hidden md:flex w-64 bg-yum-dark text-white flex-col shadow-2xl z-20">
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
                {userRole === 'super_admin' && (
                    <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'users' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <BarChart3 size={20} /> Users
                    </button>
                )}
                {userRole === 'super_admin' && (
                    <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'inventory' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                        <ShoppingBag size={20} /> Inventory
                    </button>
                )}
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

        {/* Mobile sidebar overlay */}
        {showSidebar && (
            <aside className="fixed inset-0 z-40 md:hidden">
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowSidebar(false)} />
                <div className="absolute left-0 top-0 bottom-0 w-64 bg-yum-dark text-white flex flex-col shadow-2xl">
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-yum-orange flex items-center justify-center font-brand text-xl">Y</div>
                            <span className="font-bold text-lg tracking-wide">Yum Admin</span>
                        </div>
                        <button onClick={() => setShowSidebar(false)} className="p-2 text-gray-300"><X size={18} /></button>
                    </div>
                    <nav className="flex-1 p-4 space-y-2">
                        <button onClick={() => { setActiveTab('dashboard'); setShowSidebar(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                            <LayoutDashboard size={20} /> Dashboard
                        </button>
                        <button onClick={() => { setActiveTab('orders'); setShowSidebar(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'orders' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                            <Receipt size={20} /> Orders
                        </button>
                        <button onClick={() => { setActiveTab('menu'); setShowSidebar(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'menu' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                            <UtensilsCrossed size={20} /> Menu Items
                        </button>
                        <button onClick={() => { setActiveTab('categories'); setShowSidebar(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'categories' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                            <Layers size={20} /> Categories
                        </button>
                        {userRole === 'super_admin' && (
                            <button onClick={() => { setActiveTab('users'); setShowSidebar(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'users' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                                <BarChart3 size={20} /> Users
                            </button>
                        )}
                        {userRole === 'super_admin' && (
                            <button onClick={() => { setActiveTab('inventory'); setShowSidebar(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'inventory' ? 'bg-yum-orange text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                                <ShoppingBag size={20} /> Inventory
                            </button>
                        )}
                    </nav>
                    <div className="p-4 border-t border-gray-700">
                        <Link to="/" onClick={() => setShowSidebar(false)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm px-2">
                            <LogOut size={16} className="rotate-180"/> View Live Site
                        </Link>
                        <button onClick={() => { handleLogout(); setShowSidebar(false); }} className="w-full flex items-center justify-center gap-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white py-2 rounded-lg transition text-sm">
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </div>
            </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
            {/* Mobile topbar */}
            <div className="md:hidden flex items-center justify-between mb-4">
                <button onClick={() => setShowSidebar(true)} className="p-2 bg-white rounded-lg shadow text-yum-dark"><Menu size={20} /></button>
                <h2 className="text-lg font-bold text-gray-800">Yum Admin</h2>
                <div />
            </div>

            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-3xl font-bold text-gray-800">Overview</h2>
                    
                    {/* Stats Cards */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${userRole === 'super_admin' ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-6`}>
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
                                    <p className="text-gray-500 text-sm font-medium">Unconfirmed Orders</p>
                                    <h3 className="text-3xl font-bold text-gray-800 mt-1">{unconfirmedCount}</h3>
                                </div>
                                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><Receipt size={20} /></div>
                            </div>
                        </div>
                        {userRole === 'super_admin' && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                                        <h3 className="text-3xl font-bold text-gray-800 mt-1">N{stats.revenuePotential.toLocaleString()}</h3>
                                    </div>
                                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><DollarSign size={20} /></div>
                                </div>
                            </div>
                        )}
                        {userRole === 'super_admin' && (
                            <div className={`bg-white p-6 rounded-2xl shadow-sm border-2 ${lowStockItems.length > 0 ? 'border-red-300' : 'border-gray-100'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className={`text-sm font-medium ${lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>Low Stock Items</p>
                                        <h3 className={`text-3xl font-bold mt-1 ${lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-800'}`}>{lowStockItems.length}</h3>
                                    </div>
                                    <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}><TrendingUp size={20} /></div>
                                </div>
                            </div>
                        )}
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
                                            <td className="p-4 text-right">
                                                {order.status === 'pending' ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); handleConfirmOrder(order.id); }} className="bg-green-600 text-white px-3 py-1 rounded-md text-sm">Confirm</button>
                                                        {userRole === 'super_admin' && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }} className="bg-red-100 text-red-600 px-3 py-1 rounded-md text-sm">Cancel</button>
                                                        )}
                                                    </div>
                                                ) : order.status === 'completed' ? (
                                                    <span className="inline-block px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">Completed</span>
                                                ) : (
                                                    <span className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold">Cancelled</span>
                                                )}
                                            </td>
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
                        {userRole === 'super_admin' && (
                            <button onClick={() => setEditingItem({})} className="bg-yum-orange text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-orange-600 flex items-center gap-2">
                                <Plus size={18} /> Add Item
                            </button>
                        )}
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
                                        <td className="p-4 text-right flex justify-end items-center gap-2">
                                            <button onClick={() => handleToggleAvailability(item.id)} aria-pressed={item.isAvailable} className={`${item.isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} px-3 py-1 rounded-full text-xs font-bold transition`}>
                                                {item.isAvailable ? 'Available' : 'Unavailable'}
                                            </button>
                                            {userRole === 'super_admin' && (
                                                <>
                                                    <button onClick={() => setEditingItem(item)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button>
                                                </>
                                            )}
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
                        {userRole === 'super_admin' && (
                            <button onClick={() => setEditingCategory({})} className="bg-yum-orange text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-orange-600 flex items-center gap-2">
                                <Plus size={18} /> New Category
                            </button>
                        )}
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
                                    {userRole === 'super_admin' ? (
                                        <>
                                            <button onClick={() => setEditingCategory(cat)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-medium transition">Edit</button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 py-2 rounded-lg text-sm font-medium transition">Delete</button>
                                        </>
                                    ) : (
                                        <div className="flex-1 bg-gray-50 text-gray-500 py-2 rounded-lg text-sm font-medium text-center">View only</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- USERS TAB (Role Management) --- */}
            {activeTab === 'users' && userRole === 'super_admin' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-bold text-gray-800">Admin Users</h2>
                        <div className="flex items-center gap-3">
                            <button onClick={fetchAdmins} className="bg-gray-100 px-3 py-2 rounded-md text-sm">Refresh</button>
                            <button onClick={() => { setShowAuditModal(true); fetchAuditLogs(); }} className="bg-gray-50 px-3 py-2 rounded-md text-sm">View Audit</button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase">
                                <tr>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Created</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {admins.map(a => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                        <td className="p-3">{a.email}</td>
                                        <td className="p-3">{a.role}</td>
                                        <td className="p-3 text-gray-500">{a.createdAt ? new Date(a.createdAt.seconds ? a.createdAt.seconds * 1000 : a.createdAt).toLocaleString() : ''}</td>
                                        <td className="p-3 text-right">
                                            {a.id === user?.uid ? (
                                                <span className="text-sm text-gray-400">You</span>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleChangeRole(a.id, a.role === 'admin' ? 'super_admin' : 'admin')} className="px-3 py-1 rounded-md text-sm bg-blue-50 text-blue-700">
                                                        {a.role === 'admin' ? 'Promote' : 'Demote'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {admins.length === 0 && (
                                    <tr><td colSpan={4} className="p-6 text-center text-gray-400">No admin users found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Audit Modal */}
            {showAuditModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold">Audit Log</h3>
                            <button onClick={() => setShowAuditModal(false)} className="text-gray-500">Close</button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {auditLogs.length === 0 ? (
                                <p className="text-gray-400">No audit entries yet.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {auditLogs.map((l: any) => (
                                        <li key={l.id} className="p-3 bg-gray-50 rounded-md">
                                            <div className="text-sm font-bold">{l.type}</div>
                                            <div className="text-xs text-gray-500">Actor: {l.actorEmail || l.actorId} • Target: {l.targetEmail || l.targetId}</div>
                                            <div className="text-xs text-gray-700 mt-2">{JSON.stringify(l.details)}</div>
                                            <div className="text-xs text-gray-400 mt-1">{l.timestamp ? (new Date(l.timestamp.seconds ? l.timestamp.seconds * 1000 : l.timestamp).toLocaleString()) : ''}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- INVENTORY TAB --- */}
            {activeTab === 'inventory' && userRole === 'super_admin' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-bold text-gray-800">Inventory Management</h2>
                        <button onClick={() => setEditingInventory({})} className="bg-yum-orange text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-600">
                            <Plus size={18} /> Add Inventory Item
                        </button>
                    </div>

                    {/* Low Stock Alert */}
                    {lowStockItems.length > 0 && (
                        <div className="bg-red-50 border border-red-300 p-4 rounded-lg">
                            <p className="text-red-700 font-bold">⚠️ {lowStockItems.length} item(s) below reorder threshold</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {lowStockItems.map(item => (
                                    <span key={item.id} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full">{item.itemName} ({item.quantity} {item.unit})</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Item Name</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Quantity</th>
                                        <th className="px-4 py-3">Unit</th>
                                        <th className="px-4 py-3">Reorder Threshold</th>
                                        <th className="px-4 py-3">Last Restocked</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {inventory.map(item => {
                                        const isLowStock = item.quantity < item.reorderThreshold;
                                        return (
                                            <tr key={item.id} className={isLowStock ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
                                                <td className={`px-4 py-3 font-medium ${isLowStock ? 'text-red-700' : 'text-gray-800'}`}>{item.itemName}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span className={`px-2 py-1 rounded-full font-bold ${item.isMenuLinked ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                        {item.isMenuLinked ? 'Menu' : 'Ingredient'}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 font-bold ${isLowStock ? 'text-red-600' : 'text-gray-800'}`}>{item.quantity}</td>
                                                <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                                                <td className="px-4 py-3 text-gray-500">{item.reorderThreshold}</td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {item.lastRestocked ? new Date(item.lastRestocked.seconds ? item.lastRestocked.seconds * 1000 : item.lastRestocked).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setEditingInventory(item)} className="px-3 py-1 rounded-md text-sm bg-blue-50 text-blue-700 hover:bg-blue-100">
                                                            Edit
                                                        </button>
                                                        <button onClick={() => handleRestockInventory(item.id, item.quantity)} className="px-3 py-1 rounded-md text-sm bg-green-50 text-green-700 hover:bg-green-100">
                                                            Restock
                                                        </button>
                                                        <button onClick={() => handleDeleteInventory(item.id)} className="px-3 py-1 rounded-md text-sm bg-red-50 text-red-700 hover:bg-red-100">
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {inventory.length === 0 && (
                                        <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No inventory items. Click "Add Inventory Item" to get started.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- INVENTORY ITEM MODAL --- */}
            {editingInventory && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
                        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">{editingInventory.id ? 'Edit Inventory Item' : 'New Inventory Item'}</h3>
                            <button onClick={() => setEditingInventory(null)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                        </div>
                        <form onSubmit={handleSaveInventory} className="p-6 space-y-4">
                            {/* Toggle between Menu Item and Kitchen Ingredient */}
                            <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                                <label className="flex items-center gap-2 cursor-pointer flex-1 p-2 rounded hover:bg-gray-100">
                                    <input 
                                        type="radio" 
                                        name="itemType" 
                                        checked={editingInventory.isMenuLinked === true || editingInventory.isMenuLinked === undefined}
                                        onChange={() => setEditingInventory({...editingInventory, isMenuLinked: true, menuItemId: '', itemName: ''})}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm font-medium">Menu Item</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer flex-1 p-2 rounded hover:bg-gray-100">
                                    <input 
                                        type="radio" 
                                        name="itemType" 
                                        checked={editingInventory.isMenuLinked === false}
                                        onChange={() => setEditingInventory({...editingInventory, isMenuLinked: false, menuItemId: undefined, itemName: ''})}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm font-medium">Kitchen Ingredient</span>
                                </label>
                            </div>

                            {/* Menu Item Selection */}
                            {editingInventory.isMenuLinked !== false ? (
                                <div>
                                    <label className="label-text">Select Menu Item *</label>
                                    <select className="input-field" required value={editingInventory.menuItemId || ''} onChange={e => {
                                        const menuItem = dataContext?.menuItems.find(m => m.id === e.target.value);
                                        setEditingInventory({...editingInventory, menuItemId: e.target.value, itemName: menuItem?.name || ''});
                                    }}>
                                        <option value="">Select a menu item...</option>
                                        {dataContext?.menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="label-text">Ingredient Name *</label>
                                    <input 
                                        className="input-field" 
                                        placeholder="e.g., Tomato Sauce, Chicken Breast, Rice Flour" 
                                        required 
                                        value={editingInventory.itemName || ''} 
                                        onChange={e => setEditingInventory({...editingInventory, itemName: e.target.value})} 
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label-text">Quantity *</label>
                                    <input className="input-field" type="number" min="0" required value={editingInventory.quantity !== undefined ? editingInventory.quantity : ''} onChange={e => setEditingInventory({...editingInventory, quantity: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="label-text">Unit *</label>
                                    <select className="input-field" required value={editingInventory.unit || 'pieces'} onChange={e => setEditingInventory({...editingInventory, unit: e.target.value})}>
                                        <option value="pieces">pieces</option>
                                        <option value="kg">kg</option>
                                        <option value="g">grams</option>
                                        <option value="liters">liters</option>
                                        <option value="ml">milliliters</option>
                                        <option value="packs">packs</option>
                                        <option value="boxes">boxes</option>
                                        <option value="bottles">bottles</option>
                                        <option value="cans">cans</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label-text">Reorder Threshold *</label>
                                <input className="input-field" type="number" min="1" required value={editingInventory.reorderThreshold || ''} onChange={e => setEditingInventory({...editingInventory, reorderThreshold: Number(e.target.value)})} />
                                <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this amount</p>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setEditingInventory(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-yum-orange text-white hover:bg-orange-600">Save Item</button>
                            </div>
                        </form>
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

            {/* Confirm Order Modal */}
            {confirmTarget && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
                        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">Confirm Order</h3>
                            <button onClick={() => setConfirmTarget(null)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">You're about to confirm the following order. This will record the amount as the confirmed total.</p>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="font-bold">{confirmTarget.customerName}</p>
                                <p className="text-sm text-gray-600">Order ID: {confirmTarget.id}</p>
                                <p className="text-sm text-gray-800 font-bold mt-2">Total: N{confirmTarget.totalAmount.toLocaleString()}</p>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setConfirmTarget(null)} className="px-4 py-2 rounded-md bg-gray-100">Cancel</button>
                                <button onClick={confirmApprove} className="px-4 py-2 rounded-md bg-green-600 text-white">Confirm Order</button>
                            </div>
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