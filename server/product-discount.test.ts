import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { products } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Product Discount Feature", () => {
  let db: any;
  let testProductId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test product
    const result = await db.insert(products).values({
      name: "Test Product for Discount",
      description: "Test product",
      category: "VIP_PACKAGE",
      price: "100.00",
      baseValue: "50.00",
      isActive: true,
      zone: "VIP",
      isDiscount: false,
      birthdayEligible: false,
      birthdayMaxQty: 1,
      vipPackageCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Get the inserted product ID
    const inserted = await db.select().from(products).where(eq(products.name, "Test Product for Discount")).limit(1);
    if (inserted.length > 0) {
      testProductId = inserted[0].id;
    }
  });

  afterAll(async () => {
    if (db && testProductId) {
      await db.delete(products).where(eq(products.id, testProductId));
    }
  });

  it("should toggle product discount status from false to true", async () => {
    const before = await db.select().from(products).where(eq(products.id, testProductId)).limit(1);
    expect(before[0].isDiscount).toBe(false);

    // Toggle discount
    await db.update(products).set({ isDiscount: true }).where(eq(products.id, testProductId));

    const after = await db.select().from(products).where(eq(products.id, testProductId)).limit(1);
    expect(after[0].isDiscount).toBe(true);
  });

  it("should toggle product discount status from true to false", async () => {
    // First set to true
    await db.update(products).set({ isDiscount: true }).where(eq(products.id, testProductId));

    const before = await db.select().from(products).where(eq(products.id, testProductId)).limit(1);
    expect(before[0].isDiscount).toBe(true);

    // Toggle back to false
    await db.update(products).set({ isDiscount: false }).where(eq(products.id, testProductId));

    const after = await db.select().from(products).where(eq(products.id, testProductId)).limit(1);
    expect(after[0].isDiscount).toBe(false);
  });

  it("should maintain other product fields when toggling discount", async () => {
    const original = await db.select().from(products).where(eq(products.id, testProductId)).limit(1);
    const originalName = original[0].name;
    const originalPrice = original[0].price;

    // Toggle discount
    await db.update(products).set({ isDiscount: true }).where(eq(products.id, testProductId));

    const after = await db.select().from(products).where(eq(products.id, testProductId)).limit(1);
    expect(after[0].name).toBe(originalName);
    expect(after[0].price).toBe(originalPrice);
    expect(after[0].isDiscount).toBe(true);
  });

  it("should allow filtering products by discount status", async () => {
    // Set test product as discount
    await db.update(products).set({ isDiscount: true }).where(eq(products.id, testProductId));

    // Query all products with isDiscount = true
    const discountProducts = await db.select().from(products).where(eq(products.isDiscount, true));

    // Verify test product is in the list
    const found = discountProducts.find((p: any) => p.id === testProductId);
    expect(found).toBeDefined();
    expect(found.isDiscount).toBe(true);
  });

  it("should handle multiple products with different discount statuses", async () => {
    // Create another test product
    const result2 = await db.insert(products).values({
      name: "Test Product 2 for Discount",
      description: "Test product 2",
      category: "VIP_BENEFIT_ITEM",
      price: "50.00",
      baseValue: "25.00",
      isActive: true,
      zone: "VIP",
      isDiscount: true,
      birthdayEligible: false,
      birthdayMaxQty: 1,
      vipPackageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const inserted2 = await db.select().from(products).where(eq(products.name, "Test Product 2 for Discount")).limit(1);
    const testProductId2 = inserted2[0].id;

    // Set first product as discount
    await db.update(products).set({ isDiscount: true }).where(eq(products.id, testProductId));

    // Query discount products
    const discountProducts = await db.select().from(products).where(eq(products.isDiscount, true));

    // Both should be in the list
    const found1 = discountProducts.find((p: any) => p.id === testProductId);
    const found2 = discountProducts.find((p: any) => p.id === testProductId2);
    expect(found1).toBeDefined();
    expect(found2).toBeDefined();

    // Clean up
    await db.delete(products).where(eq(products.id, testProductId2));
  });

  it("should correctly identify discount products in product list", async () => {
    // Ensure test product is marked as discount
    await db.update(products).set({ isDiscount: true }).where(eq(products.id, testProductId));

    // Get all products
    const allProducts = await db.select().from(products);

    // Find test product
    const testProduct = allProducts.find((p: any) => p.id === testProductId);
    expect(testProduct).toBeDefined();
    expect(testProduct.isDiscount).toBe(true);

    // Verify other fields are intact
    expect(testProduct.name).toBe("Test Product for Discount");
    expect(testProduct.category).toBe("VIP_PACKAGE");
  });
});
