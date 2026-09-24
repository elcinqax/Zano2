export type PaymentMethod = 'cash' | 'mixed' | 'credit' | 'transfer' | 'card';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number; // Positive means debt to store (veresiye)
  totalPurchases: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: 'Adet' | 'Kg' | 'Paket' | 'Koli' | 'Metre' | 'Litre';
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  buyPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  costTotal: number;
  profit: number;
  paymentMethod: PaymentMethod;
  status: 'completed' | 'cancelled';
  paidAmount: number;
  changeAmount: number;
  cashPaid?: number;
  transferPaid?: number;
  customerBalanceDelta?: number;
  notes?: string;
  createdAt: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'stock_alert' | 'debt_reminder' | 'milestone' | 'system';
  isRead: boolean;
  actionTab?: 'pos' | 'dashboard' | 'products' | 'customers' | 'settings';
  createdAt: string;
}

export interface AppSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  currency: string;
  taxRate: number;
  isPinEnabled: boolean;
  pinCode: string;
  isBiometricEnabled: boolean;
  autoLockMinutes: number;
  theme: 'light' | 'dark' | 'system';
  lastBackupDate?: string;
  googleDriveSyncEmail?: string;
}

export interface DatabaseDump {
  version: string;
  timestamp: string;
  tables: {
    customers: Customer[];
    products: Product[];
    sales: Sale[];
    payments: CustomerPayment[];
    notifications: AppNotification[];
    settings: AppSettings;
  };
}
