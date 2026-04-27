import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  Member,
  announcements,
  bonusLedger,
  gubenLedger,
  members,
  notifications,
  orderItems,
  orders,
  products,
  systemSettings,
  topups,
  users,
  vipPaymentCodes,
  withdrawals,
  rewardVisibility,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function updateUser(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function getMemberByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(members).where(eq(members.userId, userId)).limit(1);
  return result[0];
}

export async function getMemberById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(members).where(eq(members.id, id)).limit(1);
  return result[0];
}

export async function getMemberByReferralCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(members).where(eq(members.referralCode, code)).limit(1);
  return result[0];
}

export async function createMember(data: Omit<typeof members.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(members).values(data);
  return getMemberByUserId(data.userId);
}

export async function updateMember(id: number, data: Partial<typeof members.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(members).set(data).where(eq(members.id, id));
}

export async function getAllMembers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      member: members,
      user: users,
    })
    .from(members)
    .leftJoin(users, eq(members.userId, users.id))
    .orderBy(desc(members.createdAt));
}

export async function getDirectReferrals(memberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ member: members, user: users })
    .from(members)
    .leftJoin(users, eq(members.userId, users.id))
    .where(eq(members.referrerId, memberId));
}

export async function getTeamTree(rootMemberId: number, maxDepth = 10): Promise<Member[]> {
  const db = await getDb();
  if (!db) return [];
  // BFS traversal
  const result: Member[] = [];
  const queue = [rootMemberId];
  const visited = new Set<number>();
  let depth = 0;
  while (queue.length > 0 && depth < maxDepth) {
    const batch = [...queue];
    queue.length = 0;
    depth++;
    const rows = await db.select().from(members).where(inArray(members.referrerId, batch));
    for (const row of rows) {
      if (!visited.has(row.id)) {
        visited.add(row.id);
        result.push(row);
        queue.push(row.id);
      }
    }
  }
  return result;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(zone?: "VIP" | "AGENT" | "BOTH", activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (activeOnly) conditions.push(eq(products.isActive, true));
  if (zone === "VIP") conditions.push(or(eq(products.zone, "VIP"), eq(products.zone, "BOTH")));
  if (zone === "AGENT") conditions.push(or(eq(products.zone, "AGENT"), eq(products.zone, "BOTH")));
  return db
    .select()
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(products.name);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function upsertProduct(data: typeof products.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(products).set(data).where(eq(products.id, data.id));
    return getProductById(data.id);
  } else {
    await db.insert(products).values(data);
    const all = await db.select().from(products).orderBy(desc(products.createdAt)).limit(1);
    return all[0];
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getOrdersByMember(memberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ order: orders, items: orderItems })
    .from(orders)
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .where(eq(orders.memberId, memberId))
    .orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getAllOrders(filters?: { from?: Date; to?: Date; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.from) conditions.push(gte(orders.createdAt, filters.from));
  if (filters?.to) conditions.push(lte(orders.createdAt, filters.to));
  if (filters?.status) conditions.push(eq(orders.status, filters.status as any));
  return db
    .select()
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt));
}

export async function createOrder(
  orderData: typeof orders.$inferInsert,
  items: Array<Omit<typeof orderItems.$inferInsert, 'orderId' | 'id' | 'createdAt'>>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(orders).values(orderData);
  const created = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNo, orderData.orderNo!))
    .limit(1);
  const order = created[0];
  if (!order) throw new Error("Failed to create order");
  const itemsWithOrderId = items.map((item) => ({ ...item, orderId: order.id }));
  if (itemsWithOrderId.length > 0) await db.insert(orderItems).values(itemsWithOrderId);
  return order;
}

export async function updateOrderStatus(
  orderId: number,
  status: typeof orders.$inferInsert["status"],
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const update: Partial<typeof orders.$inferInsert> = { status };
  if (notes !== undefined) update.notes = notes;
  await db.update(orders).set(update).where(eq(orders.id, orderId));
}

// ─── VIP Payment Codes ────────────────────────────────────────────────────────

export async function createVipCode(data: typeof vipPaymentCodes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(vipPaymentCodes).values(data);
}

export async function getVipCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(vipPaymentCodes)
    .where(eq(vipPaymentCodes.code, code))
    .limit(1);
  return result[0];
}

export async function markVipCodeUsed(code: string, usedByMemberId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(vipPaymentCodes)
    .set({ isUsed: true, usedByMemberId })
    .where(eq(vipPaymentCodes.code, code));
}

export async function getVipCodesByMember(memberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(vipPaymentCodes)
    .where(eq(vipPaymentCodes.issuedToMemberId, memberId))
    .orderBy(desc(vipPaymentCodes.createdAt));
}

// ─── 固本 Ledger ──────────────────────────────────────────────────────────────

export async function addGubenEntry(data: typeof gubenLedger.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(gubenLedger).values(data);
  // Update member balance
  await db
    .update(members)
    .set({ gubenBalance: sql`gubenBalance + ${data.amount}` })
    .where(eq(members.id, data.memberId));
}

export async function getGubenLedger(memberId: number, from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(gubenLedger.memberId, memberId)];
  if (from) conditions.push(gte(gubenLedger.createdAt, from));
  if (to) conditions.push(lte(gubenLedger.createdAt, to));
  return db
    .select()
    .from(gubenLedger)
    .where(and(...conditions))
    .orderBy(desc(gubenLedger.createdAt));
}

export async function getAllGubenLedger(from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (from) conditions.push(gte(gubenLedger.createdAt, from));
  if (to) conditions.push(lte(gubenLedger.createdAt, to));
  return db
    .select()
    .from(gubenLedger)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(gubenLedger.createdAt));
}

// ─── Bonus Ledger ─────────────────────────────────────────────────────────────

export async function addBonusEntry(data: typeof bonusLedger.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(bonusLedger).values(data);
  if (data.type !== "YEAR_END_DIVIDEND" && data.type !== "WITHDRAWAL") {
    await db
      .update(members)
      .set({ bonusBalance: sql`bonusBalance + ${data.amount}` })
      .where(eq(members.id, data.memberId));
  }
}

export async function getBonusLedger(memberId: number, from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(bonusLedger.memberId, memberId)];
  if (from) conditions.push(gte(bonusLedger.createdAt, from));
  if (to) conditions.push(lte(bonusLedger.createdAt, to));
  return db
    .select()
    .from(bonusLedger)
    .where(and(...conditions))
    .orderBy(desc(bonusLedger.createdAt));
}

export async function getAllBonusLedger(from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (from) conditions.push(gte(bonusLedger.createdAt, from));
  if (to) conditions.push(lte(bonusLedger.createdAt, to));
  return db
    .select()
    .from(bonusLedger)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(bonusLedger.createdAt));
}

// ─── Top-ups ──────────────────────────────────────────────────────────────────

export async function createTopup(data: typeof topups.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(topups).values(data);
  const result = await db
    .select()
    .from(topups)
    .orderBy(desc(topups.createdAt))
    .limit(1);
  return result[0];
}

export async function getTopupsByMember(memberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(topups)
    .where(eq(topups.memberId, memberId))
    .orderBy(desc(topups.createdAt));
}

export async function getAllTopups(from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (from) conditions.push(gte(topups.createdAt, from));
  if (to) conditions.push(lte(topups.createdAt, to));
  return db
    .select()
    .from(topups)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(topups.createdAt));
}

export async function updateTopupStatus(
  id: number,
  status: "APPROVED" | "REJECTED",
  adminNote?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(topups).set({ status, adminNote }).where(eq(topups.id, id));
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────

export async function createWithdrawal(data: typeof withdrawals.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(withdrawals).values(data);
  const result = await db.select().from(withdrawals).orderBy(desc(withdrawals.createdAt)).limit(1);
  return result[0];
}

export async function getWithdrawalsByMember(memberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.memberId, memberId))
    .orderBy(desc(withdrawals.createdAt));
}

export async function getAllWithdrawals(from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (from) conditions.push(gte(withdrawals.createdAt, from));
  if (to) conditions.push(lte(withdrawals.createdAt, to));
  return db
    .select()
    .from(withdrawals)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(withdrawals.createdAt));
}

export async function updateWithdrawalStatus(
  id: number,
  status: "APPROVED" | "REJECTED" | "PAID",
  adminNote?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(withdrawals).set({ status, adminNote }).where(eq(withdrawals.id, id));
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function getPublishedAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(announcements)
    .where(eq(announcements.isPublished, true))
    .orderBy(desc(announcements.publishedAt));
}

export async function getAllAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function upsertAnnouncement(data: typeof announcements.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(announcements).set(data).where(eq(announcements.id, data.id));
    const result = await db.select().from(announcements).where(eq(announcements.id, data.id)).limit(1);
    return result[0];
  } else {
    await db.insert(announcements).values(data);
    const result = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(1);
    return result[0];
  }
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(announcements).where(eq(announcements.id, id));
}

// ─── System Settings ──────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);
  return result[0]?.value;
}

export async function setSetting(key: string, value: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .insert(systemSettings)
    .values({ key, value, description })
    .onDuplicateKeyUpdate({ set: { value, description } });
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemSettings).orderBy(systemSettings.key);
}

// ─── Reward Visibility ────────────────────────────────────────────────────────

export async function getRewardVisibility(memberId: number) {
  const db = await getDb();
  if (!db) return { showCarAllowance: true, showTravelReward: true };
  const result = await db
    .select()
    .from(rewardVisibility)
    .where(eq(rewardVisibility.memberId, memberId))
    .limit(1);
  return result[0] ?? { showCarAllowance: true, showTravelReward: true };
}

export async function setRewardVisibility(
  memberId: number,
  data: { showCarAllowance?: boolean; showTravelReward?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .insert(rewardVisibility)
    .values({ memberId, ...data })
    .onDuplicateKeyUpdate({ set: data });
}

// ─── Bonus Calculation Helpers ────────────────────────────────────────────────

/**
 * Get all ancestors of a member up to maxDepth levels, in order (parent first).
 */
export async function getAncestors(memberId: number, maxDepth = 10): Promise<Member[]> {
  const db = await getDb();
  if (!db) return [];
  const ancestors: Member[] = [];
  let current = await getMemberById(memberId);
  let depth = 0;
  while (current?.referrerId && depth < maxDepth) {
    const parent = await getMemberById(current.referrerId);
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
    depth++;
  }
  return ancestors;
}

/**
 * Get monthly team performance for a member (sum of agent + assessment orders in their downline).
 */
export async function getMonthlyTeamPerformance(memberId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return 0;
  const teamMembers = await getTeamTree(memberId);
  const teamIds = teamMembers.map((m) => m.id);
  if (teamIds.length === 0) return 0;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const result = await db
    .select({ total: sql<string>`SUM(totalAmount)` })
    .from(orders)
    .where(
      and(
        inArray(orders.memberId, teamIds),
        inArray(orders.orderType, ["AGENT_ORDER"]),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        or(eq(orders.status, "DELIVERED"), eq(orders.status, "SHIPPED"), eq(orders.status, "PROCESSING"))
      )
    );
  return parseFloat(result[0]?.total ?? "0");
}

/**
 * Get annual income for a member (sum of all bonus ledger credits in a year).
 */
export async function getAnnualIncome(memberId: number, year: number) {
  const db = await getDb();
  if (!db) return 0;
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  const result = await db
    .select({ total: sql<string>`SUM(amount)` })
    .from(bonusLedger)
    .where(
      and(
        eq(bonusLedger.memberId, memberId),
        gte(bonusLedger.amount, "0"),
        gte(bonusLedger.createdAt, startDate),
        lte(bonusLedger.createdAt, endDate)
      )
    );
  return parseFloat(result[0]?.total ?? "0");
}

// ─── Order Items ──────────────────────────────────────────────────────────────

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function getOrdersWithItems(memberId?: number) {
  const db = await getDb();
  if (!db) return [];
  const condition = memberId ? eq(orders.memberId, memberId) : undefined;
  const result = await db
    .select()
    .from(orders)
    .where(condition)
    .orderBy(desc(orders.createdAt));
  
  // Fetch items for each order with product details
  const ordersWithItems = await Promise.all(
    result.map(async (order) => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const product = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
          return { ...item, product: product[0] || null };
        })
      );
      return { ...order, items: itemsWithProducts };
    })
  );
  
  return ordersWithItems;
}


// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: {
  memberId: number;
  title: string;
  content: string;
  type?: "ANNOUNCEMENT" | "BONUS" | "ORDER" | "SYSTEM" | "REMINDER";
  actionUrl?: string;
  createdBy?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(notifications).values({
    memberId: data.memberId,
    title: data.title,
    content: data.content,
    type: data.type || "ANNOUNCEMENT",
    actionUrl: data.actionUrl,
    createdBy: data.createdBy,
  });
}

export async function getMemberNotifications(memberId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.memberId, memberId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUnreadNotificationCount(memberId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.memberId, memberId), eq(notifications.isRead, false)));

  return result[0]?.count || 0;
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
}

export async function markAllNotificationsAsRead(memberId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.memberId, memberId), eq(notifications.isRead, false)));
}

export async function deleteNotification(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(notifications).where(eq(notifications.id, notificationId));
}

export async function sendBulkNotification(memberIds: number[], data: {
  title: string;
  content: string;
  type?: "ANNOUNCEMENT" | "BONUS" | "ORDER" | "SYSTEM" | "REMINDER";
  actionUrl?: string;
  createdBy?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const notificationRecords = memberIds.map((memberId) => ({
    memberId,
    title: data.title,
    content: data.content,
    type: (data.type || "ANNOUNCEMENT") as "ANNOUNCEMENT" | "BONUS" | "ORDER" | "SYSTEM" | "REMINDER",
    actionUrl: data.actionUrl,
    createdBy: data.createdBy,
  }));

  await db.insert(notifications).values(notificationRecords);
}
