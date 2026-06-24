import { getDb } from "./db";
import { users, members } from "../drizzle/schema";
import { inArray } from "drizzle-orm";

export async function getReferrerNames(memberIds: number[]): Promise<Record<number, string>> {
  const db = await getDb();
  if (!db) return {};

  const referrerMap: Record<number, string> = {};
  
  // Get all members with their referrer IDs
  const allMembers = await db.select({ id: members.id, referrerId: members.referrerId }).from(members);
  
  // Collect all unique referrer IDs
  const referrerIds = new Set<number>();
  allMembers.forEach(m => {
    if (m.referrerId) referrerIds.add(m.referrerId);
  });

  // If we have referrer IDs, fetch their names
  if (referrerIds.size > 0) {
    const referrerUsers = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, Array.from(referrerIds)));
    
    referrerUsers.forEach(u => {
      referrerMap[u.id] = u.name ?? "";
    });
  }

  return referrerMap;
}
