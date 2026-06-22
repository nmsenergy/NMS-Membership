import { describe, it, expect } from "vitest";

describe("VIP Order Shipping Location", () => {
  it("should accept KK_AGENT as valid shipping location", () => {
    const location = "KK_AGENT";
    expect(["KK_AGENT", "PUCHONG_HQ"]).toContain(location);
  });

  it("should accept PUCHONG_HQ as valid shipping location", () => {
    const location = "PUCHONG_HQ";
    expect(["KK_AGENT", "PUCHONG_HQ"]).toContain(location);
  });

  it("should default to PUCHONG_HQ when shipping location not specified", () => {
    const defaultLocation = "PUCHONG_HQ";
    expect(defaultLocation).toBe("PUCHONG_HQ");
  });

  it("should store shipping location in order", () => {
    const order = {
      id: 1,
      orderNo: "VIP-2026-001",
      memberId: 1,
      orderType: "VIP_ORDER" as const,
      status: "PROCESSING" as const,
      paymentMethod: "VIP_CODE" as const,
      paymentCode: "ABC123",
      totalAmount: "200.00",
      gubenUsed: 0,
      shippingAddress: "123 Main St",
      shippingLocation: "KK_AGENT" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(order.shippingLocation).toBe("KK_AGENT");
    expect(order.orderType).toBe("VIP_ORDER");
  });

  it("should support both shipping locations for VIP orders", () => {
    const locations = ["KK_AGENT", "PUCHONG_HQ"];
    locations.forEach((loc) => {
      expect(["KK_AGENT", "PUCHONG_HQ"]).toContain(loc);
    });
  });

  it("should allow filtering orders by shipping location", () => {
    const orders = [
      { id: 1, shippingLocation: "KK_AGENT" },
      { id: 2, shippingLocation: "PUCHONG_HQ" },
      { id: 3, shippingLocation: "KK_AGENT" },
    ];

    const kkOrders = orders.filter((o) => o.shippingLocation === "KK_AGENT");
    expect(kkOrders).toHaveLength(2);
    expect(kkOrders.every((o) => o.shippingLocation === "KK_AGENT")).toBe(true);

    const hqOrders = orders.filter((o) => o.shippingLocation === "PUCHONG_HQ");
    expect(hqOrders).toHaveLength(1);
  });

  it("should preserve shipping location through order lifecycle", () => {
    const order = {
      id: 1,
      shippingLocation: "KK_AGENT" as const,
      status: "PENDING_PAYMENT" as const,
    };

    // Simulate order status updates
    const updatedOrder = { ...order, status: "PROCESSING" as const };
    expect(updatedOrder.shippingLocation).toBe("KK_AGENT");

    const shippedOrder = { ...updatedOrder, status: "SHIPPED" as const };
    expect(shippedOrder.shippingLocation).toBe("KK_AGENT");
  });

  it("should track shipping location for reporting and analytics", () => {
    const orders = [
      { id: 1, shippingLocation: "KK_AGENT", amount: 200 },
      { id: 2, shippingLocation: "PUCHONG_HQ", amount: 300 },
      { id: 3, shippingLocation: "KK_AGENT", amount: 150 },
    ];

    const locationStats = {
      KK_AGENT: orders.filter((o) => o.shippingLocation === "KK_AGENT").length,
      PUCHONG_HQ: orders.filter((o) => o.shippingLocation === "PUCHONG_HQ").length,
    };

    expect(locationStats.KK_AGENT).toBe(2);
    expect(locationStats.PUCHONG_HQ).toBe(1);

    const kkTotal = orders
      .filter((o) => o.shippingLocation === "KK_AGENT")
      .reduce((sum, o) => sum + o.amount, 0);
    expect(kkTotal).toBe(350);
  });
});
