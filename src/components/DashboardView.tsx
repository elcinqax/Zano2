import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  ArrowUpRight,
  FileSpreadsheet,
  Download,
  Layers,
  Wallet,
  Clock,
  Plus,
  ShoppingCart,
  ChevronRight,
} from 'lucide-react';
import { Sale, Customer, Product, AppSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { exportToExcel, exportSalesToCSV } from '../utils/export-utils';

interface DashboardViewProps {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  settings: AppSettings;
  onNavigateTab: (tab: string) => void;
  onSelectSaleForReceipt: (sale: Sale) => void;
  onOpenAddProduct: () => void;
  onOpenAddCustomer: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  customers,
  products,
  settings,
  onNavigateTab,
  onSelectSaleForReceipt,
  onOpenAddProduct,
  onOpenAddCustomer,
}) => {
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'month' | 'all'>('month');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'profit'>('revenue');

  // Filter sales by selected time range
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      if (s.status === 'cancelled') return false;
      const saleDate = new Date(s.createdAt);

      if (timeRange === 'today') {
        return saleDate.toDateString() === now.toDateString();
      }
      if (timeRange === '7days') {
        const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (timeRange === 'month') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [sales, timeRange]);

  // Aggregate metrics
  const totalRevenue = useMemo(() => filteredSales.reduce((acc, s) => acc + s.total, 0), [filteredSales]);
  const totalCost = useMemo(() => filteredSales.reduce((acc, s) => acc + s.costTotal, 0), [filteredSales]);
  const totalProfit = useMemo(() => filteredSales.reduce((acc, s) => acc + s.profit, 0), [filteredSales]);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Receivables (Veresiye)
  const totalDebtReceivables = useMemo(
    () => customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0),
    [customers]
  );
  const debtorCount = customers.filter((c) => c.balance > 0).length;

  // Inventory value & critical items
  const inventoryCostValue = useMemo(
    () => products.reduce((sum, p) => sum + p.stock * p.buyPrice, 0),
    [products]
  );
  const lowStockItems = useMemo(
    () => products.filter((p) => p.stock <= p.minStock),
    [products]
  );

  // Top Selling Products
  const topProducts = useMemo(() => {
    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const sale of filteredSales) {
      for (const item of sale.items) {
        if (!productStats[item.productId]) {
          productStats[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].revenue += item.total;
      }
    }
    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  const maxProductRevenue = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.revenue), 1) : 1;

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = { cash: 0, mixed: 0, credit: 0, transfer: 0 };
    filteredSales.forEach((s) => {
      const key = s.paymentMethod === 'card' ? 'mixed' : s.paymentMethod;
      breakdown[key] = (breakdown[key] || 0) + s.total;
    });
    return breakdown;
  }, [filteredSales]);

  // Chart Daily Data (Last 7 days or points)
  const chartDays = useMemo(() => {
    const days: { label: string; revenue: number; profit: number; count: number }[] = [];
    const count = timeRange === 'today' ? 6 : 7;

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      if (timeRange === 'today') {
        // Break by 4-hour slots
        d.setHours(d.getHours() - i * 4);
        const label = `${d.getHours()}:00`;
        const slotSales = sales.filter((s) => {
          if (s.status === 'cancelled') return false;
          const sd = new Date(s.createdAt);
          return Math.abs(sd.getTime() - d.getTime()) <= 2 * 3600 * 1000;
        });
        const rev = slotSales.reduce((a, b) => a + b.total, 0);
        const pr = slotSales.reduce((a, b) => a + b.profit, 0);
        days.push({ label, revenue: rev, profit: pr, count: slotSales.length });
      } else {
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' });
        const daySales = sales.filter(
          (s) => s.status !== 'cancelled' && s.createdAt.slice(0, 10) === dateStr
        );
        const rev = daySales.reduce((a, b) => a + b.total, 0);
        const pr = daySales.reduce((a, b) => a + b.profit, 0);
        days.push({ label: dayLabel, revenue: rev, profit: pr, count: daySales.length });
      }
    }
    return days;
  }, [sales, timeRange]);

  const maxChartValue = Math.max(...chartDays.map((d) => (chartMetric === 'revenue' ? d.revenue : d.profit)), 100);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Satış ve Finansal Dashboard
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>SQLite Yerel Veritabanı</span>
            <span aria-hidden="true">·</span>
            <span>%100 Çevrimdışı (Offline)</span>
            <span aria-hidden="true">·</span>
            <span>Güncel</span>
          </div>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          {(
            [
              { id: 'today', label: 'Bugün' },
              { id: '7days', label: 'Son 7 Gün' },
              { id: 'month', label: 'Bu Ay' },
              { id: 'all', label: 'Tümü' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeRange(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                timeRange === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Critical Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">
                {lowStockItems.length} Üründe Kritik Stok Uyarısı!
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                {lowStockItems.slice(0, 2).map((i) => i.name).join(', ')}
                {lowStockItems.length > 2 ? ` ve ${lowStockItems.length - 2} diğer ürün...` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('products')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-sm"
          >
            Stokları Gör
          </button>
        </div>
      )}

      {/* Primary KPI Grid (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {timeRange === 'today'
                ? 'Bugünkü Ciro'
                : timeRange === '7days'
                ? '7 Günlük Ciro'
                : timeRange === 'month'
                ? 'Aylık Ciro'
                : 'Toplam Ciro'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {filteredSales.length}
              </span>
              <span>satış işlemi</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Net Profit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Net Brüt Kâr
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 tabular-nums">
              {formatCurrency(totalProfit)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Marj:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                %{profitMargin.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Receivables (Veresiye) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Bekleyen Veresiye
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {formatCurrency(totalDebtReceivables)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {debtorCount}
              </span>
              <span>borçlu müşteri</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Inventory Value */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Stok Maliyet Değeri
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(inventoryCostValue)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                {products.length}
              </span>
              <span>çeşit ürün</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Export Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-emerald-950/5 dark:bg-emerald-950/20 border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('pos')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Hızlı Satış Yap</span>
          </button>
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ürün Ekle</span>
          </button>
          <button
            type="button"
            onClick={onOpenAddCustomer}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Müşteri Ekle</span>
          </button>
        </div>

        {/* Excel & CSV Direct Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportToExcel(sales, customers, products, settings.storeName)}
            className="px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Tüm verileri çok sekmeli Excel (.xlsx) olarak indir"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel (.xlsx) İndir</span>
          </button>
          <button
            type="button"
            onClick={() => exportSalesToCSV(filteredSales)}
            className="px-3 py-2 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Filtreli satışları CSV olarak indir"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Sales & Profit Trend (2 columns on large) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Satış & Kâr Performans Trendi
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Dönemsel karşılaştırma ve kâr marjı takibi
              </p>
            </div>

            {/* Toggle metric */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMetric('revenue')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMetric === 'revenue'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Ciro
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('profit')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMetric === 'profit'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Net Kâr
              </button>
            </div>
          </div>

          {/* SVG Interactive Bar Chart */}
          <div className="w-full h-52 flex items-end justify-between gap-2 pt-4 px-2">
            {chartDays.map((d, idx) => {
              const val = chartMetric === 'revenue' ? d.revenue : d.profit;
              const heightPercent = maxChartValue > 0 ? Math.max(8, (val / maxChartValue) * 100) : 8;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-16 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                    <p className="font-semibold">{d.label}</p>
                    <p>{chartMetric === 'revenue' ? 'Ciro:' : 'Kâr:'} {formatCurrency(val)}</p>
                    <p className="text-slate-400">{d.count} işlem</p>
                  </div>

                  {/* Bar */}
                  <div className="w-full max-w-[42px] bg-slate-100 dark:bg-slate-800/80 rounded-t-lg h-full flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        chartMetric === 'revenue'
                          ? 'bg-emerald-500 group-hover:bg-emerald-400'
                          : 'bg-indigo-500 group-hover:bg-indigo-400'
                      }`}
                    />
                  </div>

                  {/* Day label */}
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Ciro
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Net Kâr
              </span>
            </div>
            <span className="tabular-nums">
              Tepe Değer: {formatCurrency(maxChartValue)}
            </span>
          </div>
        </div>

        {/* Payment Methods Breakdown (Donut Chart representation) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Ödeme Yöntemi Dağılımı
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nakit, Karışık ve Veresiye oranları
            </p>
          </div>

          {/* Breakdown items */}
          <div className="my-4 space-y-3">
            {[
              { label: 'Nakit', value: paymentBreakdown.cash, color: 'bg-emerald-500', icon: Wallet },
              { label: 'Karışık Ödeme', value: paymentBreakdown.mixed, color: 'bg-indigo-500', icon: Layers },
              { label: 'Veresiye (Açık Hesap)', value: paymentBreakdown.credit, color: 'bg-amber-500', icon: Clock },
              { label: 'Havale / EFT', value: paymentBreakdown.transfer, color: 'bg-purple-500', icon: ArrowUpRight },
            ].map((p, idx) => {
              const pct = totalRevenue > 0 ? (p.value / totalRevenue) * 100 : 0;
              const Icon = p.icon;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                      <div className={`w-2 h-2 rounded-full ${p.color}`} />
                      <span>{p.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] tabular-nums">
                        %{pct.toFixed(0)}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(p.value)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full ${p.color} rounded-full transition-all duration-300`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Toplam Tahsil Edilen:</span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(totalRevenue - paymentBreakdown.credit)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Selling Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                En Çok Satan Ürünler
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ciro ve satış adedine göre sıralı
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('products')}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-0.5"
            >
              Tüm Ürünler <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Bu dönemde henüz satış bulunmuyor.
            </p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((prod, idx) => {
                const widthPct = (prod.revenue / maxProductRevenue) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[200px]">
                        {idx + 1}. {prod.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          {prod.quantity} adet
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(prod.revenue)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Transactions List */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Son Satış İşlemleri
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                En son düzenlenen makbuz ve faturalar
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('sales')}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-0.5"
            >
              Tüm Faturalar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sales.slice(0, 4).map((sale) => (
              <div
                key={sale.id}
                onClick={() => onSelectSaleForReceipt(sale)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-xl cursor-pointer transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {sale.customerName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {sale.invoiceNo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span>{formatDateTime(sale.createdAt)}</span>
                    <span>·</span>
                    <span className="capitalize">{sale.paymentMethod === 'credit' ? 'Veresiye' : sale.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums block">
                    {formatCurrency(sale.total)}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{formatCurrency(sale.profit)} kâr
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
