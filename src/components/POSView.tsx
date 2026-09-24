import React, { useState, useMemo, useEffect } from 'react';
import {
  History,
  User,
  UserPlus,
  Star,
  Plus,
  Minus,
  Trash2,
  Check,
  X,
  CreditCard,
  Wallet,
  Building,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Layers,
  ChevronDown,
  Calendar,
  Search,
  Eye,
  FileText,
  Package,
  Users,
  TrendingUp,
  BarChart3,
  ShoppingBag,
  XCircle,
} from 'lucide-react';
import { Product, Customer, CartItem, PaymentMethod, AppSettings, Sale } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface POSViewProps {
  products: Product[];
  customers: Customer[];
  settings: AppSettings;
  sales?: Sale[];
  onCompleteSale: (saleData: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    items: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      buyPrice: number;
      discount: number;
      total: number;
    }[];
    subtotal: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    costTotal: number;
    profit: number;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    changeAmount: number;
    cashPaid?: number;
    transferPaid?: number;
    customerBalanceDelta?: number;
    notes?: string;
  }) => void;
  onQuickAddCustomer: (customerData: { name: string; phone?: string; address?: string }) => Customer;
  onOpenSalesHistory?: () => void;
  onSelectSaleForReceipt?: (sale: Sale) => void;
  onCancelSale?: (saleId: string) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  customers,
  settings,
  sales = [],
  onCompleteSale,
  onQuickAddCustomer,
  onOpenSalesHistory,
  onSelectSaleForReceipt,
  onCancelSale,
}) => {
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');

  // Favorites State (Stored in localStorage)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pos_favorite_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Default to first available products if none saved
    return products.slice(0, 10).map((p) => p.id);
  });

  const [showManageFavoritesModal, setShowManageFavoritesModal] = useState<boolean>(false);
  const [showSalesHistoryModal, setShowSalesHistoryModal] = useState<boolean>(false);
  const [modalDateFilter, setModalDateFilter] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'last1year' | 'custom' | 'all'>('today');
  const [modalCustomStartDate, setModalCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [modalCustomEndDate, setModalCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [posCustomerSearch, setPosCustomerSearch] = useState<string>('');
  const filteredPosCustomers = useMemo(() => {
    let list = customers;
    if (posCustomerSearch.trim()) {
      const q = posCustomerSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [customers, posCustomerSearch]);

  const modalFilteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const startOf30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    const startOf1Year = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);

    return sales.filter((s) => {
      const saleDate = new Date(s.createdAt);
      if (modalDateFilter === 'today') {
        return saleDate >= startOfToday && saleDate <= endOfToday;
      } else if (modalDateFilter === 'yesterday') {
        return saleDate >= startOfYesterday && saleDate <= endOfYesterday;
      } else if (modalDateFilter === 'last7days') {
        return saleDate >= startOf7Days && saleDate <= endOfToday;
      } else if (modalDateFilter === 'last30days') {
        return saleDate >= startOf30Days && saleDate <= endOfToday;
      } else if (modalDateFilter === 'last1year') {
        return saleDate >= startOf1Year && saleDate <= endOfToday;
      } else if (modalDateFilter === 'custom') {
        if (modalCustomStartDate) {
          const [sy, sm, sd] = modalCustomStartDate.split('-').map(Number);
          const cStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
          if (saleDate < cStart) return false;
        }
        if (modalCustomEndDate) {
          const [ey, em, ed] = modalCustomEndDate.split('-').map(Number);
          const cEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);
          if (saleDate > cEnd) return false;
        }
        return true;
      }
      return true;
    });
  }, [sales, modalDateFilter, modalCustomStartDate, modalCustomEndDate]);

  // Quantity Input Modal State (Ürün seçerken sayıyı el ile yazma)
  const [quantityModalProduct, setQuantityModalProduct] = useState<Product | null>(null);
  const [modalQuantityInput, setModalQuantityInput] = useState<string>('1');

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [mixedCash, setMixedCash] = useState<string>('');
  const [mixedTransfer, setMixedTransfer] = useState<string>('');
  const [applyExcessToAccount, setApplyExcessToAccount] = useState<boolean>(true);
  const [saleNotes, setSaleNotes] = useState<string>('');

  // Bottom Sales History / Invoices Section State (Altta Gösterilen Satış Geçmişi & Faturalar)
  const [posHistoryDateFilter, setPosHistoryDateFilter] = useState<
    'today' | 'yesterday' | 'last7days' | 'last30days' | 'last1year' | 'custom' | 'all'
  >('today');
  const [posHistoryCustomStart, setPosHistoryCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [posHistoryCustomEnd, setPosHistoryCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [posHistorySearch, setPosHistorySearch] = useState<string>('');
  const [posHistoryTab, setPosHistoryTab] = useState<'invoices' | 'customers'>('invoices');

  // Filtered sales for the bottom history section
  const bottomFilteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const startOf30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    const startOf1Year = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);

    return sales.filter((s) => {
      const saleDate = new Date(s.createdAt);
      let matchDate = true;
      if (posHistoryDateFilter === 'today') {
        matchDate = saleDate >= startOfToday && saleDate <= endOfToday;
      } else if (posHistoryDateFilter === 'yesterday') {
        matchDate = saleDate >= startOfYesterday && saleDate <= endOfYesterday;
      } else if (posHistoryDateFilter === 'last7days') {
        matchDate = saleDate >= startOf7Days && saleDate <= endOfToday;
      } else if (posHistoryDateFilter === 'last30days') {
        matchDate = saleDate >= startOf30Days && saleDate <= endOfToday;
      } else if (posHistoryDateFilter === 'last1year') {
        matchDate = saleDate >= startOf1Year && saleDate <= endOfToday;
      } else if (posHistoryDateFilter === 'custom') {
        if (posHistoryCustomStart) {
          const [sy, sm, sd] = posHistoryCustomStart.split('-').map(Number);
          const cStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
          if (saleDate < cStart) matchDate = false;
        }
        if (posHistoryCustomEnd) {
          const [ey, em, ed] = posHistoryCustomEnd.split('-').map(Number);
          const cEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);
          if (saleDate > cEnd) matchDate = false;
        }
      }

      if (!matchDate) return false;

      if (!posHistorySearch.trim()) return true;
      const q = posHistorySearch.toLowerCase().trim();
      return (
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        s.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });
  }, [sales, posHistoryDateFilter, posHistoryCustomStart, posHistoryCustomEnd, posHistorySearch]);

  const bottomTotalAmount = useMemo(
    () => bottomFilteredSales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.total, 0),
    [bottomFilteredSales]
  );
  const bottomTotalProfit = useMemo(
    () => bottomFilteredSales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.profit, 0),
    [bottomFilteredSales]
  );
  // Satılan Ürün Adet Sayısı
  const bottomTotalItemCount = useMemo(
    () =>
      bottomFilteredSales
        .filter((s) => s.status === 'completed')
        .reduce((sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0), 0),
    [bottomFilteredSales]
  );
  const bottomCompletedCount = useMemo(
    () => bottomFilteredSales.filter((s) => s.status === 'completed').length,
    [bottomFilteredSales]
  );

  // Müşteri Bazında Alınan Ürün Adetleri (Hangi Müşteri Kaç Tane Almış)
  const bottomCustomerPurchases = useMemo(() => {
    const map = new Map<
      string,
      {
        customerId?: string;
        customerName: string;
        customerPhone?: string;
        totalQuantity: number;
        totalAmount: number;
        invoiceCount: number;
        itemsMap: Map<string, { productName: string; quantity: number; unitPrice: number; total: number }>;
      }
    >();

    bottomFilteredSales
      .filter((s) => s.status === 'completed')
      .forEach((sale) => {
        const key = sale.customerId || sale.customerName || 'Genel Müşteri';
        const existing = map.get(key) || {
          customerId: sale.customerId,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          totalQuantity: 0,
          totalAmount: 0,
          invoiceCount: 0,
          itemsMap: new Map(),
        };

        existing.invoiceCount += 1;

        sale.items.forEach((item) => {
          existing.totalQuantity += item.quantity;
          existing.totalAmount += item.total;
          const currentItem = existing.itemsMap.get(item.productName) || {
            productName: item.productName,
            quantity: 0,
            unitPrice: item.unitPrice,
            total: 0,
          };
          currentItem.quantity += item.quantity;
          currentItem.total += item.total;
          existing.itemsMap.set(item.productName, currentItem);
        });

        map.set(key, existing);
      });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [bottomFilteredSales]);

  // Save favorites to localStorage
  const saveFavorites = (newIds: string[]) => {
    setFavoriteIds(newIds);
    try {
      localStorage.setItem('pos_favorite_ids', JSON.stringify(newIds));
    } catch (e) {}
  };

  const toggleFavorite = (productId: string) => {
    const next = favoriteIds.includes(productId)
      ? favoriteIds.filter((id) => id !== productId)
      : [...favoriteIds, productId];
    saveFavorites(next);
  };

  // Selected Customer details
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  // Favorite Products list
  const favoriteProducts = useMemo(() => {
    return products.filter((p) => favoriteIds.includes(p.id));
  }, [products, favoriteIds]);

  // Cart operations
  const addToCart = (product: Product, quantityDelta = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantityDelta;
        if (newQty <= 0) {
          return prev.filter((item) => item.product.id !== product.id);
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: newQty,
                total: Number((newQty * item.unitPrice).toFixed(2)),
              }
            : item
        );
      } else {
        if (quantityDelta <= 0) return prev;
        return [
          ...prev,
          {
            product,
            quantity: quantityDelta,
            unitPrice: product.sellPrice,
            discount: 0,
            total: Number((quantityDelta * product.sellPrice).toFixed(2)),
          },
        ];
      }
    });
  };

  const updateItemQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? {
              ...i,
              quantity: newQty,
              total: Number((newQty * i.unitPrice).toFixed(2)),
            }
          : i
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const resetPosScreen = () => {
    setCart([]);
    setSelectedCustomerId('');
    setPosCustomerSearch('');
    setQuantityModalProduct(null);
    setModalQuantityInput('1');
    setPaymentMethod('cash');
    setCashGiven('');
    setMixedCash('');
    setMixedTransfer('');
    setSaleNotes('');
    setNewCustName('');
    setNewCustPhone('');
    setShowPaymentModal(false);
    setShowAddCustomerModal(false);
  };

  const clearCart = () => {
    resetPosScreen();
  };

  // Open Quantity Modal for manual typing
  const handleSelectProductForQuantity = (product: Product) => {
    const existing = cart.find((i) => i.product.id === product.id);
    setModalQuantityInput(existing ? existing.quantity.toString() : '1');
    setQuantityModalProduct(product);
  };

  // Confirm manual quantity
  const handleConfirmQuantityModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantityModalProduct) return;
    const qty = parseFloat(modalQuantityInput);
    if (isNaN(qty) || qty <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === quantityModalProduct.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === quantityModalProduct.id
            ? {
                ...item,
                quantity: qty,
                total: Number((qty * item.unitPrice).toFixed(2)),
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product: quantityModalProduct,
            quantity: qty,
            unitPrice: quantityModalProduct.sellPrice,
            discount: 0,
            total: Number((qty * quantityModalProduct.sellPrice).toFixed(2)),
          },
        ];
      }
    });

    setQuantityModalProduct(null);
  };

  // Calculations
  const totalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.total, 0),
    [cart]
  );

  const costTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.product.buyPrice, 0),
    [cart]
  );

  const profit = Math.max(0, totalAmount - costTotal);
  const taxRate = 0;
  const taxAmount = 0;

  // Prepare payment modal
  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setPaymentMethod('cash');
    setCashGiven(totalAmount.toString());
    const half = (totalAmount / 2).toFixed(2);
    setMixedCash(half);
    setMixedTransfer((totalAmount - Number(half)).toFixed(2));
    setApplyExcessToAccount(true);
    setSaleNotes('');
    setShowPaymentModal(true);
  };

  // Execute sale
  const handleFinalizeSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    let paidAmount = 0;
    let changeAmount = 0;
    let cashPaid = 0;
    let transferPaid = 0;
    let customerBalanceDelta = 0;

    if (paymentMethod === 'cash') {
      const given = parseFloat(cashGiven) || 0;
      if (given >= totalAmount) {
        paidAmount = totalAmount;
        const excess = Number((given - totalAmount).toFixed(2));
        if (selectedCustomer && excess > 0 && applyExcessToAccount) {
          customerBalanceDelta = -excess; // credit/advance
          changeAmount = 0;
        } else {
          changeAmount = excess;
        }
      } else {
        paidAmount = given;
        changeAmount = 0;
        const unpaid = Number((totalAmount - given).toFixed(2));
        customerBalanceDelta = unpaid; // added to debt
      }
    } else if (paymentMethod === 'mixed') {
      cashPaid = parseFloat(mixedCash) || 0;
      transferPaid = parseFloat(mixedTransfer) || 0;
      const sum = Number((cashPaid + transferPaid).toFixed(2));
      paidAmount = sum;

      if (sum < totalAmount) {
        customerBalanceDelta = Number((totalAmount - sum).toFixed(2));
      } else if (sum > totalAmount) {
        const excess = Number((sum - totalAmount).toFixed(2));
        if (selectedCustomer && applyExcessToAccount) {
          customerBalanceDelta = -excess;
        } else {
          changeAmount = excess;
        }
      }
    } else if (paymentMethod === 'credit') {
      paidAmount = 0;
      changeAmount = 0;
      customerBalanceDelta = totalAmount;
    } else if (paymentMethod === 'transfer') {
      paidAmount = totalAmount;
      changeAmount = 0;
    }

    onCompleteSale({
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomer ? selectedCustomer.name : 'Genel Müşteri',
      customerPhone: selectedCustomer?.phone,
      items: cart.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        buyPrice: i.product.buyPrice,
        discount: i.discount,
        total: i.total,
      })),
      subtotal: totalAmount,
      discount: 0,
      taxRate,
      taxAmount,
      total: totalAmount,
      costTotal,
      profit,
      paymentMethod,
      paidAmount,
      changeAmount,
      cashPaid: paymentMethod === 'mixed' ? cashPaid : undefined,
      transferPaid: paymentMethod === 'mixed' ? transferPaid : undefined,
      customerBalanceDelta,
      notes: saleNotes.trim() || undefined,
    });

    // Satış tamamlandığında tüm satış ekranını temizle
    resetPosScreen();
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = onQuickAddCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || undefined,
    });
    setSelectedCustomerId(created.id);
    setNewCustName('');
    setNewCustPhone('');
    setShowAddCustomerModal(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* 1. TOP BAR: TITLE & TOP-CORNER SATIŞ GEÇMİŞİ BUTTON */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Satış Yap</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Hızlı perakende satış ekranı
          </p>
        </div>

        {/* Üst Köşede Satış Geçmişi Tuşu */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('pos-sales-history');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else if (onOpenSalesHistory) {
              onOpenSalesHistory();
            }
          }}
          className="h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 shadow-xs"
          title="Alttaki Satış Geçmişi ve Faturalara Git"
        >
          <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Satış Geçmişi</span>
        </button>
      </div>

      {/* 2. MÜŞTERİ SEÇME BÖLÜMÜ */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Müşteri Seçimi</span>
          </label>

          <button
            type="button"
            onClick={() => setShowAddCustomerModal(true)}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Yeni Müşteri</span>
          </button>
        </div>

        {/* Müşteri Arama (En Üstte) */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={posCustomerSearch}
            onChange={(e) => setPosCustomerSearch(e.target.value)}
            placeholder="Müşteri ara (isim veya telefon ile)..."
            className="w-full h-9 pl-8 pr-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
          {posCustomerSearch && (
            <button
              type="button"
              onClick={() => setPosCustomerSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold px-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          )}
        </div>

        {/* Müşteri İsimleri (Arama Alanının Hemen Altında) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-0.5">
            <span>Müşteri İsimleri:</span>
            {filteredPosCustomers.length > 0 && (
              <span>{filteredPosCustomers.length} müşteri</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setSelectedCustomerId('');
                setPosCustomerSearch('');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !selectedCustomerId
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Genel Müşteri
            </button>
            {filteredPosCustomers.map((c) => {
              const isSelected = selectedCustomerId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600'
                  }`}
                >
                  <span>{c.name}</span>
                  {c.balance > 0 && (
                    <span
                      className={`text-[10px] px-1 py-0.5 rounded font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {formatCurrency(c.balance)}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredPosCustomers.length === 0 && (
              <span className="text-xs text-slate-400 italic py-1 px-2">Eşleşen müşteri bulunamadı</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full h-11 px-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
            >
              <option value="">Genel Müşteri (Anonim)</option>
              {filteredPosCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} - {c.balance > 0 ? `Borç: ${formatCurrency(c.balance)}` : c.balance < 0 ? `Alacak: ${formatCurrency(Math.abs(c.balance))}` : 'Borçsuz'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {selectedCustomerId && (
            <button
              type="button"
              onClick={() => {
                setSelectedCustomerId('');
                setPosCustomerSearch('');
              }}
              className="h-11 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-semibold transition-colors"
              title="Genel Müşteriye Dön"
            >
              Sıfırla
            </button>
          )}
        </div>

        {/* Selected Customer Status Chip */}
        {selectedCustomer && (
          <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {selectedCustomer.name}
            </span>
            <span
              className={`font-bold tabular-nums px-2 py-0.5 rounded text-[10px] ${
                selectedCustomer.balance > 0
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                  : selectedCustomer.balance < 0
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {selectedCustomer.balance > 0
                ? `Mevcut Borç: ${formatCurrency(selectedCustomer.balance)}`
                : selectedCustomer.balance < 0
                ? `Alacak / Avans: ${formatCurrency(Math.abs(selectedCustomer.balance))}`
                : 'Borçsuz'}
            </span>
          </div>
        )}
      </div>

      {/* 3. FAVORİLERE EKLENEN ÜRÜN İSİMLERİ */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Favori Ürünler</span>
          </label>

          <button
            type="button"
            onClick={() => setShowManageFavoritesModal(true)}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Yönet / Ekle</span>
          </button>
        </div>

        {favoriteProducts.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Star className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Henüz favorilere eklenmiş ürün bulunmuyor.
            </p>
            <button
              type="button"
              onClick={() => setShowManageFavoritesModal(true)}
              className="mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
            >
              Favori Ürünleri Seç
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {favoriteProducts.map((prod) => {
              const inCart = cart.find((i) => i.product.id === prod.id);

              return (
                <div
                  key={prod.id}
                  onClick={() => handleSelectProductForQuantity(prod)}
                  className={`p-3 rounded-xl border text-left transition-all active:scale-98 flex flex-col justify-between min-h-[76px] relative group cursor-pointer ${
                    inCart
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700'
                  }`}
                  role="button"
                  tabIndex={0}
                  title="Tıklayarak adet sayısını el ile yazın"
                >
                  {/* In-cart count badge */}
                  {inCart && (
                    <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[10px] font-black px-1.5 h-5 rounded-full flex items-center justify-center shadow">
                      {inCart.quantity} {prod.unit || 'ad'}
                    </span>
                  )}

                  <div className="pr-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                      {prod.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(prod.sellPrice)}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                        Adet Yaz
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(prod, 1);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors"
                        title="+1 Hızlı Ekle"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SEÇİLEN ÜRÜNLER LİSTESİ (SEPET ÖZETİ) */}
      {cart.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Satış Kalemleri ({cart.length})
            </span>
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition-colors"
            >
              Listeyi Temizle
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="py-2.5 flex items-center justify-between gap-2"
              >
                <div
                  className="min-w-0 flex-1 cursor-pointer group"
                  onClick={() => handleSelectProductForQuantity(item.product)}
                  title="Miktarı el ile değiştirmek için tıklayın"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate group-hover:text-emerald-600 transition-colors">
                    {item.product.name}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {formatCurrency(item.unitPrice)} / {item.product.unit || 'adet'}
                  </span>
                </div>

                {/* Inline Quantity Stepper with Manual Input */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => addToCart(item.product, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                      title="-1 Azalt"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="1"
                      value={item.quantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0) {
                          updateItemQuantity(item.product.id, val);
                        }
                      }}
                      className="w-14 h-6 text-center text-xs font-extrabold bg-transparent text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded"
                      title="Sayıyı el ile yazabilirsiniz"
                    />

                    <button
                      type="button"
                      onClick={() => addToCart(item.product, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                      title="+1 Artır"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono min-w-[65px] text-right">
                    {formatCurrency(item.total)}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TOPLAM TUTAR & ÖDEME AL TUŞU (BAŞKA HİÇBİR ŞEY YOK) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Toplam Tutar
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums leading-tight">
            {formatCurrency(totalAmount)}
          </div>
        </div>

        <button
          type="button"
          disabled={cart.length === 0}
          onClick={openPaymentModal}
          className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
        >
          <span>Ödeme Al</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 6. SATIŞ GEÇMİŞİ VE FATURALAR BÖLÜMÜ (ALTA EKLENDİ) */}
      <div id="pos-sales-history" className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 pt-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Satış Geçmişi & Faturalar</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  {bottomCompletedCount} Fatura
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tamamlanan satışlar, satılan ürün adetleri ve müşteri bazında ürün dökümü
              </p>
            </div>
          </div>

          {/* Sub-tab selection: Faturalar vs Müşteri Bazında Alınan Ürünler */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPosHistoryTab('invoices')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                posHistoryTab === 'invoices'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Faturalar ({bottomFilteredSales.length})
            </button>
            <button
              type="button"
              onClick={() => setPosHistoryTab('customers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                posHistoryTab === 'customers'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Müşteri Ürün Dağılımı ({bottomCustomerPurchases.length})</span>
            </button>
          </div>
        </div>

        {/* Tarih Filtresi Butonları */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: 'today', label: 'Bugün' },
              { id: 'yesterday', label: 'Dün' },
              { id: 'last7days', label: 'Son 7 Gün' },
              { id: 'last30days', label: 'Son 30 Gün' },
              { id: 'last1year', label: 'Son 1 Yıl' },
              { id: 'custom', label: 'Özel Aralık' },
              { id: 'all', label: 'Tümü' },
            ].map((btn) => {
              const isSelected = posHistoryDateFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setPosHistoryDateFilter(btn.id as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/25'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {posHistoryDateFilter === 'custom' && (
            <div className="grid grid-cols-2 gap-2 pt-1 pb-1">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Başlangıç</label>
                <input
                  type="date"
                  value={posHistoryCustomStart}
                  onChange={(e) => setPosHistoryCustomStart(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Bitiş</label>
                <input
                  type="date"
                  value={posHistoryCustomEnd}
                  onChange={(e) => setPosHistoryCustomEnd(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rapor Özet Kartları: Satılan Ürün Adet Sayısı ve Ciro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Satılan Ürün Adet Sayısı */}
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Satılan Ürün</span>
              <Package className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-emerald-800 dark:text-emerald-300 font-mono tabular-nums">
              {bottomTotalItemCount} Adet
            </div>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
              Toplam satılan adet
            </span>
          </div>

          {/* Fatura Sayısı */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">İşlem / Fatura</span>
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {bottomCompletedCount}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Tamamlanan satış
            </span>
          </div>

          {/* Toplam Ciro */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Toplam Ciro</span>
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tabular-nums truncate">
              {formatCurrency(bottomTotalAmount)}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Dönem hasılatı
            </span>
          </div>

          {/* Toplam Kâr */}
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Toplam Kâr</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-base sm:text-lg font-black text-indigo-800 dark:text-indigo-300 font-mono tabular-nums truncate">
              +{formatCurrency(bottomTotalProfit)}
            </div>
            <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-medium">
              Net kâr tutarı
            </span>
          </div>
        </div>

        {/* Arama Çubuğu */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={posHistorySearch}
            onChange={(e) => setPosHistorySearch(e.target.value)}
            placeholder="Fatura No, Müşteri Adı veya ürün ile ara..."
            className="w-full h-9 pl-8 pr-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
          {posHistorySearch && (
            <button
              type="button"
              onClick={() => setPosHistorySearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold px-1 rounded"
            >
              ✕
            </button>
          )}
        </div>

        {/* TAB 1: FATURALAR & MAKBUZLAR */}
        {posHistoryTab === 'invoices' && (
          <div className="space-y-2">
            {bottomFilteredSales.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <FileText className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Seçili zaman aralığında kayıtlı satış faturası bulunamadı.
                </p>
                <button
                  type="button"
                  onClick={() => setPosHistoryDateFilter('all')}
                  className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                >
                  Tüm Satışları Göster
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto pr-1">
                {bottomFilteredSales.map((sale) => {
                  const isCancelled = sale.status === 'cancelled';
                  const saleItemCount = sale.items.reduce((sum, i) => sum + i.quantity, 0);

                  return (
                    <div
                      key={sale.id}
                      className={`py-3 px-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isCancelled
                          ? 'opacity-50 bg-rose-50/20 dark:bg-rose-950/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
                            {sale.invoiceNo}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            · {sale.customerName}
                          </span>
                          {/* Satılan ürün adet sayısı etiketi */}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono">
                            {saleItemCount} Adet Ürün
                          </span>
                          {isCancelled && (
                            <span className="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                              İptal
                            </span>
                          )}
                        </div>

                        {/* Satılan ürünler ve adetleri listesi */}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {sale.items.map((i) => `${i.productName} (${i.quantity} adet)`).join(', ')}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <span>{formatDateTime(sale.createdAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize font-semibold text-slate-600 dark:text-slate-300">
                            {sale.paymentMethod === 'cash'
                              ? 'Nakit'
                              : sale.paymentMethod === 'mixed'
                              ? 'Karışık'
                              : sale.paymentMethod === 'credit'
                              ? 'Veresiye'
                              : sale.paymentMethod === 'transfer'
                              ? 'Havale'
                              : 'Kart'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tabular-nums block">
                            {formatCurrency(sale.total)}
                          </span>
                          {!isCancelled && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                              +{formatCurrency(sale.profit)} kâr
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onSelectSaleForReceipt && (
                            <button
                              type="button"
                              onClick={() => onSelectSaleForReceipt(sale)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Fişi / Faturayı Görüntüle"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Fiş</span>
                            </button>
                          )}
                          {!isCancelled && onCancelSale && (
                            <button
                              type="button"
                              onClick={() => onCancelSale(sale.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Satışı İptal Et & İade Al"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MÜŞTERİ BAZINDA ALINAN ÜRÜN ADETLERİ (HANGİ MÜŞTERİ KAÇ TANE ALMIŞ) */}
        {posHistoryTab === 'customers' && (
          <div className="space-y-2.5">
            {bottomCustomerPurchases.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Users className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Seçili dönemde müşteri bazlı ürün alımı bulunamadı.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {bottomCustomerPurchases.map((cust, idx) => {
                  const itemsList = Array.from(cust.itemsMap.values());

                  return (
                    <div
                      key={cust.customerId || cust.customerName + idx}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {cust.customerName}
                          </h4>
                          {cust.customerPhone && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {cust.customerPhone}
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {/* Hangi müşteri kaç tane almış: belirgin badge */}
                          <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black font-mono shadow-xs">
                            Toplam {cust.totalQuantity} Adet Aldı
                          </span>
                          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                            Tutar: {formatCurrency(cust.totalAmount)}
                          </div>
                        </div>
                      </div>

                      {/* Müşterinin aldığı ürünlerin tek tek dökümü */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Aldığı Ürünler ve Adetleri:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {itemsList.map((item, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center gap-1.5"
                            >
                              <span>{item.productName}</span>
                              <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                                ({item.quantity} adet)
                              </strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 0: ÜRÜN SEÇERKEN SAYI / ADET EL İLE YAZMA */}
      {quantityModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Adet / Miktar Belirle
              </h3>
              <button
                type="button"
                onClick={() => setQuantityModalProduct(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuantityModal} className="mt-4 space-y-4">
              <div className="text-center">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {quantityModalProduct.category}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {quantityModalProduct.name}
                </h4>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono mt-0.5">
                  Birim Fiyat: {formatCurrency(quantityModalProduct.sellPrice)} / {quantityModalProduct.unit || 'adet'}
                </div>
              </div>

              {/* Büyük El İle Sayı Yazma Girişi */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block text-center mb-1.5 uppercase tracking-wide">
                  Sayıyı El İle Yazın
                </label>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(modalQuantityInput) || 1;
                      if (cur > 1) {
                        setModalQuantityInput((cur - 1).toString());
                      }
                    }}
                    className="w-12 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center text-xl font-bold transition-colors active:scale-95 border border-slate-200 dark:border-slate-700"
                  >
                    -
                  </button>

                  <div className="flex-1 max-w-[160px]">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0.01"
                      autoFocus
                      required
                      value={modalQuantityInput}
                      onChange={(e) => setModalQuantityInput(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Adet"
                      className="w-full h-14 text-center text-2xl font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 tabular-nums shadow-inner"
                    />
                    <span className="text-[10px] text-slate-400 block text-center mt-1">
                      {quantityModalProduct.unit || 'Adet'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(modalQuantityInput) || 0;
                      setModalQuantityInput((cur + 1).toString());
                    }}
                    className="w-12 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center text-xl font-bold transition-colors active:scale-95 border border-slate-200 dark:border-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Hızlı Adet Butonları */}
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block text-center mb-1">
                  Hızlı Butonlar
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[10, 15, 25, 30, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setModalQuantityInput(num.toString())}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors active:scale-95 ${
                        parseFloat(modalQuantityInput) === num
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hesaplanan Toplam */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Toplam Tutar:
                </span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {formatCurrency((parseFloat(modalQuantityInput) || 0) * quantityModalProduct.sellPrice)}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setQuantityModalProduct(null)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
                >
                  Sepete Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: FAVORİLERİ YÖNET / SEÇ */}
      {showManageFavoritesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Favori Ürünleri Belirle
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManageFavoritesModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Satış ekranında görünmesini istediğiniz ürünleri yıldızlayarak favorilere ekleyin:
            </p>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 my-3 pr-1">
              {products.map((p) => {
                const isFav = favoriteIds.includes(p.id);

                return (
                  <div
                    key={p.id}
                    onClick={() => toggleFavorite(p.id)}
                    className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatCurrency(p.sellPrice)} · {p.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isFav
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowManageFavoritesModal(false)}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
            >
              Tamamla ({favoriteIds.length} Seçildi)
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: HIZLI MÜŞTERİ EKLE */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Yeni Müşteri Ekle
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Müşteri Adı Soyadı *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Telefon Numarası <span className="text-slate-400 font-normal">(İsteğe Bağlı)</span>
                </label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0532 123 45 67 (İsteğe bağlı)"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Kaydet & Seç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INLINE SATIŞ GEÇMİŞİ MODALI */}
      {showSalesHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Satış Geçmişi & Faturalar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSalesHistoryModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Üst Sırada Tarih Filtre Tuşları */}
            <div className="pt-3 pb-2 space-y-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {[
                  { id: 'today', label: 'Bugün' },
                  { id: 'yesterday', label: 'Dün' },
                  { id: 'last7days', label: 'Son 7 gün' },
                  { id: 'last30days', label: 'Son 30 gün' },
                  { id: 'last1year', label: 'Son 1 yıl' },
                  { id: 'custom', label: 'Özel aralık' },
                  { id: 'all', label: 'Tümü' },
                ].map((btn) => {
                  const isSelected = modalDateFilter === btn.id;
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setModalDateFilter(btn.id as any)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>

              {modalDateFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                      Başlangıç
                    </label>
                    <input
                      type="date"
                      value={modalCustomStartDate}
                      onChange={(e) => setModalCustomStartDate(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                      Bitiş
                    </label>
                    <input
                      type="date"
                      value={modalCustomEndDate}
                      onChange={(e) => setModalCustomEndDate(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 my-2">
              {modalFilteredSales.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    Seçili zaman aralığında satış bulunamadı.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalDateFilter('all')}
                    className="text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    Tüm Satışları Göster
                  </button>
                </div>
              ) : (
                modalFilteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => {
                      if (onSelectSaleForReceipt) onSelectSaleForReceipt(sale);
                    }}
                    className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {sale.customerName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {sale.invoiceNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>{formatDateTime(sale.createdAt)}</span>
                        <span>·</span>
                        <span className="capitalize">
                          {sale.paymentMethod === 'mixed'
                            ? 'Karışık'
                            : sale.paymentMethod === 'credit'
                            ? 'Veresiye'
                            : sale.paymentMethod === 'transfer'
                            ? 'Havale'
                            : 'Nakit'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums block">
                        {formatCurrency(sale.total)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold tabular-nums">
                        +{formatCurrency(sale.profit)} kâr
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowSalesHistoryModal(false)}
              className="w-full h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: ÖDEME AL (NAKİT / KARIŞIK / VERESİYE / HAVALE) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Ödeme Al ve Satışı Tamamla
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCustomer ? selectedCustomer.name : 'Genel Müşteri'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFinalizeSale} className="mt-4 space-y-4">
              {/* Grand Total banner */}
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Ödenecek Tutar:
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Ödeme Yöntemi
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'cash', label: 'Nakit' },
                    { id: 'mixed', label: 'Karışık' },
                    { id: 'credit', label: 'Veresiye' },
                    { id: 'transfer', label: 'Havale' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        paymentMethod === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Method Specific Inputs */}
              {paymentMethod === 'cash' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Alınan Nakit (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-base font-black tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  {/* Cash difference calculation */}
                  {(() => {
                    const given = parseFloat(cashGiven) || 0;
                    const diff = Number((given - totalAmount).toFixed(2));

                    if (diff > 0) {
                      return (
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
                          <span>Para Üstü: <strong>{formatCurrency(diff)}</strong></span>
                          {selectedCustomer && (
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={applyExcessToAccount}
                                onChange={(e) => setApplyExcessToAccount(e.target.checked)}
                                className="rounded text-emerald-600"
                              />
                              <span>Hesabına avans yaz</span>
                            </label>
                          )}
                        </div>
                      );
                    } else if (diff < 0) {
                      return (
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
                          <span>Eksik Tutar: <strong>{formatCurrency(Math.abs(diff))}</strong></span>
                          <span>Müşteri borcuna eklenecek</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {paymentMethod === 'mixed' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        💵 Nakit Alınan (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={mixedCash}
                        onChange={(e) => setMixedCash(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        🏦 Havale / EFT (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={mixedTransfer}
                        onChange={(e) => setMixedTransfer(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const half = (totalAmount / 2).toFixed(2);
                        setMixedCash(half);
                        setMixedTransfer((totalAmount - Number(half)).toFixed(2));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                    >
                      50/50 Eşit Böl
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cash = parseFloat(mixedCash) || 0;
                        setMixedTransfer(Math.max(0, totalAmount - cash).toFixed(2));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                    >
                      Kalanı Havale Yap
                    </button>
                  </div>
                </div>
              )}

              {paymentMethod === 'credit' && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  Tutarın tamamı ({formatCurrency(totalAmount)}) müşterinin açık hesap veresiye borcuna kaydedilecektir.
                </div>
              )}

              {/* Note */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Satış Notu (İsteğe bağlı)
                </label>
                <input
                  type="text"
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  placeholder="Not ekleyin..."
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
                >
                  Satışı Tamamla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
