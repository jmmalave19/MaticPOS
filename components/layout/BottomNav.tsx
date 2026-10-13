import { ShoppingBag, Layers, PlusCircle, BarChart3, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export type AppModule = 'pos' | 'inventory' | 'add-product' | 'reports' | 'settings';

interface BottomNavProps {
  activeModule?: AppModule;
  onSelectModule?: (module: AppModule) => void;
  cartCount: number;
  lowStockCount: number;
  isDayOpen: boolean;
}

export function BottomNav({
  activeModule: propActiveModule,
  onSelectModule,
  cartCount,
  lowStockCount,
  isDayOpen,
}: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveModule = (): AppModule => {
    if (propActiveModule) return propActiveModule;
    const path = location.pathname;
    if (path.startsWith('/inventario')) return 'inventory';
    if (path.startsWith('/agregar-producto')) return 'add-product';
    if (path.startsWith('/reportes')) return 'reports';
    if (path.startsWith('/ajustes')) return 'settings';
    return 'pos';
  };

  const activeModule = getActiveModule();

  const handleNav = (mod: AppModule) => {
    if (onSelectModule) {
      onSelectModule(mod);
    }
    const routes: Record<AppModule, string> = {
      pos: '/pos',
      inventory: '/inventario',
      'add-product': '/agregar-producto',
      reports: '/reportes',
      settings: '/ajustes',
    };
    navigate(routes[mod]);
  };

  const navItems = [
    {
      id: 'inventory' as AppModule,
      label: 'Inventario',
      icon: Layers,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'add-product' as AppModule,
      label: 'Producto',
      icon: PlusCircle,
      badge: null,
    },
    {
      id: 'pos' as AppModule,
      label: 'POS',
      icon: ShoppingBag,
      badge: cartCount > 0 ? cartCount : null,
      badgeColor: 'bg-emerald-400 text-slate-950 font-black',
    },
    {
      id: 'reports' as AppModule,
      label: 'Reportes',
      icon: BarChart3,
      badge: isDayOpen ? 'dot' : null,
      badgeColor: 'bg-emerald-400',
    },
    {
      id: 'settings' as AppModule,
      label: 'Ajustes',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto pointer-events-none">
      <nav className="pointer-events-auto relative bg-[#13151c]/95 backdrop-blur-2xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl px-3 py-2 flex items-center justify-around transition-all duration-300">
        {navItems.map((item) => {
          const isActive = activeModule === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 relative group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 -translate-y-1.5'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 group-active:scale-95 ${isActive ? 'text-white stroke-[2.4]' : 'text-slate-400'}`} />
                {item.badge !== null && item.badge !== 'dot' && (
                  <span className={`absolute -top-1.5 -right-2.5 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#13151c] shadow-sm animate-pulse ${item.badgeColor || 'bg-amber-500 text-white'}`}>
                    {item.badge}
                  </span>
                )}
                {item.badge === 'dot' && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#13151c] animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-bold text-white' : 'font-medium text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
