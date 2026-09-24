import * as XLSX from 'xlsx';
import { Customer, Product, Sale } from '../types';
import { formatDate, formatDateTime } from './formatters';

export const exportToExcel = (sales: Sale[], customers: Customer[], products: Product[], storeName: string = 'MobilSatış') => {
  const wb = XLSX.utils.book_new();

  // 1. Sales Worksheet
  const salesRows = sales.map((s) => {
    const payLabel =
      s.paymentMethod === 'cash'
        ? 'Nakit'
        : s.paymentMethod === 'mixed'
        ? 'Karışık Ödeme'
        : s.paymentMethod === 'credit'
        ? 'Veresiye (Borç)'
        : s.paymentMethod === 'transfer'
        ? 'Havale / EFT'
        : 'Kart';

    const itemsSummary = s.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ');

    return {
      'Fatura No': s.invoiceNo,
      'Tarih': formatDateTime(s.createdAt),
      'Müşteri': s.customerName,
      'Telefon': s.customerPhone || '-',
      'Satılan Kalemler': itemsSummary,
      'Ödeme Yöntemi': payLabel,
      'Ara Toplam (₺)': Number(s.subtotal.toFixed(2)),
      'İndirim (₺)': Number(s.discount.toFixed(2)),
      'Genel Toplam (₺)': Number(s.total.toFixed(2)),
      'Maliyet (₺)': Number(s.costTotal.toFixed(2)),
      'Kâr (₺)': Number(s.profit.toFixed(2)),
      'Kâr Marjı (%)': s.total > 0 ? Number(((s.profit / s.total) * 100).toFixed(1)) : 0,
      'Durum': s.status === 'completed' ? 'Tamamlandı' : 'İptal',
      'Notlar': s.notes || '',
    };
  });

  const wsSales = XLSX.utils.json_to_sheet(salesRows);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Satışlar');

  // 2. Customers Worksheet
  const customerRows = customers.map((c) => ({
    'Müşteri Kodu': c.id,
    'Ad Soyad / Firma': c.name,
    'Telefon': c.phone || '-',
    'E-posta': c.email || '-',
    'Adres': c.address || '-',
    'Açık Veresiye Borcu (₺)': Number(c.balance.toFixed(2)),
    'Toplam Alışveriş (₺)': Number(c.totalPurchases.toFixed(2)),
    'Kayıt Tarihi': formatDate(c.createdAt),
    'Notlar': c.notes || '',
  }));
  const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'Müşteriler');

  // 3. Products Worksheet
  const productRows = products.map((p) => ({
    'Ürün Adı': p.name,
    'Kategori': p.category,
    'Alış Fiyatı (₺)': Number(p.buyPrice.toFixed(2)),
    'Satış Fiyatı (₺)': Number(p.sellPrice.toFixed(2)),
    'Mevcut Stok': p.stock,
    'Kritik Stok': p.minStock,
    'Birim': p.unit,
    'Toplam Stok Değeri (₺)': Number((p.stock * p.buyPrice).toFixed(2)),
    'Potansiyel Gelir (₺)': Number((p.stock * p.sellPrice).toFixed(2)),
    'Stok Durumu': p.stock <= p.minStock ? 'KRİTİK STOK' : 'Normal',
  }));
  const wsProducts = XLSX.utils.json_to_sheet(productRows);
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Ürünler ve Stok');

  // 4. Financial Summary Sheet
  const activeSales = sales.filter((s) => s.status === 'completed');
  const totalRevenue = activeSales.reduce((sum, s) => sum + s.total, 0);
  const totalCost = activeSales.reduce((sum, s) => sum + s.costTotal, 0);
  const totalProfit = activeSales.reduce((sum, s) => sum + s.profit, 0);
  const totalReceivables = customers.reduce((sum, c) => sum + c.balance, 0);
  const totalStockCost = products.reduce((sum, p) => sum + p.stock * p.buyPrice, 0);

  const summaryRows = [
    { 'Metrik': 'Raporu Hazırlayan Mağaza', 'Değer': storeName },
    { 'Metrik': 'Rapor Tarihi', 'Değer': formatDateTime(new Date().toISOString()) },
    { 'Metrik': 'Toplam Satış Sayısı', 'Değer': activeSales.length },
    { 'Metrik': 'Toplam Ciro (₺)', 'Değer': Number(totalRevenue.toFixed(2)) },
    { 'Metrik': 'Toplam Maliyet (₺)', 'Değer': Number(totalCost.toFixed(2)) },
    { 'Metrik': 'Toplam Net Kâr (₺)', 'Değer': Number(totalProfit.toFixed(2)) },
    { 'Metrik': 'Ortalama Kâr Oranı (%)', 'Değer': totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0 },
    { 'Metrik': 'Toplam Bekleyen Veresiye Alacakları (₺)', 'Değer': Number(totalReceivables.toFixed(2)) },
    { 'Metrik': 'Depodaki Mevcut Stok Maliyet Değeri (₺)', 'Değer': Number(totalStockCost.toFixed(2)) },
    { 'Metrik': 'Toplam Kayıtlı Müşteri', 'Değer': customers.length },
    { 'Metrik': 'Toplam Kayıtlı Ürün', 'Değer': products.length },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Finansal Özet');

  const todayStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `MobilSatis_Raporu_${todayStr}.xlsx`);
};

export const exportToCSV = (content: string, filename: string) => {
  // Prepend UTF-8 BOM so Excel on Windows & Android opens Turkish characters without encoding errors
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportSalesToCSV = (sales: Sale[]) => {
  const headers = ['Fatura No', 'Tarih', 'Müşteri', 'Ödeme Yöntemi', 'Toplam (TL)', 'Maliyet (TL)', 'Kâr (TL)', 'Durum'];
  const rows = sales.map((s) => [
    `"${s.invoiceNo}"`,
    `"${formatDateTime(s.createdAt)}"`,
    `"${s.customerName}"`,
    `"${s.paymentMethod}"`,
    s.total.toFixed(2),
    s.costTotal.toFixed(2),
    s.profit.toFixed(2),
    `"${s.status}"`,
  ]);
  const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const today = new Date().toISOString().slice(0, 10);
  exportToCSV(csv, `satislar_${today}.csv`);
};

export const exportCustomersToCSV = (customers: Customer[]) => {
  const headers = ['Müşteri Adı', 'Telefon', 'E-posta', 'Açık Borç (TL)', 'Toplam Alışveriş (TL)', 'Kayıt Tarihi'];
  const rows = customers.map((c) => [
    `"${c.name}"`,
    `"${c.phone || ''}"`,
    `"${c.email || ''}"`,
    c.balance.toFixed(2),
    c.totalPurchases.toFixed(2),
    `"${formatDate(c.createdAt)}"`,
  ]);
  const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const today = new Date().toISOString().slice(0, 10);
  exportToCSV(csv, `musteriler_${today}.csv`);
};

export const exportProductsToCSV = (products: Product[]) => {
  const headers = ['Ürün Adı', 'Kategori', 'Alış Fiyatı (TL)', 'Satış Fiyatı (TL)', 'Stok Miktarı', 'Birim', 'Kritik Stok'];
  const rows = products.map((p) => [
    `"${p.name}"`,
    `"${p.category}"`,
    p.buyPrice.toFixed(2),
    p.sellPrice.toFixed(2),
    p.stock.toString(),
    `"${p.unit}"`,
    p.minStock.toString(),
  ]);
  const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const today = new Date().toISOString().slice(0, 10);
  exportToCSV(csv, `urunler_${today}.csv`);
};

export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const shareOrSaveFile = async (content: string, filename: string, mimeType: string = 'application/json'): Promise<{ success: boolean; method: string }> => {
  const blob = new Blob([content], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });

  // If mobile browser supports Web Share API with files (Android Google Drive share target)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'MobilSatış Veritabanı Yedeği',
        text: 'MobilSatış SQLite yerel yedek dosyası.',
      });
      return { success: true, method: 'share' };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, method: 'cancelled' };
      }
      // Fallback to direct download
    }
  }

  // Fallback to standard download
  downloadFile(content, filename, mimeType);
  return { success: true, method: 'download' };
};
