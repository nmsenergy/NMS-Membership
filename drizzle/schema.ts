import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users / Members ─────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "regional_manager"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Member Profiles ──────────────────────────────────────────────────────────

export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK → users.id
  referralCode: varchar("referralCode", { length: 32 }).notNull().unique(),
  referrerId: int("referrerId"), // FK → members.id (nullable for root)
  rank: mysqlEnum("rank", ["VIP", "M_AGENT", "SM", "GM", "CEO"]).default("VIP").notNull(),
  phone: varchar("phone", { length: 32 }),
  birthday: varchar("birthday", { length: 10 }), // YYYY-MM-DD stored as string
  birthdayVerified: boolean("birthdayVerified").default(false).notNull(),
  birthdayIdPhotoUrl: text("birthdayIdPhotoUrl"), // URL of uploaded ID photo for verification
  isActive: boolean("isActive").default(true).notNull(),
  // Bonus balances (stored as integers in sen/points to avoid float issues)
  gubenBalance: int("gubenBalance").default(0).notNull(), // 固本 points (1 point = RM1)
  bonusBalance: decimal("bonusBalance", { precision: 12, scale: 2 }).default("0.00").notNull(), // RM cash bonus
  // Upgrade tracking
  vipPackagesBought: int("vipPackagesBought").default(0).notNull(),
  directVipReferrals: int("directVipReferrals").default(0).notNull(),
  directMAgentReferrals: int("directMAgentReferrals").default(0).notNull(),
  // Account switch target (for agents managing sub-teams)
  switchedToMemberId: int("switchedToMemberId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // actual selling price
  baseValue: decimal("baseValue", { precision: 10, scale: 2 }).notNull(), // for bonus calculation
  agentPrice: decimal("agentPrice", { precision: 10, scale: 2 }), // agent zone price
  category: mysqlEnum("category", [
    "VIP_PACKAGE",
    "VIP_BENEFIT_ITEM",
    "BIRTHDAY_ITEM",
    "REDEMPTION_ITEM",
    "AGENT_PACKAGE",
    "AGENT_ITEM",
    "ASSESSMENT_ITEM",
  ]).notNull(),
  zone: mysqlEnum("zone", ["VIP", "AGENT", "BOTH"]).default("VIP").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  // Birthday half-price config
  birthdayEligible: boolean("birthdayEligible").default(false).notNull(),
  birthdayMaxQty: int("birthdayMaxQty").default(1).notNull(),
  // VIP package count (how many VIP packages does buying this count as)
  vipPackageCount: int("vipPackageCount").default(0).notNull(),
  stock: int("stock"), // null = unlimited
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── VIP Payment Codes ────────────────────────────────────────────────────────

export const vipPaymentCodes = mysqlTable("vip_payment_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  agentOrderId: int("agentOrderId").notNull(), // FK → orders.id
  productId: int("productId").notNull(), // FK → products.id
  issuedToMemberId: int("issuedToMemberId").notNull(), // the M-Agent who got the code
  usedByMemberId: int("usedByMemberId"), // the VIP who used it
  isUsed: boolean("isUsed").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VipPaymentCode = typeof vipPaymentCodes.$inferSelect;

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 64 }).notNull().unique(),
  memberId: int("memberId").notNull(), // FK → members.id
  orderType: mysqlEnum("orderType", [
    "VIP_ORDER",
    "AGENT_ORDER",
    "BIRTHDAY_ORDER",
    "REDEMPTION_ORDER",
  ]).notNull(),
  status: mysqlEnum("status", [
    "PENDING_PAYMENT",
    "PENDING_VERIFICATION",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]).default("PENDING_PAYMENT").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", [
    "VIP_CODE",
    "ONLINE_TRANSFER",
    "OFFLINE_PAYMENT",
    "GUBEN_POINTS",
  ]),
  paymentCode: varchar("paymentCode", { length: 64 }), // VIP code used
  paymentProofUrl: text("paymentProofUrl"), // uploaded proof for offline
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  gubenUsed: int("gubenUsed").default(0).notNull(), // 固本 points used
  notes: text("notes"),
  shippingAddress: text("shippingAddress"),
  shippingLocation: mysqlEnum("shippingLocation", ["KK_AGENT", "PUCHONG_HQ"]), // VIP order shipping location
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull().default(1),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  baseValue: decimal("baseValue", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;

// ─── 固本 Ledger ──────────────────────────────────────────────────────────────

export const gubenLedger = mysqlTable("guben_ledger", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  amount: int("amount").notNull(), // positive = credit, negative = debit
  type: mysqlEnum("type", [
    "PURCHASE_EARN",   // 15% from own purchase
    "REFERRAL_EARN",   // 15% from referral purchase
    "TOPUP",           // cash top-up
    "BONUS_CONVERT",   // convert bonus to 固本
    "REDEEM",          // used for redemption order
    "EXPIRE",          // annual expiry
    "ADMIN_ADJUST",    // manual admin adjustment
  ]).notNull(),
  orderId: int("orderId"), // related order if applicable
  description: text("description"),
  expiresAt: timestamp("expiresAt"), // Dec 31 of the year
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GubenLedger = typeof gubenLedger.$inferSelect;

// ─── Bonus Ledger ─────────────────────────────────────────────────────────────

export const bonusLedger = mysqlTable("bonus_ledger", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // positive = credit, negative = debit
  type: mysqlEnum("type", [
    "ORG_BONUS",       // organizational bonus from team sales
    "GRATITUDE_BONUS", // gratitude bonus from upline SM
    "YEAR_END_DIVIDEND", // annual dividend (display only)
    "CAR_ALLOWANCE",   // car allowance reward
    "TRAVEL_REWARD",   // travel reward
    "SHAREHOLDER_DIVIDEND", // CEO 1% dividend
    "WITHDRAWAL",      // cash withdrawal
    "ADMIN_ADJUST",    // manual admin adjustment
  ]).notNull(),
  orderId: int("orderId"),
  description: text("description"),
  periodMonth: varchar("periodMonth", { length: 7 }), // YYYY-MM for periodic bonuses
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BonusLedger = typeof bonusLedger.$inferSelect;

// ─── Top-ups ──────────────────────────────────────────────────────────────────

export const topups = mysqlTable("topups", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  type: mysqlEnum("type", ["CASH", "BONUS_CONVERT"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // RM amount
  gubenPoints: int("gubenPoints").notNull(), // points credited
  paymentProofUrl: text("paymentProofUrl"),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"]).default("PENDING").notNull(),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Topup = typeof topups.$inferSelect;

// ─── Withdrawals ──────────────────────────────────────────────────────────────

export const withdrawals = mysqlTable("withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  bankName: varchar("bankName", { length: 128 }),
  bankAccount: varchar("bankAccount", { length: 64 }),
  accountHolder: varchar("accountHolder", { length: 128 }),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED", "PAID"]).default("PENDING").notNull(),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Withdrawal = typeof withdrawals.$inferSelect;

// ─── Announcements ────────────────────────────────────────────────────────────

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdBy: int("createdBy").notNull(), // FK → users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;

// ─── System Settings ──────────────────────────────────────────────────────────

export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;

// ─── Extra Reward Visibility ──────────────────────────────────────────────────

export const rewardVisibility = mysqlTable("reward_visibility", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().unique(),
  showCarAllowance: boolean("showCarAllowance").default(true).notNull(),
  showTravelReward: boolean("showTravelReward").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});


// Product Calculation Base - stores different calculation bases for same product
export const productCalculationBase = mysqlTable("product_calculation_base", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  zone: mysqlEnum("zone", ["VIP", "AGENT", "BOTH"]).notNull(),
  gubenBase: decimal("gubenBase", { precision: 12, scale: 2 }).notNull(),
  bonusBase: decimal("bonusBase", { precision: 12, scale: 2 }).notNull(),
  gubenRate: decimal("gubenRate", { precision: 5, scale: 2 }).default("15.00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductCalculationBase = typeof productCalculationBase.$inferSelect;
export type InsertProductCalculationBase = typeof productCalculationBase.$inferInsert;

// Upgrade Conditions - configurable criteria for member rank upgrades
export const upgradeConditions = mysqlTable("upgrade_conditions", {
  id: int("id").autoincrement().primaryKey(),
  rank: mysqlEnum("rank", ["VIP", "M_AGENT", "SM", "GM", "CEO"]).notNull().unique(),
  requiredDirectVips: int("requiredDirectVips").default(0).notNull(),
  requiredDirectMAgents: int("requiredDirectMAgents").default(0).notNull(),
  requiredVipPackages: int("requiredVipPackages").default(0).notNull(),
  requiredTeamSales: decimal("requiredTeamSales", { precision: 12, scale: 2 }).default("0.00").notNull(),
  carAllowanceMonthlyTeamSales: decimal("carAllowanceMonthlyTeamSales", { precision: 12, scale: 2 }).default("18000.00").notNull(),
  carAllowanceSubMemberCap: decimal("carAllowanceSubMemberCap", { precision: 12, scale: 2 }).default("6000.00").notNull(),
  carAllowancePerQualifiedMember: decimal("carAllowancePerQualifiedMember", { precision: 12, scale: 2 }).default("200.00").notNull(),
  travelRewardVipCount: int("travelRewardVipCount").default(12).notNull(),
  travelRewardAssessmentAmount: decimal("travelRewardAssessmentAmount", { precision: 12, scale: 2 }).default("2800.00").notNull(),
  dividendMinAnnualIncome: decimal("dividendMinAnnualIncome", { precision: 12, scale: 2 }).default("0.00").notNull(),
  dividendRate: decimal("dividendRate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UpgradeCondition = typeof upgradeConditions.$inferSelect;
export type InsertUpgradeCondition = typeof upgradeConditions.$inferInsert;

// Manual Bonus Allocation - for admin to manually allocate guben or bonus
export const manualBonusAllocations = mysqlTable("manual_bonus_allocations", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  type: mysqlEnum("type", ["GUBEN", "BONUS"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  allocatedBy: int("allocatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ManualBonusAllocation = typeof manualBonusAllocations.$inferSelect;
export type InsertManualBonusAllocation = typeof manualBonusAllocations.$inferInsert;


// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(), // FK → members.id
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["ANNOUNCEMENT", "BONUS", "ORDER", "SYSTEM", "REMINDER"]).default("ANNOUNCEMENT").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  actionUrl: varchar("actionUrl", { length: 512 }), // optional link to related page
  createdBy: int("createdBy"), // FK → users.id (admin who created it, null for system)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
