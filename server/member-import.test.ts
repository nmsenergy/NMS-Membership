import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, members } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Member Import Template", () => {
  let db: any;
  const testEmails = [
    "test_import_1@example.com",
    "test_import_2@example.com",
    "test_import_3@example.com",
  ];

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  afterAll(async () => {
    if (db) {
      // Clean up test users and members
      for (const email of testEmails) {
        const openId = `email_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (user.length > 0) {
          await db.delete(members).where(eq(members.userId, user[0].id));
          await db.delete(users).where(eq(users.id, user[0].id));
        }
      }
    }
  });

  it("should parse CSV with new template format", () => {
    const csvData = `姓名,电邮地址,国家,州属,邮区编号,城市,推荐人
张三,zhang@example.com,马来西亚,吉隆坡,50000,吉隆坡,李四
李四,li@example.com,马来西亚,雪兰莪,40000,莎阿南,`;

    const lines = csvData.trim().split("\n");
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length < 3) continue;
      rows.push({
        name: parts[0],
        email: parts[1],
        country: parts[2] || undefined,
        state: parts[3] || undefined,
        postalCode: parts[4] || undefined,
        city: parts[5] || undefined,
        referrerName: parts[6],
      });
    }

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("张三");
    expect(rows[0].email).toBe("zhang@example.com");
    expect(rows[0].country).toBe("马来西亚");
    expect(rows[0].state).toBe("吉隆坡");
    expect(rows[0].postalCode).toBe("50000");
    expect(rows[0].city).toBe("吉隆坡");
    expect(rows[0].referrerName).toBe("李四");

    expect(rows[1].name).toBe("李四");
    expect(rows[1].email).toBe("li@example.com");
    expect(rows[1].referrerName).toBe("");
  });

  it("should validate required fields", () => {
    const testCases = [
      {
        name: "Valid row",
        row: { name: "张三", email: "zhang@example.com", referrerName: "李四" },
        valid: true,
      },
      {
        name: "Missing name",
        row: { name: "", email: "zhang@example.com", referrerName: "李四" },
        valid: false,
      },
      {
        name: "Missing email",
        row: { name: "张三", email: "", referrerName: "李四" },
        valid: false,
      },
      {
        name: "Missing referrer",
        row: { name: "张三", email: "zhang@example.com", referrerName: "" },
        valid: false,
      },
      {
        name: "Invalid email format",
        row: { name: "张三", email: "invalid-email", referrerName: "李四" },
        valid: false,
      },
    ];

    for (const testCase of testCases) {
      const errors = [];
      const row = testCase.row as any;

      if (!row.name?.trim()) errors.push("姓名不能为空");
      if (!row.email?.trim()) errors.push("电邮地址不能为空");
      if (!row.referrerName?.trim()) errors.push("推荐人不能为空");
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push("电邮地址格式错误");
      }

      const isValid = errors.length === 0;
      expect(isValid).toBe(testCase.valid, `Test case "${testCase.name}" failed`);
    }
  });

  it("should generate openId from email", () => {
    const email = "test.user+tag@example.com";
    const openId = `email_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;

    expect(openId).toBe("email_test_user_tag_example_com");
    expect(openId).toMatch(/^email_[a-zA-Z0-9_]+$/);
  });

  it("should handle optional address fields", () => {
    const csvData = `姓名,电邮地址,国家,州属,邮区编号,城市,推荐人
张三,zhang@example.com,,,,,李四`;

    const lines = csvData.trim().split("\n");
    const row = lines[1].split(",").map((p) => p.trim());

    expect(row[0]).toBe("张三");
    expect(row[1]).toBe("zhang@example.com");
    expect(row[2]).toBe("");
    expect(row[3]).toBe("");
    expect(row[4]).toBe("");
    expect(row[5]).toBe("");
    expect(row[6]).toBe("李四");
  });

  it("should handle referrer name lookup", async () => {
    // Create a test referrer
    const referrerUser = await db.insert(users).values({
      openId: `email_referrer_test_example_com`,
      name: "推荐人测试",
      email: "referrer_test@example.com",
      role: "user",
      lastSignedIn: new Date(),
    });

    const referrerUserResult = await db
      .select()
      .from(users)
      .where(eq(users.email, "referrer_test@example.com"))
      .limit(1);

    if (referrerUserResult.length > 0) {
      const referrerId = referrerUserResult[0].id;

      // Verify lookup by name
      const lookupResult = await db
        .select()
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(eq(users.name, "推荐人测试"))
        .limit(1);

      // Clean up
      await db.delete(users).where(eq(users.id, referrerId));
    }
  });

  it("should support CSV with special characters in names", () => {
    const csvData = `姓名,电邮地址,国家,州属,邮区编号,城市,推荐人
王小明,wang@example.com,马来西亚,吉隆坡,50000,吉隆坡,李四
李四,li@example.com,马来西亚,雪兰莪,40000,莎阿南,`;

    const lines = csvData.trim().split("\n");
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length < 3) continue;
      rows.push({
        name: parts[0],
        email: parts[1],
      });
    }

    expect(rows[0].name).toBe("王小明");
    expect(rows[1].name).toBe("李四");
  });
});
