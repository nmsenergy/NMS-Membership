import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Member, User } from "../../drizzle/schema";
import { getMemberById, getMemberByUserId } from "../db";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /**
   * The "active" member for this request.
   * If the authenticated user has switched to a downline member, this is that
   * downline member; otherwise it is the user's own member record.
   * Always null when the user is not authenticated or has no member record.
   */
  effectiveMember: Member | null;
  /** The user's own member record, regardless of any account switch. */
  ownMember: Member | null;
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

  let ownMember: Member | null = null;
  let effectiveMember: Member | null = null;

  if (user) {
    try {
      const m = await getMemberByUserId(user.id);
      if (m) {
        ownMember = m;
        // If the member has switched to a downline account, use that as the effective member
        if (m.switchedToMemberId) {
          const switched = await getMemberById(m.switchedToMemberId);
          effectiveMember = switched ?? m;
        } else {
          effectiveMember = m;
        }
      }
    } catch {
      // Non-fatal: member lookup failure should not break public procedures
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    effectiveMember,
    ownMember,
  };
}
