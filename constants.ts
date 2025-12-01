import { CategoryDefinition, MenuItem } from './types';

export const CATEGORIES: CategoryDefinition[] = [
  { id: 'rice', title: 'Rice', icon: 'bowl', colorTheme: 'orange' },
  { id: 'beans', title: 'Beans', icon: 'sprout', colorTheme: 'brown' },
  { id: 'pasta', title: 'Pasta', icon: 'utensils', colorTheme: 'yellow' },
  { id: 'yam', title: 'Yam & Sauce', icon: 'carrot', colorTheme: 'yellow' }, // mapped yellow-500 equivalent
  { id: 'protein', title: 'Proteins', icon: 'drumstick', colorTheme: 'red' },
  { id: 'swallow', title: 'Swallows', icon: 'cookie', colorTheme: 'stone' },
  { id: 'soups', title: 'Soups', icon: 'leaf', colorTheme: 'green' },
  { id: 'burgers', title: 'Burgers', icon: 'sandwich', colorTheme: 'red' },
  { id: 'shawarma', title: 'Shawarma', icon: 'flame', colorTheme: 'orange' },
  { id: 'specials', title: 'Specials', icon: 'star', colorTheme: 'purple' },
  { id: 'drinks', title: 'Drinks', icon: 'glass', colorTheme: 'blue' },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // Rice
  { id: '1', category: 'rice', name: 'Coconut Rice (Jumbo)', price: 2400, isAvailable: true },
  { id: '2', category: 'rice', name: 'Coconut Rice (Mini)', price: 1200, isAvailable: true },
  { id: '3', category: 'rice', name: 'Fried Rice (Jumbo)', price: 2800, isAvailable: true },
  { id: '4', category: 'rice', name: 'Fried Rice (Mini)', price: 1400, isAvailable: true },
  { id: '5', category: 'rice', name: 'Jollof Rice (Jumbo)', price: 2400, isAvailable: true },
  { id: '6', category: 'rice', name: 'Jollof Rice (Mini)', price: 1200, isAvailable: true },
  { id: '7', category: 'rice', name: 'Yummy Special Basmati', price: 'Ask for price', isAvailable: false, isComingSoon: true },
  
  // Beans
  { id: '8', category: 'beans', name: 'Trenches Style (Beans + Garri)', price: 'Ask for price', isAvailable: false, isComingSoon: true },
  
  // Pasta
  { id: '9', category: 'pasta', name: 'Pasta Jumbo Pack', price: 2500, isAvailable: true },
  { id: '10', category: 'pasta', name: 'Pasta Mini Pack', price: 2000, isAvailable: true },

  // Yam
  { id: '11', category: 'yam', name: 'Yamarita + Garden Egg Sauce', price: 'Ask for price', isAvailable: false, isComingSoon: true },

  // Protein
  { id: '12', category: 'protein', name: 'Turkey', price: 5000, isAvailable: true },
  { id: '13', category: 'protein', name: 'Chicken', price: 3000, isAvailable: true },
  { id: '14', category: 'protein', name: 'Fish', price: 2500, isAvailable: true },
  { id: '15', category: 'protein', name: 'Beef / Goat Meat', price: 500, isAvailable: true },

  // Swallow
  { id: '16', category: 'swallow', name: 'Poundo Yam', price: 300, isAvailable: true },
  { id: '17', category: 'swallow', name: 'Semovita', price: 300, isAvailable: true },
  { id: '18', category: 'swallow', name: 'Garri (Eba)', price: 300, isAvailable: true },

  // Soups
  { id: '19', category: 'soups', name: 'Ogbono + Garri', price: 2100, isAvailable: true },
  { id: '20', category: 'soups', name: 'Ogbono + Semo', price: 2500, isAvailable: true },
  { id: '21', category: 'soups', name: 'Egusi + Garri', price: 1900, isAvailable: true },
  { id: '22', category: 'soups', name: 'Afang + Poundo', price: 2300, isAvailable: true },

  // Burgers
  { id: '23', category: 'burgers', name: 'Regular Beef Burger', price: 4500, description: 'Double Beef + 2 Cheese + Hotdog', isAvailable: true },
  { id: '24', category: 'burgers', name: 'Station Beef Burger', price: 5000, description: '3 Beef + 2 Cheese + Suya + Hotdogs', isAvailable: true },
  { id: '25', category: 'burgers', name: 'Regular Chicken Burger', price: 4500, isAvailable: true },
  { id: '26', category: 'burgers', name: 'Yummy Special Burger', price: 6000, description: 'Chicken + 2 Beef + 3 Cheese + Suya + Hotdogs', isAvailable: true },

  // Shawarma
  { id: '27', category: 'shawarma', name: 'Beef Shawarma', price: 4500, isAvailable: true },
  { id: '28', category: 'shawarma', name: 'Chicken Shawarma', price: 5500, isAvailable: true },
  { id: '29', category: 'shawarma', name: 'Yummy Special Shawarma', price: 6000, description: 'Chicken + Beef + Suya', isAvailable: true },

  // Drinks
  { id: '30', category: 'drinks', name: 'Water', price: 300, isAvailable: true },
  { id: '31', category: 'drinks', name: 'Soda (Coke/Fanta)', price: 500, isAvailable: true },
  { id: '32', category: 'drinks', name: 'Hollandia Big', price: 1900, isAvailable: true },
  { id: '33', category: 'drinks', name: 'Parfait', price: 3000, isAvailable: true },
];