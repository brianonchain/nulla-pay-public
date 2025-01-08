import mongoose, { Document, Schema } from "mongoose";

export type PaymentSettings = {
  merchantEvmAddress: string;
  merchantEmail: string;
  merchantName: string;
  merchantCountry: string;
  merchantCurrency: string;
  merchantPaymentType: string;
  merchantWebsite: string;
  merchantBusinessType: string;
  merchantFields: string[];
  merchantGoogleId: string;
  qrCodeUrl: string;
};

export type CashoutSettings = {
  cex: string;
  cexEvmAddress: string;
  isEmployeePass: boolean;
};

export type Transaction = {
  date: any;
  customerAddress: string;
  merchantEvmAddress: string;
  currencyAmount: number;
  currencyAmountAfterCashback?: number;
  merchantCurrency: string;
  tokenAmount: number;
  token: string;
  network: string;
  blockRate: number;
  cashRate: number;
  fxSavings: string;
  cashback: string;
  totalSavings: string;
  refund: string; // empty if not refunded, txnHash if refunded
  toRefund: boolean;
  note: string;
  // online params
  customerEmail?: string;
  item?: string;
  startDate?: string;
  endDate?: string;
  singleDate?: string;
  time?: string;
  countString?: string;
  shipping?: any;
  sku?: string;
  // txnHash
  txnHash: string;
};

export interface IUser extends Document {
  hashedEmployeePass: string;
  paymentSettings: PaymentSettings;
  cashoutSettings: CashoutSettings;
  transactions: Transaction[];
}

const UserSchema: Schema = new Schema<IUser>({
  hashedEmployeePass: String,
  paymentSettings: {
    merchantEvmAddress: String,
    merchantEmail: { type: String, unique: true },
    merchantName: String,
    merchantCountry: String,
    merchantCurrency: String,
    merchantPaymentType: String, // "online" | "inperson"
    merchantWebsite: String,
    merchantBusinessType: String,
    merchantFields: [String], // dates, count, sku, shipping, custom, <custom>,
    merchantGoogleId: String,
    qrCodeUrl: String,
  },
  cashoutSettings: {
    cex: String,
    cexEvmAddress: String,
    isEmployeePass: Boolean, // needed because hashedEmployeePass is not passed to frontend and we need to know whether there is a password or not
  },
  transactions: [
    {
      date: Date,
      customerAddress: String,
      currencyAmount: Number,
      currencyAmountAfterCashback: Number,
      merchantCurrency: String,
      tokenAmount: Number,
      token: String,
      network: String,
      blockRate: Number,
      cashRate: Number,
      fxSavings: String,
      cashback: String,
      totalSavings: String,
      merchantEvmAddress: String,
      refund: String,
      toRefund: Boolean,
      note: String,
      // online params
      customerEmail: String,
      item: String,
      startDate: String,
      endDate: String,
      singleDate: String,
      time: String,
      countString: String,
      shipping: Object,
      sku: String,
      // txnHash
      txnHash: String,
    },
  ],
});

const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default UserModel;
