import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RANK_LABELS: Record<string, string> = {
  VIP: "VIP会员",
  M_AGENT: "M代理",
  SM: "SM高级代理",
  GM: "GM总经理",
  CEO: "CEO执行长",
};

export const RANK_COLORS: Record<string, string> = {
  VIP: "rank-vip",
  M_AGENT: "rank-m_agent",
  SM: "rank-sm",
  GM: "rank-gm",
  CEO: "rank-ceo",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "待付款",
  PENDING_VERIFICATION: "待审核",
  PROCESSING: "处理中",
  SHIPPED: "已发货",
  DELIVERED: "已完成",
  CANCELLED: "已取消",
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
  VIP_ORDER: "VIP订单",
  AGENT_ORDER: "代理订单",
  BIRTHDAY_ORDER: "生日优惠订单",
  REDEMPTION_ORDER: "固本兑换订单",
};

export const CATEGORY_LABELS: Record<string, string> = {
  VIP_PACKAGE: "VIP配套",
  VIP_BENEFIT_ITEM: "VIP福利单品",
  BIRTHDAY_ITEM: "生日半价产品",
  REDEMPTION_ITEM: "兑换产品",
  AGENT_PACKAGE: "代理配套",
  AGENT_ITEM: "代理单品",
  ASSESSMENT_ITEM: "考核区产品",
};

export const BONUS_TYPE_LABELS: Record<string, string> = {
  PURCHASE_EARN: "购买获得",
  REFERRAL_EARN: "推荐获得",
  TOPUP: "现金充值",
  BONUS_CONVERT: "奖金转入",
  REDEEM: "兑换扣除",
  EXPIRE: "年度清零",
  ADMIN_ADJUST: "管理员调整",
  ORG_BONUS: "组织奖",
  GRATITUDE_BONUS: "感恩奖",
  YEAR_END_DIVIDEND: "年终花红",
  CAR_ALLOWANCE: "汽车供车津贴",
  TRAVEL_REWARD: "旅游奖励",
  SHAREHOLDER_DIVIDEND: "股东分红",
  WITHDRAWAL: "提现",
};

export function formatRM(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "RM 0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "RM 0.00";
  return `RM ${num.toFixed(2)}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-MY", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("zh-MY");
}

export function isAgentOrAbove(rank: string): boolean {
  return ["M_AGENT", "SM", "GM", "CEO"].includes(rank);
}

export function isSMOrAbove(rank: string): boolean {
  return ["SM", "GM", "CEO"].includes(rank);
}

export function getRankOrder(rank: string): number {
  const order: Record<string, number> = { VIP: 0, M_AGENT: 1, SM: 2, GM: 3, CEO: 4 };
  return order[rank] ?? 0;
}
