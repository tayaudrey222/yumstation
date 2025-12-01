import React, { useContext } from 'react';
import { PlusCircle, Star, Flame, Utensils, Sprout, Carrot, Drumstick, Cookie, Leaf, Sandwich, GlassWater } from 'lucide-react';
import { CategoryDefinition, MenuItem } from '../types';
import { CartContext } from '../App';
import toast from 'react-hot-toast';

interface Props {
  category: CategoryDefinition;
  items: MenuItem[];
}

const MenuSection: React.FC<Props> = ({ category, items }) => {
  const cartContext = useContext(CartContext);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'bowl': return <Utensils className="opacity-30" />;
      case 'sprout': return <Sprout className="opacity-30" />;
      case 'utensils': return <Utensils className="opacity-30" />;
      case 'carrot': return <Carrot className="opacity-30" />;
      case 'drumstick': return <Drumstick className="opacity-30" />;
      case 'cookie': return <Cookie className="opacity-30" />;
      case 'leaf': return <Leaf className="opacity-30" />;
      case 'sandwich': return <Sandwich className="opacity-30" />;
      case 'flame': return <Flame className="opacity-30" />;
      case 'glass': return <GlassWater className="opacity-30" />;
      case 'star': return <Star className="opacity-30" />;
      default: return <Utensils className="opacity-30" />;
    }
  };

  const getThemeClasses = (theme: string) => {
    switch (theme) {
      case 'orange': return 'border-yum-orange bg-orange-50 text-yum-orange';
      case 'yellow': return 'border-yum-yellow bg-yellow-50 text-yellow-600';
      case 'red': return 'border-yum-red bg-red-50 text-yum-red';
      case 'green': return 'border-green-600 bg-green-50 text-green-700';
      case 'blue': return 'border-blue-400 bg-blue-50 text-blue-500';
      case 'purple': return 'border-purple-600 bg-purple-50 text-purple-700';
      case 'brown': return 'border-yellow-800 bg-yellow-50 text-yellow-900';
      case 'stone': return 'border-stone-400 bg-stone-100 text-stone-700';
      default: return 'border-gray-200 bg-gray-50 text-gray-700';
    }
  };

  const themeClasses = getThemeClasses(category.colorTheme);

  const handleAdd = (item: MenuItem) => {
    if (cartContext) {
      cartContext.addToCart(item);
      toast.success(`Added ${item.name}`);
    }
  };

  if (items.length === 0) return null;

  return (
    <section id={category.id} className={`bg-white rounded-2xl shadow-xl overflow-hidden border-t-8 ${themeClasses.split(' ')[0]} mb-8`}>
      <div className={`p-4 flex items-center justify-between ${themeClasses.split(' ').slice(1).join(' ')}`}>
        <h3 className="text-3xl font-brand tracking-wider">{category.title}</h3>
        <div className="text-2xl">{getIcon(category.icon)}</div>
      </div>
      
      <div className="p-4 divide-y divide-gray-100">
        {items.map(item => (
          <div key={item.id} className={`py-3 ${!item.isAvailable || item.isComingSoon ? 'opacity-70' : ''}`}>
             <div className="flex justify-between items-center mb-1">
                <div className="flex flex-col">
                  <span className={`font-bold ${item.category === 'specials' ? 'text-purple-700' : 'text-gray-800'}`}>
                    {item.name}
                  </span>
                  {item.description && <span className="text-xs text-gray-500">{item.description}</span>}
                </div>
                
                {item.isComingSoon || !item.isAvailable ? (
                   <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded whitespace-nowrap ml-2">Coming Soon</span>
                ) : (
                  <button 
                    onClick={() => handleAdd(item)}
                    className={`ml-3 btn-add flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border transition shadow-sm whitespace-nowrap
                      ${category.colorTheme === 'red' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-orange-50 text-yum-orange border-orange-100'}
                    `}
                  >
                    <span>N{typeof item.price === 'number' ? item.price.toLocaleString() : item.price}</span>
                    <PlusCircle size={14} />
                  </button>
                )}
             </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MenuSection;