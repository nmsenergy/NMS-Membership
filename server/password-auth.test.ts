import { describe, it, expect, beforeEach, vi } from "vitest";
import * as bcrypt from "bcryptjs";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/trpc";

// Mock database functions
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getUserById: vi.fn(),
    updateUser: vi.fn(),
    getDb: vi.fn(),
  };
});

// Helper to create a mock context
function createMockContext(userId: number = 1, isAdmin = false): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `openid-${userId}`,
      name: `User ${userId}`,
      email: `user${userId}@test.com`,
      loginMethod: "password",
      passwordHash: null,
      role: isAdmin ? "admin" : "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    member: null,
    req: {
      headers: { cookie: "" },
    } as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("Password Authentication", () => {
  describe("changePassword", () => {
    it("should change password when current password is correct", async () => {
      const db = await import("./db");
      const currentPassword = "oldPassword123";
      const newPassword = "newPassword456";
      const passwordHash = await bcrypt.hash(currentPassword, 10);

      vi.mocked(db.getUserById).mockResolvedValue({
        id: 1,
        openId: "openid-1",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "password",
        passwordHash,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });

      vi.mocked(db.updateUser).mockResolvedValue(undefined);

      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.member.changePassword({
        currentPassword,
        newPassword,
      });

      expect(result.success).toBe(true);
      expect(db.updateUser).toHaveBeenCalledWith(1, expect.objectContaining({
        passwordHash: expect.any(String),
      }));

      // Verify new password hash is different from old one
      const callArgs = vi.mocked(db.updateUser).mock.calls[0];
      const newHash = callArgs[1].passwordHash;
      expect(newHash).not.toBe(passwordHash);
      expect(await bcrypt.compare(newPassword, newHash as string)).toBe(true);
    });

    it("should fail when current password is incorrect", async () => {
      const db = await import("./db");
      const currentPassword = "wrongPassword";
      const correctPassword = "correctPassword123";
      const passwordHash = await bcrypt.hash(correctPassword, 10);

      vi.mocked(db.getUserById).mockResolvedValue({
        id: 1,
        openId: "openid-1",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "password",
        passwordHash,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });

      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.member.changePassword({
          currentPassword,
          newPassword: "newPassword456",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
        expect(error.message).toContain("Current password is incorrect");
      }
    });

    it("should fail when user has no password set", async () => {
      const db = await import("./db");

      vi.mocked(db.getUserById).mockResolvedValue({
        id: 1,
        openId: "openid-1",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "oauth",
        passwordHash: null, // No password set
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });

      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.member.changePassword({
          currentPassword: "anyPassword",
          newPassword: "newPassword456",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
        expect(error.message).toContain("Password not set");
      }
    });

    it("should enforce minimum password length", async () => {
      const db = await import("./db");
      const passwordHash = await bcrypt.hash("currentPassword123", 10);

      vi.mocked(db.getUserById).mockResolvedValue({
        id: 1,
        openId: "openid-1",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "password",
        passwordHash,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });

      const ctx = createMockContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.member.changePassword({
          currentPassword: "currentPassword123",
          newPassword: "short", // Less than 6 characters
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  });

  describe("resetMemberPassword (admin only)", () => {
    it("should generate temporary password when admin resets", async () => {
      const db = await import("./db");

      vi.mocked(db.updateUser).mockResolvedValue(undefined);

      const ctx = createMockContext(1, true); // Admin user
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.resetMemberPassword({
        userId: 2,
      });

      expect(result.tempPassword).toBeDefined();
      expect(result.tempPassword.length).toBeGreaterThan(0);
      expect(result.tempPassword.length).toBeLessThanOrEqual(8);

      expect(db.updateUser).toHaveBeenCalledWith(2, expect.objectContaining({
        passwordHash: expect.any(String),
      }));

      // Verify that a password hash was generated and stored
      const callArgs = vi.mocked(db.updateUser).mock.calls[0];
      const passwordHash = callArgs[1].passwordHash as string;
      expect(passwordHash).toBeDefined();
      expect(passwordHash.length).toBeGreaterThan(0);
      // bcrypt hashes start with $2a$, $2b$, $2x$, or $2y$
      expect(passwordHash.startsWith('$2')).toBe(true);
    });

    it("should not allow non-admin to reset passwords", async () => {
      const ctx = createMockContext(1, false); // Regular user
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.admin.resetMemberPassword({
          userId: 2,
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("loginWithPassword", () => {
    it("should successfully login with correct credentials", async () => {
      const db = await import("./db");
      const email = "user@example.com";
      const password = "correctPassword123";
      const passwordHash = await bcrypt.hash(password, 10);

      // Mock database select
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 1,
            openId: "openid-1",
            name: "Test User",
            email,
            loginMethod: "password",
            passwordHash,
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          },
        ]),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);
      vi.mocked(db.updateUser).mockResolvedValue(undefined);

      const ctx = createMockContext(0); // Unauthenticated
      ctx.user = null as any;
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.loginWithPassword({
        email,
        password,
      });

      expect(result.success).toBe(true);
      expect(ctx.res.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
        })
      );
      expect(db.updateUser).toHaveBeenCalledWith(1, expect.objectContaining({
        lastSignedIn: expect.any(Date),
      }));
    });

    it("should fail with incorrect password", async () => {
      const db = await import("./db");
      const email = "user@example.com";
      const correctPassword = "correctPassword123";
      const wrongPassword = "wrongPassword";
      const passwordHash = await bcrypt.hash(correctPassword, 10);

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 1,
            openId: "openid-1",
            name: "Test User",
            email,
            loginMethod: "password",
            passwordHash,
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          },
        ]),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const ctx = createMockContext(0);
      ctx.user = null as any;
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.loginWithPassword({
          email,
          password: wrongPassword,
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
        expect(error.message).toContain("Invalid email or password");
      }
    });

    it("should fail with non-existent email", async () => {
      const db = await import("./db");

      const whereChain = {
        limit: vi.fn().mockResolvedValue([]),
      };
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue(whereChain),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const ctx = createMockContext(0);
      ctx.user = null as any;
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.loginWithPassword({
          email: "nonexistent@example.com",
          password: "anyPassword",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
        expect(error.message).toContain("Invalid email or password");
      }
    });

    it("should fail when user has no password set (OAuth-only user)", async () => {
      const db = await import("./db");
      const email = "oauth-user@example.com";

      const whereChain = {
        limit: vi.fn().mockResolvedValue([
          {
            id: 1,
            openId: "openid-1",
            name: "OAuth User",
            email,
            loginMethod: "oauth",
            passwordHash: null, // No password set
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          },
        ]),
      };
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue(whereChain),
      };

      vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

      const ctx = createMockContext(0);
      ctx.user = null as any;
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.loginWithPassword({
          email,
          password: "anyPassword",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
        expect(error.message).toContain("Invalid email or password");
      }
    });
  });
});
