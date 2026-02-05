
import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, SlidersHorizontal, Star, Heart, ArrowRight, PlusCircle, CheckCircle2, X, Trash2, Plus, Minus } from 'lucide-react';
import { Product, CartItem } from '../types';
import { ProductSkeleton } from './ui/Skeleton';

const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'ELITE X-1 CARBON PADDLE',
    category: 'Paddles',
    price: 219,
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=400',
    isLimited: true
  },
  {
    id: 'p2',
    name: 'KITCHEN COMMANDER TEE',
    category: 'Apparel',
    price: 45,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400',
    isNew: true
  },
  {
    id: 'p3',
    name: 'PRO-FLIGHT PERFORMANCE BALLS',
    category: 'Accessories',
    price: 15,
    image: 'https://images.unsplash.com/photo-1611080352520-2804b4d6a992?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'p4',
    name: 'STEALTH GRIP COURT SHOES',
    category: 'Accessories',
    price: 135,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400',
    isNew: true
  },
  {
    id: 'p5',
    name: 'TITAN PRO V2 PADDLE',
    category: 'Paddles',
    price: 189,
    image: 'https://images.unsplash.com/photo-1610631882985-0950f1993108?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'p6',
    name: 'PERFORMANCE COMPRESSION SHORTS',
    category: 'Apparel',
    price: 55,
    image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'p7',
    name: 'ELITE TOUR BACKPACK',
    category: 'Accessories',
    price: 120,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'p8',
    name: 'CARBON LITE OVERGRIP (3-PACK)',
    category: 'Accessories',
    price: 12,
    image: 'https://images.unsplash.com/photo-1587302912306-cf1ed9c33146?auto=format&fit=crop&q=80&w=400',
  }
];

interface ShopProps {
  cartItems: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, newQuantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
}

const Shop: React.FC<ShopProps> = ({ cartItems, onAddToCart, onUpdateCartQuantity, onRemoveFromCart }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [justAddedProductId, setJustAddedProductId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const filteredProducts = PRODUCTS.filter(product => {
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCartClick = (product: Product) => {
    onAddToCart(product);
    setJustAddedProductId(product.id);
    setTimeout(() => {
      setJustAddedProductId(null);
    }, 2000);
  };

  return (
    <>
      <div className="min-h-screen">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12 space-y-12 animate-fade-in">
          <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">PICKLEPLAY PRO SHOP</p>
              <h1 className="text-6xl md:text-8xl font-black text-slate-950 tracking-tighter">EQUIP FOR VICTORY.</h1>
            </div>
            <button key={cartCount} onClick={() => setIsCartOpen(true)} className="bg-slate-900 text-white w-16 h-16 rounded-2xl flex items-center justify-center relative transition-transform hover:scale-110 active:scale-95 shrink-0 shadow-xl">
              <ShoppingBag size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-lime-400 text-slate-950 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-white animate-in zoom-in-50 duration-300">
                  {cartCount}
                </span>
              )}
            </button>
          </header>

          <section className="relative h-[450px] rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1554228724-1abded3e2077?auto=format&fit=crop&q=80&w=1200"
              className="w-full h-full object-cover opacity-60"
              alt="Featured Product"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent"></div>
            <div className="absolute inset-y-0 left-0 p-12 md:p-16 flex flex-col justify-center max-w-2xl space-y-6">
              <span className="bg-lime-400 text-slate-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest self-start">NEW COLLECTION</span>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
                THE CARBON SERIES <br /><span className="text-lime-400 italic">V3.0 IS HERE.</span>
              </h2>
              <p className="text-slate-300 font-medium">Engineered for elite power and ultimate control. Handcrafted with raw carbon fiber surfaces for superior spin potential.</p>
              <button className="bg-white text-slate-950 h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-lime-400 transition-all flex items-center gap-3 w-fit">
                SHOP CARBON SERIES <ArrowRight size={16} />
              </button>
            </div>
          </section>

          <div className="sticky top-4 z-30 flex flex-col lg:flex-row gap-6 items-center justify-between bg-white/80 backdrop-blur-md p-4 rounded-[32px] border border-slate-200 shadow-lg">
            <div className="flex flex-wrap gap-2">
              {['All', 'Paddles', 'Apparel', 'Accessories'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat
                    ? 'bg-slate-950 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-950'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search gear..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-14 pr-6 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {isLoading ? (
              Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)
            ) : (
              filteredProducts.map((product) => {
                const isJustAdded = justAddedProductId === product.id;
                return (
                  <div key={product.id} className="group relative">
                    <div className="aspect-[3/4] rounded-[40px] overflow-hidden bg-white relative mb-6 border border-slate-200 transition-all group-hover:shadow-2xl group-hover:-translate-y-2">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <button
                        onClick={() => handleAddToCartClick(product)}
                        disabled={isJustAdded}
                        className={`absolute bottom-6 left-6 right-6 h-14 rounded-2xl font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all flex items-center justify-center gap-2 shadow-2xl ${isJustAdded ? 'bg-lime-400 text-slate-950' : 'bg-white text-slate-950 hover:bg-lime-400'
                          }`}
                      >
                        {isJustAdded ? (
                          <span className="flex items-center gap-2 animate-in fade-in">
                            <CheckCircle2 size={16} /> ADDED!
                          </span>
                        ) : (
                          <>
                            <PlusCircle size={16} /> ADD TO CART
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-1 px-2">
                      <h4 className="text-lg font-black text-slate-950 group-hover:text-blue-600 transition-colors leading-tight">{product.name}</h4>
                      <p className="text-xl font-black text-slate-900">₱{product.price}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={onUpdateCartQuantity}
        onRemove={onRemoveFromCart}
      />
    </>
  );
};

const CartPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemove: (productId: string) => void;
}> = ({ isOpen, onClose, items, onUpdateQuantity, onRemove }) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-[1000]" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <h2 id="slide-over-title" className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Your Cart</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full">
            <X size={24} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <ShoppingBag size={48} className="text-slate-300 mb-6" />
            <h3 className="text-xl font-black text-slate-900">Your bag is empty.</h3>
            <p className="text-slate-500 mt-2">Find some gear to start your journey.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <ul role="list" className="divide-y divide-slate-100 p-8">
              {items.map((item) => (
                <li key={item.id} className="flex py-6">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover object-center" />
                  </div>
                  <div className="ml-4 flex flex-1 flex-col">
                    <div>
                      <div className="flex justify-between text-base font-black text-slate-900">
                        <h3>{item.name}</h3>
                        <p className="ml-4">₱{item.price}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{item.category}</p>
                    </div>
                    <div className="flex flex-1 items-end justify-between text-sm">
                      <div className="flex items-center gap-2 border border-slate-200 rounded-full p-1">
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full"><Minus size={16} /></button>
                        <span className="font-bold text-slate-900 w-6 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full"><Plus size={16} /></button>
                      </div>
                      <div className="flex">
                        <button onClick={() => onRemove(item.id)} type="button" className="font-medium text-red-500 hover:text-red-700 flex items-center gap-1">
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t border-slate-200 p-8 bg-slate-50">
            <div className="flex justify-between text-base font-black text-slate-900">
              <p>Subtotal</p>
              <p>₱{subtotal.toFixed(2)}</p>
            </div>
            <p className="mt-1 text-sm text-slate-500">Shipping and taxes calculated at checkout.</p>
            <div className="mt-6">
              <a href="#" className="flex items-center justify-center rounded-2xl border border-transparent bg-slate-900 px-6 py-5 text-base font-black text-white shadow-sm hover:bg-blue-600 transition-all uppercase tracking-widest">
                Checkout
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
