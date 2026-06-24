import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  addBonusEntry,
  addGubenEntry,
  createMember,
  createOrder,
  createTopup,
  createVipCode,
  createWithdrawal,
  deleteAnnouncement,
  getAllAnnouncements,
  getAllBonusLedger,
  getAllGubenLedger,
  getAllMembers,
  getAllOrders,
  getAllSettings,
  getAllTopups,
  getAllWithdrawals,
  getAncestors,
  getAnnualIncome,
  getBonusLedger,
  getDirectReferrals,
  getGubenLedger,
  getMemberById,
  getMemberByReferralCode,
  getMemberByUserId,
  getMonthlyTeamPerformance,
  getOrderById,
  getOrderItems,
  getOrdersByMember,
  getOrdersWithItems,
  getProducts,
  getProductById,
  getPublishedAnnouncements,
  getRewardVisibility,
  getSetting,
  getTeamTree,
  getTopupsByMember,
  getVipCodeByCode,
  getVipCodesByMember,
  getWithdrawalsByMember,
  markVipCodeUsed,
  setRewardVisibility,
  setSetting,
  updateMember,
  updateOrderStatus,
  updateTopupStatus,
  createNotification,
  getMemberNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  sendBulkNotification,
  updateUser,
  updateWithdrawalStatus,
  upsertAnnouncement,
  upsertProduct,
  upsertUser,
  getDb,
} from "./db";
import {
  upgradeConditions,
  manualBonusAllocations,
  bonusLedger,
  productCalculationBase,
  orderItems,
  users,
  vipPaymentCodes,
} from "../drizzle/schema";
import { eq, gte, lte, and } from "drizzle-orm";
import { getUserByOpenId, getUserById } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOrderNo() {
  return `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function generateReferralCode() {
  return nanoid(8).toUpperCase();
}



const RANK_ORDER = { VIP: 0, M_AGENT: 1, SM: 2, GM: 3, CEO: 4 };

function isAgentOrAbove(rank: string) {
  return ["M_AGENT", "SM", "GM", "CEO"].includes(rank);
}

function isSMOrAbove(rank: string) {
  return ["SM", "GM", "CEO"].includes(rank);
}

// Admin middleware
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  return next({ ctx });
});

// ─── Auth Router ──────────────────────────────────────────────────────────────

const authRouter = router({
  me: publicProcedure.query(async (opts) => {
    const user = opts.ctx.user;
    if (!user) return null;
    const member = await getMemberByUserId(user.id);
    return { ...user, member };
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});

// ─── Member Router ────────────────────────────────────────────────────────────

const memberRouter = router({
  profile: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) return null;
    const referrer = member.referrerId ? await getMemberById(member.referrerId) : null;
    return { ...member, referrer };
  }),

  register: protectedProcedure
    .input(
      z.object({
        phone: z.string().optional(),
        birthday: z.string().optional(),
        referralCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getMemberByUserId(ctx.user.id);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Already registered" });

      if (!input.referralCode.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Referral code is required" });
      }

      const referrer = await getMemberByReferralCode(input.referralCode);
      if (!referrer) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral code" });
      const referrerId = referrer.id;

      const code = generateReferralCode();
      const member = await createMember({
        userId: ctx.user.id,
        referralCode: code,
        referrerId,
        rank: "VIP",
        phone: input.phone,
        birthday: input.birthday,
        gubenBalance: 0,
        bonusBalance: "0.00",
        vipPackagesBought: 0,
        directVipReferrals: 0,
        directMAgentReferrals: 0,
        isActive: true,
        birthdayVerified: false,
      });

      // Increment referrer's direct VIP count
      const referrerData = await getMemberById(referrerId);
      if (referrerData) {
        await updateMember(referrerId, {
          directVipReferrals: referrerData.directVipReferrals + 1,
        });
        await checkAndUpgradeRank(referrerId);
      }

      return member;
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        birthday: z.string().optional(),
        shippingAddress: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.name) {
        await updateUser(ctx.user.id, { name: input.name });
      }
      await updateMember(member.id, input);
      return getMemberById(member.id);
    }),

  team: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) return { direct: [], total: [] };
    const direct = await getDirectReferrals(member.id);
    const total = await getTeamTree(member.id);
    return { direct, total };
  }),

  rewardVisibility: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) return { showCarAllowance: true, showTravelReward: true };
    return getRewardVisibility(member.id);
  }),

  setRewardVisibility: protectedProcedure
    .input(z.object({ showCarAllowance: z.boolean().optional(), showTravelReward: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      await setRewardVisibility(member.id, input);
      return { success: true };
    }),

  switchAccount: protectedProcedure
    .input(z.object({ targetMemberId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.targetMemberId !== null) {
        // Verify target is in downline
        const team = await getTeamTree(member.id);
        const isInTeam = team.some((m) => m.id === input.targetMemberId);
        if (!isInTeam && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Target not in your team" });
        }
      }
      await updateMember(member.id, { switchedToMemberId: input.targetMemberId ?? undefined });
      return { success: true };
    }),

  yearEndDividend: protectedProcedure
    .input(z.object({ year: z.number().default(new Date().getFullYear()) }))
    .query(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) return null;
      const annualIncome = await getAnnualIncome(member.id, input.year);
      let rate = 0;
      let minIncome = 0;
      if (member.rank === "CEO" && annualIncome >= 50000) { rate = 0.15; minIncome = 50000; }
      else if (member.rank === "GM" && annualIncome >= 12000) { rate = 0.12; minIncome = 12000; }
      else if (member.rank === "SM" && annualIncome >= 5000) { rate = 0.10; minIncome = 5000; }
      return { annualIncome, rate, dividend: annualIncome * rate, minIncome, year: input.year };
    }),

  carAllowanceStatus: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member || !isAgentOrAbove(member.rank)) return null;
    const now = new Date();
    const performance = await getMonthlyTeamPerformance(member.id, now.getFullYear(), now.getMonth() + 1);
    const directVips = member.directVipReferrals;
    const eligible = directVips >= 12;
    const mainAllowance = eligible && performance >= 18000 ? 300 : 0;
    return { eligible, directVips, performance, mainAllowance };
  }),

  travelRewardStatus: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) return null;
    const option1 = member.directVipReferrals >= 12;
    const option2 = member.directVipReferrals >= 15;
    return { option1Vips: member.directVipReferrals, option1Met: option1, option2Met: option2 };
  }),
});

// ─── Product Router ───────────────────────────────────────────────────────────

const productRouter = router({
  list: protectedProcedure
    .input(z.object({ zone: z.enum(["VIP", "AGENT", "BOTH"]).optional() }))
    .query(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      const rank = member?.rank ?? "VIP";
      // Agent zone only for M_AGENT+
      if (input.zone === "AGENT" && !isAgentOrAbove(rank) && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Agent zone requires M-Agent rank or above" });
      }
      return getProducts(input.zone);
    }),

  detail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return getProductById(input.id);
    }),

  birthdayProducts: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) return [];
    if (!member.birthdayVerified) return [];
    const now = new Date();
    const birthMonth = member.birthday?.slice(5, 7);
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    if (birthMonth !== currentMonth) return [];
    const allProducts = await getProducts("VIP");
    return allProducts.filter((p) => p.birthdayEligible);
  }),
});

// ─── Order Router ─────────────────────────────────────────────────────────────

const orderRouter = router({
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) return [];
    return getOrdersWithItems(member.id);
  }),

  myCodes: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) return [];
    return getVipCodesByMember(member.id);
  }),

  createAgentOrder: protectedProcedure
    .input(
      z.object({
        items: z.array(z.object({ productId: z.number(), quantity: z.number().min(1) })),
        paymentMethod: z.enum(["ONLINE_TRANSFER", "OFFLINE_PAYMENT"]),
        paymentProofUrl: z.string().optional(),
        shippingAddress: z.string().optional(),
        shippingLocation: z.enum(["KK_AGENT", "PUCHONG_HQ"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      if (!isAgentOrAbove(member.rank)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Agent rank required" });
      }

      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of input.items) {
        const product = await getProductById(item.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: `Product ${item.productId} not found` });
        const price = parseFloat(product.agentPrice ?? product.price);
        totalAmount += price * item.quantity;
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: String(price),
          baseValue: product.baseValue,
        });
      }

      const orderNo = generateOrderNo();
      const order = await createOrder(
        {
          orderNo,
          memberId: member.id,
          orderType: "AGENT_ORDER",
          status: input.paymentMethod === "OFFLINE_PAYMENT" ? "PENDING_VERIFICATION" : "PROCESSING",
          paymentMethod: input.paymentMethod,
          paymentProofUrl: input.paymentProofUrl,
          totalAmount: String(totalAmount),
          gubenUsed: 0,
          shippingAddress: input.shippingAddress,
          shippingLocation: input.shippingLocation,
        },
        orderItemsData
      );

      // VIP codes will be generated when order status changes to DELIVERED
      // This ensures codes are only issued after payment is confirmed and order is completed

      return { order, codes: [] };
    }),

  createVipOrder: protectedProcedure
    .input(
      z.object({
        paymentCode: z.string(),
        shippingAddress: z.string().optional(),
        shippingLocation: z.enum(["KK_AGENT", "PUCHONG_HQ"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const vipCode = await getVipCodeByCode(input.paymentCode);
      if (!vipCode) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid payment code" });
      if (vipCode.isUsed) throw new TRPCError({ code: "BAD_REQUEST", message: "Code already used" });

      const product = await getProductById(vipCode.productId);
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });

      const orderNo = generateOrderNo();
      const order = await createOrder(
        {
          orderNo,
          memberId: member.id,
          orderType: "VIP_ORDER",
          status: "PROCESSING",
          paymentMethod: "VIP_CODE",
          paymentCode: input.paymentCode,
          totalAmount: product.price,
          gubenUsed: 0,
          shippingAddress: input.shippingAddress,
          shippingLocation: input.shippingLocation,
        },
        [{ productId: product.id, quantity: 1, unitPrice: product.price, baseValue: product.baseValue }]
      );

      await markVipCodeUsed(input.paymentCode, member.id);

      // Distribute 固本 (15% of base value to buyer and referrer)
      const baseValue = parseFloat(product.baseValue);
      const gubenAmount = Math.floor(baseValue * 0.15);

      // Buyer gets 固本
      await addGubenEntry({
        memberId: member.id,
        amount: gubenAmount,
        type: "PURCHASE_EARN",
        orderId: order.id,
        description: `固本 from purchase: ${product.name}`,
        expiresAt: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59),
      });

      // Referrer gets 固本
      if (member.referrerId) {
        await addGubenEntry({
          memberId: member.referrerId,
          amount: gubenAmount,
          type: "REFERRAL_EARN",
          orderId: order.id,
          description: `固本 from referral purchase: ${product.name}`,
          expiresAt: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59),
        });
      }

      // Update VIP package count
      if (product.category === "VIP_PACKAGE") {
        await updateMember(member.id, {
          vipPackagesBought: member.vipPackagesBought + (product.vipPackageCount || 1),
        });
        await checkAndUpgradeRank(member.id);
      }

      // Distribute org bonuses to SM+ ancestors
      await distributeOrgBonus(member.id, baseValue, order.id);

      return order;
    }),

  createBirthdayOrder: protectedProcedure
    .input(
      z.object({
        items: z.array(z.object({ productId: z.number(), quantity: z.number().min(1).max(1) })),
        paymentMethod: z.enum(["ONLINE_TRANSFER", "OFFLINE_PAYMENT"]),
        paymentProofUrl: z.string().optional(),
        shippingAddress: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      if (!member.birthdayVerified) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Birthday not verified" });
      }
      const now = new Date();
      const birthMonth = member.birthday?.slice(5, 7);
      const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
      if (birthMonth !== currentMonth) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Birthday discount only available in your birth month" });
      }

      // Check max 3 different products
      const maxBirthdayProducts = parseInt((await getSetting("birthday_max_products")) ?? "3");
      if (input.items.length > maxBirthdayProducts) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Max ${maxBirthdayProducts} different products for birthday order` });
      }

      let totalAmount = 0;
      const orderItemsData = [];
      for (const item of input.items) {
        const product = await getProductById(item.productId);
        if (!product || !product.birthdayEligible) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Product not eligible for birthday discount" });
        }
        const halfPrice = parseFloat(product.price) / 2;
        totalAmount += halfPrice * item.quantity;
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: String(halfPrice),
          baseValue: product.baseValue,
        });
      }

      const orderNo = generateOrderNo();
      const order = await createOrder(
        {
          orderNo,
          memberId: member.id,
          orderType: "BIRTHDAY_ORDER",
          status: input.paymentMethod === "OFFLINE_PAYMENT" ? "PENDING_VERIFICATION" : "PROCESSING",
          paymentMethod: input.paymentMethod,
          paymentProofUrl: input.paymentProofUrl,
          totalAmount: String(totalAmount),
          gubenUsed: 0,
          shippingAddress: input.shippingAddress,
        },
        orderItemsData
      );

      // Distribute 固本
      for (const item of orderItemsData) {
        const baseValue = parseFloat(item.baseValue);
        const gubenAmount = Math.floor(baseValue * 0.15);
        await addGubenEntry({
          memberId: member.id,
          amount: gubenAmount,
          type: "PURCHASE_EARN",
          orderId: order.id,
          description: `固本 from birthday purchase`,
          expiresAt: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59),
        });
      }

      return order;
    }),

  createRedemptionOrder: protectedProcedure
    .input(
      z.object({
        items: z.array(z.object({ productId: z.number(), quantity: z.number().min(1) })),
        shippingAddress: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      let totalGuben = 0;
      const orderItemsData = [];
      for (const item of input.items) {
        const product = await getProductById(item.productId);
        if (!product || product.category !== "REDEMPTION_ITEM") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Product not redeemable" });
        }
        const points = parseFloat(product.price); // price = points needed
        totalGuben += points * item.quantity;
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
          baseValue: product.baseValue,
        });
      }

      if (member.gubenBalance < totalGuben) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient 固本 points" });
      }

      const orderNo = generateOrderNo();
      const order = await createOrder(
        {
          orderNo,
          memberId: member.id,
          orderType: "REDEMPTION_ORDER",
          status: "PROCESSING",
          paymentMethod: "GUBEN_POINTS",
          totalAmount: "0",
          gubenUsed: totalGuben,
          shippingAddress: input.shippingAddress,
        },
        orderItemsData
      );

      await addGubenEntry({
        memberId: member.id,
        amount: -totalGuben,
        type: "REDEEM",
        orderId: order.id,
        description: `固本 redeemed for products`,
      });

      return order;
    }),

  validateVipCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const vipCode = await getVipCodeByCode(input.code);
      if (!vipCode || vipCode.isUsed) return null;
      const product = await getProductById(vipCode.productId);
      return { ...vipCode, product };
    }),
});

// ─── Bonus Router ─────────────────────────────────────────────────────────────

const bonusRouter = router({
  gubenLedger: protectedProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional() }))
    .query(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) return [];
      return getGubenLedger(member.id, input.from, input.to);
    }),

  bonusLedger: protectedProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional() }))
    .query(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) return [];
      return getBonusLedger(member.id, input.from, input.to);
    }),

  topup: protectedProcedure
    .input(
      z.object({
        type: z.enum(["CASH", "BONUS_CONVERT"]),
        amount: z.number().positive(),
        paymentProofUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.type === "BONUS_CONVERT") {
        const bonusAmt = parseFloat(member.bonusBalance);
        if (bonusAmt < input.amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient bonus balance" });
        }
        // Deduct from bonus
        await addBonusEntry({
          memberId: member.id,
          amount: String(-input.amount),
          type: "WITHDRAWAL",
          description: `Converted to 固本`,
        });
        // Add to 固本
        await addGubenEntry({
          memberId: member.id,
          amount: input.amount,
          type: "BONUS_CONVERT",
          description: `Converted from bonus RM${input.amount}`,
          expiresAt: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59),
        });
        return { success: true, status: "APPROVED" };
      }

      // CASH topup - needs admin approval
      const topup = await createTopup({
        memberId: member.id,
        type: "CASH",
        amount: String(input.amount),
        gubenPoints: input.amount,
        paymentProofUrl: input.paymentProofUrl,
        status: "PENDING",
      });
      return { success: true, status: "PENDING", topup };
    }),

  myTopups: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) return [];
    return getTopupsByMember(member.id);
  }),

  withdraw: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        bankName: z.string(),
        bankAccount: z.string(),
        accountHolder: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      if (!isSMOrAbove(member.rank)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "SM rank or above required for withdrawal" });
      }
      if (parseFloat(member.bonusBalance) < input.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient bonus balance" });
      }
      const withdrawal = await createWithdrawal({
        memberId: member.id,
        amount: String(input.amount),
        bankName: input.bankName,
        bankAccount: input.bankAccount,
        accountHolder: input.accountHolder,
        status: "PENDING",
      });
      return withdrawal;
    }),

  myWithdrawals: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) return [];
    return getWithdrawalsByMember(member.id);
  }),
});

// ─── Announcement Router ──────────────────────────────────────────────────────

const announcementRouter = router({
  list: publicProcedure.query(() => getPublishedAnnouncements()),
});

// ─── Admin Router ─────────────────────────────────────────────────────────────

const adminRouter = router({
  // Stats overview
  stats: adminProcedure.query(async () => {
    const allMembers = await getAllMembers();
    const allOrders = await getAllOrders({});
    const pendingOrders = allOrders.filter((o) => ["PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(o.status)).length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = allOrders
      .filter((o) => o.status === "DELIVERED" && new Date(o.createdAt) >= monthStart)
      .reduce((sum, o) => sum + parseFloat(o.totalAmount ?? "0"), 0);
    return { totalMembers: allMembers.length, pendingOrders, monthlyRevenue };
  }),

  // Members with pagination and search
  members: adminProcedure
    .input(z.object({ search: z.string().optional(), rank: z.string().optional(), page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const all = await getAllMembers();
      let filtered = all;
      if (input.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(({ member, user }) =>
          (user?.name ?? "").toLowerCase().includes(s) ||
          member.referralCode.toLowerCase().includes(s) ||
          (member.phone ?? "").includes(s)
        );
      }
      if (input.rank) filtered = filtered.filter(({ member }) => member.rank === input.rank);
      const total = filtered.length;
      const start = (input.page - 1) * input.limit;
      // Build referrer map for quick lookup
      const referrerMap: Record<number, string> = {};
      for (const { member, user } of all) {
        referrerMap[member.id] = user?.name ?? member.referralCode;
      }
      const members = filtered.slice(start, start + input.limit).map(({ member, user }) => ({
        ...member,
        userName: user?.name ?? null,
        userEmail: user?.email ?? null,
        referrerName: member.referrerId ? (referrerMap[member.referrerId] ?? null) : null,
      }));
      return { members, total, hasMore: start + input.limit < total };
    }),

  // Export members to Excel
  exportMembers: adminProcedure
    .input(z.object({ rank: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const XLSX = await import("xlsx");
      const all = await getAllMembers();
      // Build referrer name map from all members data
      // Map: member.id -> member name
      const referrerMap: Record<number, string> = {};
      for (const { member, user } of all) {
        referrerMap[member.id] = user?.name ?? "";
      }
      
      const rows = all
        .filter(({ member }) => !input?.rank || member.rank === input.rank)
        .map(({ member, user }) => ({
          ID: member.id,
          姓名: user?.name ?? "",
          邮箱: user?.email ?? "",
          手机: member.phone ?? "",
          推荐码: member.referralCode,
          推荐人: member.referrerId ? referrerMap[member.referrerId] ?? "" : "",
          身份等级: member.rank,
          固本积分: member.gubenBalance,
          奖金余额: member.bonusBalance,
          直推VIP: member.directVipReferrals,
          直推M代理: member.directMAgentReferrals,
          VIP配套数: member.vipPackagesBought,
          生日认证: member.birthdayVerified ? "是" : "否",
          注册时间: member.createdAt.toISOString().split("T")[0],
        }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Members");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const base64 = Buffer.from(buf as any).toString("base64");
      return { base64 };
    }),

  memberDetail: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const member = await getMemberById(input.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      const referrer = member.referrerId ? await getMemberById(member.referrerId) : null;
      const direct = await getDirectReferrals(member.id);
      return { member, referrer, direct };
    }),

  updateMember: adminProcedure
    .input(
      z.object({
        id: z.number(),
        rank: z.enum(["VIP", "M_AGENT", "SM", "GM", "CEO"]).optional(),
        birthdayVerified: z.boolean().optional(),
        isActive: z.boolean().optional(),
        phone: z.string().optional(),
        birthday: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMember(id, data);
      return getMemberById(id);
    }),

  // Orders with pagination
  orders: adminProcedure
    .input(z.object({ status: z.string().optional(), search: z.string().optional(), page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const all = await getAllOrders({ status: input.status as any });
      let filtered = all;
      if (input.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter((o) => o.orderNo.toLowerCase().includes(s));
      }
      const total = filtered.length;
      const start = (input.page - 1) * input.limit;
      const pageOrders = filtered.slice(start, start + input.limit);
      const db = await getDb();
      // Enrich each order with member name, products, and VIP codes
      const enriched = await Promise.all(pageOrders.map(async (order) => {
        const member = await getMemberById(order.memberId);
        const memberUser = member ? await getUserById(member.userId) : null;
        const items = db ? await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)) : [];
        const productList: string[] = [];
        for (const item of items) {
          const product = await getProductById(item.productId);
          if (product) productList.push(`${product.name} x${item.quantity}`);
        }
        let vipCodes: string[] = [];
        if (order.orderType === "AGENT_ORDER" && db) {
          const codes = await db.select({ code: vipPaymentCodes.code }).from(vipPaymentCodes).where(eq(vipPaymentCodes.agentOrderId, order.id));
          vipCodes = codes.map(c => c.code);
        }
        return {
          ...order,
          memberName: memberUser?.name ?? "未知会员",
          products: productList,
          vipCodes,
        };
      }));
      return { orders: enriched, total, hasMore: start + input.limit < total };
    }),

  // Export orders
  exportOrders: adminProcedure
    .input(z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional())
    .mutation(async () => {
      const XLSX = await import("xlsx");
      const all = await getAllOrders({});
      const db = await getDb();
      const rows = [];
      
      for (const order of all) {
        // Get member info
        const member = await getMemberById(order.memberId);
        const memberUser = member ? await getUserById(member.userId) : null;
        
        // Get order items and product names
        const items = db ? await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)) : [];
        const productNames = [];
        for (const item of items) {
          const product = await getProductById(item.productId);
          if (product) {
            productNames.push(`${product.name}(x${item.quantity})`);
          }
        }
        
        // Get VIP codes generated from this agent order
        let vipCodesList = "";
        if (order.orderType === "AGENT_ORDER" && db) {
          const codes = await db.select({ code: vipPaymentCodes.code }).from(vipPaymentCodes).where(eq(vipPaymentCodes.agentOrderId, order.id));
          vipCodesList = codes.map(c => c.code).join("; ");
        }
        
        rows.push({
          订单号: order.orderNo,
          下单人: memberUser?.name ?? "",
          产品: productNames.join("; ") || "",
          送货地址: order.shippingAddress ?? "",
          出货点: order.shippingLocation === "KK_AGENT" ? "KK代理商" : order.shippingLocation === "PUCHONG_HQ" ? "Puchong总部" : "",
          订单类型: order.orderType,
          订单状态: order.status,
          金额: order.totalAmount,
          付款方式: order.paymentMethod ?? "",
          付款证明: order.paymentProofUrl ?? "",
          VIP_Code: vipCodesList,
          时间: order.createdAt.toISOString().split("T")[0],
        });
      }
      
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const base64 = Buffer.from(buf as any).toString("base64");
      return { base64 };
    }),

  // Export bonuses
  exportBonuses: adminProcedure
    .input(z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const XLSX = await import("xlsx");
      const from = input?.dateFrom ? new Date(input.dateFrom) : undefined;
      const to = input?.dateTo ? new Date(input.dateTo) : undefined;
      const bonusEntries = await getAllBonusLedger(from, to);
      const rows = bonusEntries.map((e) => ({
        会员ID: e.memberId,
        类型: e.type,
        金额: e.amount,
        说明: e.description ?? "",
        时间: e.createdAt.toISOString(),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bonuses");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const base64 = Buffer.from(buf as any).toString("base64");
      return { base64 };
    }),

  // Bonus report with pagination
  bonusReport: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(30), dateFrom: z.string().optional(), dateTo: z.string().optional() }))
    .query(async ({ input }) => {
      const from = input.dateFrom ? new Date(input.dateFrom) : undefined;
      const to = input.dateTo ? new Date(input.dateTo) : undefined;
      const bonusEntries = await getAllBonusLedger(from, to);
      const gubenEntries = await getAllGubenLedger(from, to);
      const totalBonus = bonusEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalGuben = gubenEntries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
      const all = await getAllMembers();
      const memberMap = new Map(all.map(({ member, user }) => [member.id, user?.name ?? "Unknown"]));
      const start = (input.page - 1) * input.limit;
      const entries = bonusEntries.slice(start, start + input.limit).map((e) => ({
        ...e,
        memberName: memberMap.get(e.memberId) ?? "Unknown",
        bonusAmount: e.amount,
        gubenAmount: null as number | null,
      }));
      return { entries, totalBonus, totalGuben, hasMore: start + input.limit < bonusEntries.length };
    }),

  // Manual bonus allocation
  manualBonus: adminProcedure
    .input(z.object({ memberId: z.number(), type: z.string(), bonusAmount: z.number().optional(), gubenAmount: z.number().optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      if (input.bonusAmount !== undefined) {
        await addBonusEntry({ memberId: input.memberId, amount: String(input.bonusAmount), type: input.type as any, description: input.description });
      }
      if (input.gubenAmount !== undefined) {
        await addGubenEntry({ memberId: input.memberId, amount: input.gubenAmount, type: input.type as any, description: input.description });
      }
      return { success: true };
    }),

  // Pending topups
  pendingTopups: adminProcedure.query(async () => {
    const all = await getAllTopups();
    const allMembers = await getAllMembers();
    const memberMap = new Map(allMembers.map(({ member, user }) => [member.id, user?.name ?? "Unknown"]));
    return all.filter((t) => t.status === "PENDING").map((t) => ({ ...t, memberName: memberMap.get(t.memberId) ?? "Unknown" }));
  }),

  // Approve/reject topup
  approveTopup: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const allTopups = await getAllTopups();
      const topup = allTopups.find((t) => t.id === input.id);
      if (!topup) throw new TRPCError({ code: "NOT_FOUND" });
      await updateTopupStatus(input.id, "APPROVED");
      await addGubenEntry({ memberId: topup.memberId, amount: topup.gubenPoints, type: "TOPUP", description: `Cash top-up approved: RM${topup.amount}`, expiresAt: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59) });
      return { success: true };
    }),

  rejectTopup: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateTopupStatus(input.id, "REJECTED");
      return { success: true };
    }),

  // Pending withdrawals
  pendingWithdrawals: adminProcedure.query(async () => {
    const all = await getAllWithdrawals();
    const allMembers = await getAllMembers();
    const memberMap = new Map(allMembers.map(({ member, user }) => [member.id, user?.name ?? "Unknown"]));
    return all.filter((w) => ["PENDING", "APPROVED"].includes(w.status)).map((w) => ({ ...w, memberName: memberMap.get(w.memberId) ?? "Unknown" }));
  }),

  approveWithdrawal: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const all = await getAllWithdrawals();
      const w = all.find((w) => w.id === input.id);
      if (!w) throw new TRPCError({ code: "NOT_FOUND" });
      await updateWithdrawalStatus(input.id, "APPROVED");
      await addBonusEntry({ memberId: w.memberId, amount: String(-parseFloat(w.amount)), type: "WITHDRAWAL", description: `Withdrawal approved: RM${w.amount}` });
      return { success: true };
    }),

  rejectWithdrawal: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateWithdrawalStatus(input.id, "REJECTED");
      return { success: true };
    }),

  markWithdrawalPaid: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateWithdrawalStatus(input.id, "PAID");
      return { success: true };
    }),

  // Product CRUD
  createProduct: adminProcedure
    .input(z.object({ name: z.string(), description: z.string().optional(), category: z.string(), price: z.number(), baseValue: z.number(), agentPrice: z.number().optional(), imageUrl: z.string().optional(), isActive: z.boolean().default(true), zone: z.enum(["VIP", "AGENT", "BOTH"]).optional() }))
    .mutation(async ({ input }) => {
      let zone = input.zone;
      if (!zone) {
        zone = ["AGENT_PACKAGE", "AGENT_ITEM"].includes(input.category) ? "AGENT" : ["VIP_PACKAGE", "VIP_BENEFIT_ITEM", "BIRTHDAY_ITEM", "REDEMPTION_ITEM"].includes(input.category) ? "VIP" : "BOTH";
      }
      return upsertProduct({ name: input.name, description: input.description, category: input.category as any, price: String(input.price), baseValue: String(input.baseValue), agentPrice: input.agentPrice ? String(input.agentPrice) : undefined, imageUrl: input.imageUrl, isActive: input.isActive, zone: zone as any, birthdayEligible: input.category === "BIRTHDAY_ITEM", birthdayMaxQty: 1, vipPackageCount: input.category === "VIP_PACKAGE" ? 1 : 0 });
    }),

  updateProduct: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), price: z.number().optional(), baseValue: z.number().optional(), agentPrice: z.number().optional(), imageUrl: z.string().optional(), isActive: z.boolean().optional(), zone: z.enum(["VIP", "AGENT", "BOTH"]).optional() }))
    .mutation(async ({ input }) => {
      const { id, price, baseValue, agentPrice, zone, ...rest } = input;
      return upsertProduct({ id, ...rest, price: price ? String(price) : undefined, baseValue: baseValue ? String(baseValue) : undefined, agentPrice: agentPrice ? String(agentPrice) : undefined, zone: zone as any } as any);
    }),

  deleteProduct: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return upsertProduct({ id: input.id, isActive: false } as any);
    }),

  // Announcement CRUD
  createAnnouncement: adminProcedure
    .input(z.object({ title: z.string(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      return upsertAnnouncement({ title: input.title, content: input.content, isPublished: true, publishedAt: new Date(), createdBy: member?.id ?? 0 });
    }),

  updateAnnouncement: adminProcedure
    .input(z.object({ id: z.number(), title: z.string().optional(), content: z.string().optional() }))
    .mutation(async ({ input }) => {
      return upsertAnnouncement({ id: input.id, title: input.title ?? "", content: input.content ?? "", isPublished: true, createdBy: 0 });
    }),

  // Settings get/update
  getSettings: adminProcedure.query(async () => {
    const all = await getAllSettings();
    return Object.fromEntries(all.map((s) => [s.key, s.value]));
  }),

  updateSettings: adminProcedure
    .input(z.record(z.string(), z.string()))
    .mutation(async ({ input }) => {
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined && value !== "") await setSetting(key, String(value), undefined);
      }
      return { success: true };
    }),

  updateOrderStatus: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        status: z.enum(["PENDING_PAYMENT", "PENDING_VERIFICATION", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateOrderStatus(input.orderId, input.status, input.notes);
      return { success: true };
    }),

  // Products
  products: adminProcedure.query(() => getProducts(undefined, false)),

  upsertProduct: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        price: z.string(),
        baseValue: z.string(),
        agentPrice: z.string().optional(),
        category: z.enum(["VIP_PACKAGE", "VIP_BENEFIT_ITEM", "BIRTHDAY_ITEM", "REDEMPTION_ITEM", "AGENT_PACKAGE", "AGENT_ITEM", "ASSESSMENT_ITEM"]),
        zone: z.enum(["VIP", "AGENT", "BOTH"]),
        isActive: z.boolean().default(true),
        birthdayEligible: z.boolean().default(false),
        birthdayMaxQty: z.number().default(1),
        vipPackageCount: z.number().default(0),
        stock: z.number().optional(),
      })
    )
    .mutation(({ input }) => upsertProduct(input as any)),

  // Bonus management
  gubenLedger: adminProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional() }))
    .query(({ input }) => getAllGubenLedger(input.from, input.to)),

  bonusLedger: adminProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional() }))
    .query(({ input }) => getAllBonusLedger(input.from, input.to)),

  manualGubenAdjust: adminProcedure
    .input(z.object({ memberId: z.number(), amount: z.number(), description: z.string() }))
    .mutation(async ({ input }) => {
      await addGubenEntry({
        memberId: input.memberId,
        amount: input.amount,
        type: "ADMIN_ADJUST",
        description: input.description,
      });
      return { success: true };
    }),

  manualBonusAdjust: adminProcedure
    .input(z.object({ memberId: z.number(), amount: z.string(), description: z.string() }))
    .mutation(async ({ input }) => {
      await addBonusEntry({
        memberId: input.memberId,
        amount: input.amount,
        type: "ADMIN_ADJUST",
        description: input.description,
      });
      return { success: true };
    }),

  // Top-ups (legacy query)
  topups: adminProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional() }))
    .query(({ input }) => getAllTopups(input.from, input.to)),

  // Withdrawals (legacy query)
  withdrawals: adminProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional() }))
    .query(({ input }) => getAllWithdrawals(input.from, input.to)),

  // Announcements (legacy query)
  announcements: adminProcedure.query(() => getAllAnnouncements()),

  upsertAnnouncement: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        title: z.string(),
        content: z.string(),
        isPublished: z.boolean().default(false),
        publishedAt: z.date().optional(),
        createdBy: z.number(),
      })
    )
    .mutation(({ input }) => upsertAnnouncement(input as any)),

  // Settings (legacy)
  settings: adminProcedure.query(() => getAllSettings()),

  setSetting: adminProcedure
    .input(z.object({ key: z.string(), value: z.string(), description: z.string().optional() }))
    .mutation(({ input }) => setSetting(input.key, input.value, input.description)),

  // Year-end dividend report
  yearEndReport: adminProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input }) => {
      const allMembers = await getAllMembers();
      const results = [];
      for (const { member } of allMembers) {
        if (!isSMOrAbove(member.rank)) continue;
        const income = await getAnnualIncome(member.id, input.year);
        let rate = 0;
        if (member.rank === "CEO" && income >= 50000) rate = 0.15;
        else if (member.rank === "GM" && income >= 12000) rate = 0.12;
        else if (member.rank === "SM" && income >= 5000) rate = 0.10;
        if (rate > 0) results.push({ memberId: member.id, rank: member.rank, income, rate, dividend: income * rate });
      }
      return results;
    }),

  // Import members from data
  importMembers: adminProcedure
    .input(
      z.array(
        z.object({
          name: z.string(),
          phone: z.string().optional(),
          birthday: z.string().optional(),
          rank: z.enum(["VIP", "M_AGENT", "SM", "GM", "CEO"]).default("VIP"),
          referralCode: z.string().optional(),
          openId: z.string(),
        })
      )
    )
    .mutation(async ({ input }) => {
      let created = 0;
      for (const row of input) {
        try {
          await upsertUser({ openId: row.openId, name: row.name });
          const user = await import("./db").then((m) => m.getUserByOpenId(row.openId));
          if (!user) continue;
          const existing = await getMemberByUserId(user.id);
          if (existing) continue;
          let referrerId: number | undefined;
          if (row.referralCode) {
            const ref = await getMemberByReferralCode(row.referralCode);
            if (ref) referrerId = ref.id;
          }
          await createMember({
            userId: user.id,
            referralCode: generateReferralCode(),
            referrerId,
            rank: row.rank,
            phone: row.phone,
            birthday: row.birthday,
            gubenBalance: 0,
            bonusBalance: "0.00",
            vipPackagesBought: 0,
            directVipReferrals: 0,
            directMAgentReferrals: 0,
            isActive: true,
            birthdayVerified: false,
          });
          created++;
        } catch (e) {
          console.error("Import error for", row.name, e);
        }
      }
      return { created };
    }),

  downloadTemplate: adminProcedure.mutation(async () => {
    const XLSX = await import("xlsx");
    const templateData = [
      { openId: "user_001", name: "张三", phone: "60123456789", birthday: "1990-01-15", referralCode: "推荐人码", rank: "VIP" },
      { openId: "user_002", name: "李四", phone: "60187654321", birthday: "1995-06-20", referralCode: "推荐人码", rank: "VIP" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    const instructionData = [
      ["会员批量导入操作说明"],
      [""],
      ["字段说明:"],
      ["openId", "用户唯一标识，必填，不能重复"],
      ["name", "会员姓名，必填"],
      ["phone", "手机号码，选填"],
      ["birthday", "生日日期，格式YYYY-MM-DD，选填"],
      ["referralCode", "推荐人的推荐码，选填"],
      ["rank", "会员等级，必填，可选值：VIP, M-AGENT, SM, GM, CEO"],
      [""],
      ["注意事项:"],
      ["1. openId必须唯一，系统会检查重复"],
      ["2. 如果openId已存在，该行会被跳过"],
      ["3. referralCode必须是有效的推荐码"],
      ["4. 每行最多处理一条记录"],
      ["5. 导入过程中出错的行会被记录"],
    ];
    const instructionWs = XLSX.utils.aoa_to_sheet(instructionData);
    XLSX.utils.book_append_sheet(wb, instructionWs, "说明");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const binary = String.fromCharCode.apply(null, buf as any);
    const base64 = btoa(binary);
    return { base64, filename: "会员导入模板.xlsx" };
  }),

  validateImport: adminProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            openId: z.string(),
            name: z.string(),
            phone: z.string().optional(),
            birthday: z.string().optional(),
            referralCode: z.string().optional(),
            rank: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const errors: Array<{ row: number; error: string }> = [];
      const validRanks = ["VIP", "M-AGENT", "SM", "GM", "CEO"];
      for (let i = 0; i < input.data.length; i++) {
        const row = input.data[i];
        if (!row.openId?.trim()) errors.push({ row: i + 1, error: "openId不能为空" });
        if (!row.name?.trim()) errors.push({ row: i + 1, error: "name不能为空" });
        if (row.rank && !validRanks.includes(row.rank)) errors.push({ row: i + 1, error: "rank无效" });
        if (row.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(row.birthday)) errors.push({ row: i + 1, error: "birthday格式错误" });
        if (row.referralCode) {
          const ref = await getMemberByReferralCode(row.referralCode);
          if (!ref) errors.push({ row: i + 1, error: "referralCode无效" });
        }
      }
      return { valid: errors.length === 0, errors, totalRows: input.data.length };
    }),

  exportMemberDetails: adminProcedure.mutation(async () => {
    const allMembers = await getAllMembers();
    const data = allMembers.map(({ member, user }) => ({
      referralCode: member.referralCode,
      rank: member.rank,
      phone: member.phone || "",
      gubenBalance: member.gubenBalance,
      bonusBalance: member.bonusBalance,
      directVipReferrals: member.directVipReferrals,
      createdAt: member.createdAt,
    }));
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const binary = String.fromCharCode.apply(null, buf as any);
    const base64 = btoa(binary);
    return { base64, filename: "members.xlsx" };
  }),

  getUpgradeConditions: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(upgradeConditions);
  }),

  updateUpgradeCondition: adminProcedure
    .input(z.object({
      rank: z.enum(["VIP", "M_AGENT", "SM", "GM", "CEO"]),
      requiredDirectVips: z.number().optional(),
      requiredVipPackages: z.number().optional(),
      dividendRate: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData: any = {};
      if (input.requiredDirectVips !== undefined) updateData.requiredDirectVips = input.requiredDirectVips;
      if (input.requiredVipPackages !== undefined) updateData.requiredVipPackages = input.requiredVipPackages;
      if (input.dividendRate !== undefined) updateData.dividendRate = input.dividendRate.toString();
      await db.update(upgradeConditions).set(updateData)
        .where(eq(upgradeConditions.rank, input.rank));
      return { success: true };
    }),

  allocateBonus: adminProcedure
    .input(z.object({
      memberId: z.number(),
      type: z.enum(["GUBEN", "BONUS"]),
      amount: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(manualBonusAllocations).values({
        memberId: input.memberId,
        type: input.type,
        amount: input.amount.toString(),
        reason: input.reason,
        allocatedBy: ctx.user.id,
      });
      const member = await getMemberById(input.memberId);
      if (member) {
        if (input.type === "GUBEN") {
          await updateMember(input.memberId, {
            gubenBalance: member.gubenBalance + input.amount,
          });
        } else {
          await updateMember(input.memberId, {
            bonusBalance: (parseFloat(member.bonusBalance) + input.amount).toString(),
          });
        }
      }
      return { success: true };
    }),

  orderReport: adminProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const allOrders = await getAllOrders({});
      const filtered = allOrders.filter(o => {
        const oDate = new Date(o.createdAt);
        return oDate >= new Date(input.startDate) && oDate <= new Date(input.endDate);
      });
      return filtered;
    }),

  exportOrderReport: adminProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .mutation(async ({ input }) => {
      const XLSX = await import("xlsx");
      const allOrders = await getAllOrders({});
      const filtered = allOrders.filter(o => {
        const oDate = new Date(o.createdAt);
        return oDate >= new Date(input.startDate) && oDate <= new Date(input.endDate);
      });
      const rows = filtered.map(o => ({
        订单号: o.orderNo,
        类型: o.orderType,
        状态: o.status,
        总金额: o.totalAmount,
        创建时间: o.createdAt.toISOString(),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const base64 = Buffer.from(buf as any).toString("base64");
      return { base64 };
    }),

  getCalculationBases: adminProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(productCalculationBase)
        .where(eq(productCalculationBase.productId, input.productId));
    }),

  setCalculationBase: adminProcedure
    .input(z.object({
      productId: z.number(),
      zone: z.enum(["VIP", "AGENT", "BOTH"]),
      gubenBase: z.number(),
      bonusBase: z.number(),
      gubenRate: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(productCalculationBase)
        .where(and(
          eq(productCalculationBase.productId, input.productId),
          eq(productCalculationBase.zone, input.zone)
        ));
      if (existing.length > 0) {
        await db.update(productCalculationBase)
          .set({
            gubenBase: input.gubenBase.toString(),
            bonusBase: input.bonusBase.toString(),
            gubenRate: input.gubenRate.toString(),
          })
          .where(eq(productCalculationBase.id, existing[0].id));
      } else {
        await db.insert(productCalculationBase).values({
          productId: input.productId,
          zone: input.zone,
          gubenBase: input.gubenBase.toString(),
          bonusBase: input.bonusBase.toString(),
          gubenRate: input.gubenRate.toString(),
        });
      }
      return { success: true };
    }),

});

// ─── Bonus Distribution Logic ─────────────────────────────────────────────────

async function checkAndUpgradeRank(memberId: number) {
  const member = await getMemberById(memberId);
  if (!member) return;

  let newRank = member.rank;

  if (member.rank === "VIP") {
    if (member.vipPackagesBought >= 12 || member.directVipReferrals >= 12) {
      newRank = "M_AGENT";
    }
  } else if (member.rank === "M_AGENT") {
    if (member.vipPackagesBought >= 36 || member.directMAgentReferrals >= 10) {
      newRank = "SM";
    }
  }
  // GM and CEO upgrades require admin verification (3 orgs with SM/GM)

  if (newRank !== member.rank) {
    await updateMember(memberId, { rank: newRank });
    // If upgraded to M_AGENT, update parent's directMAgentReferrals
    if (newRank === "M_AGENT" && member.referrerId) {
      const parent = await getMemberById(member.referrerId);
      if (parent) {
        await updateMember(parent.id, {
          directMAgentReferrals: parent.directMAgentReferrals + 1,
        });
        await checkAndUpgradeRank(parent.id);
      }
    }
  }
}

async function distributeOrgBonus(buyerMemberId: number, baseValue: number, orderId: number) {
  const ancestors = await getAncestors(buyerMemberId, 20);
  const periodMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  let smBonusAlreadyTaken = false;

  for (const ancestor of ancestors) {
    if (!isSMOrAbove(ancestor.rank)) continue;

    let bonusRate = 0;
    if (ancestor.rank === "SM") {
      bonusRate = 0.10;
    } else if (ancestor.rank === "GM") {
      bonusRate = smBonusAlreadyTaken ? 0.05 : 0.15;
    } else if (ancestor.rank === "CEO") {
      bonusRate = 0.05; // simplified
    }

    if (bonusRate > 0) {
      const bonusAmount = baseValue * bonusRate;
      await addBonusEntry({
        memberId: ancestor.id,
        amount: String(bonusAmount),
        type: "ORG_BONUS",
        orderId,
        description: `Org bonus (${(bonusRate * 100).toFixed(0)}%) from team purchase`,
        periodMonth,
      });

      // Distribute gratitude bonus (30%/10%/10% to up to 3 levels above this SM)
      await distributeGratitudeBonus(ancestor.id, bonusAmount, orderId, periodMonth);
    }

    if (ancestor.rank === "SM") smBonusAlreadyTaken = true;
  }
}

async function distributeGratitudeBonus(
  smMemberId: number,
  smBonusAmount: number,
  orderId: number,
  periodMonth: string
) {
  // Check if SM's own org bonus >= RM300 threshold (simplified: distribute regardless for now)
  const ancestors = await getAncestors(smMemberId, 3);
  const rates = [0.30, 0.10, 0.10];

  for (let i = 0; i < Math.min(ancestors.length, 3); i++) {
    const ancestor = ancestors[i];
    if (!isSMOrAbove(ancestor.rank)) continue;
    const gratitudeAmount = smBonusAmount * rates[i];
    await addBonusEntry({
      memberId: ancestor.id,
      amount: String(gratitudeAmount),
      type: "GRATITUDE_BONUS",
      orderId,
      description: `Gratitude bonus (${(rates[i] * 100).toFixed(0)}%) from SM level ${i + 1}`,
      periodMonth,
    });
  }
}

// ─── App Router ───────────────────────────────────────────────────────────────

const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const member = await getMemberByUserId(ctx.user.id);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      return getMemberNotifications(member.id, input.limit, input.offset);
    }),
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });
    return getUnreadNotificationCount(member.id);
  }),
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      await markNotificationAsRead(input.notificationId);
      return { success: true };
    }),
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const member = await getMemberByUserId(ctx.user.id);
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });
    await markAllNotificationsAsRead(member.id);
    return { success: true };
  }),
  delete: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteNotification(input.notificationId);
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  member: memberRouter,
  product: productRouter,
  order: orderRouter,
  bonus: bonusRouter,
  announcement: announcementRouter,
  notification: notificationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
