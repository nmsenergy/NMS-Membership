import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Member, User } from "../../drizzle/schema";
import { getMemberById, getMemberByUserId } from "../db";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** The user's own member record. Always null when the user is not authenticated or has no member record. */
  member: Member | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  let member: Member | null = null;

  if (user) {
    try {
      const m = await getMemberByUserId(user.id);
      member = m ?? null;
    } catch {
      // Non-fatal: member lookup failure should not break public procedures
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    member,
  };
}
