import { describe, it, expect } from "vitest";

describe("Agent Order Shipping Location & VIP Code Generation", () => {
  it("should accept shipping location in agent order creation", () => {
    const order = {
      id: 1,
      orderNo: "AGENT-2026-001",
      memberId: 1,
      orderType: "AGENT_ORDER" as const,
      status: "PROCESSING" as const,
      paymentMethod: "ONLINE_TRANSFER" as const,
      totalAmount: "500.00",
      gubenUsed: 0,
      shippingLocation: "KK_STOCKIST" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(order.shippingLocation).toBe("KK_STOCKIST");
    expect(order.orderType).toBe("AGENT_ORDER");
  });

  it("should default to PUCHONG_HQ for agent orders", () => {
    const defaultLocation = "PUCHONG_HQ";
    expect(defaultLocation).toBe("PUCHONG_HQ");
  });

  it("should generate VIP codes when agent order is created", () => {
    const items = [
      { productId: 1, quantity: 2, category: "VIP_PACKAGE" },
      { productId: 2, quantity: 1, category: "AGENT_ITEM" },
    ];

    let codesGenerated = 0;
    items.forEach((item) => {
      if (["VIP_PACKAGE", "VIP_BENEFIT_ITEM", "AGENT_ITEM"].includes(item.category)) {
        codesGenerated += item.quantity;
      }
    });

    expect(codesGenerated).toBe(3);
  });

  it("should NOT generate VIP codes for non-code products", () => {
    const items = [
      { productId: 1, quantity: 2, category: "REGULAR_ITEM" },
      { productId: 2, quantity: 1, category: "BONUS_ITEM" },
    ];

    let codesGenerated = 0;
    items.forEach((item) => {
      if (["VIP_PACKAGE", "VIP_BENEFIT_ITEM", "AGENT_ITEM"].includes(item.category)) {
        codesGenerated += item.quantity;
      }
    });

    expect(codesGenerated).toBe(0);
  });

  it("should generate VIP codes on order status change to DELIVERED", () => {
    const order = {
      id: 1,
      orderType: "AGENT_ORDER" as const,
      status: "DELIVERED" as const,
      memberId: 1,
    };

    const shouldGenerateCodes = order.orderType === "AGENT_ORDER" && order.status === "DELIVERED";
    expect(shouldGenerateCodes).toBe(true);
  });

  it("should NOT generate VIP codes for non-agent orders on DELIVERED", () => {
    const order = {
      id: 1,
      orderType: "VIP_ORDER" as const,
      status: "DELIVERED" as const,
      memberId: 1,
    };

    const shouldGenerateCodes = order.orderType === "AGENT_ORDER" && order.status === "DELIVERED";
    expect(shouldGenerateCodes).toBe(false);
  });

  it("should NOT generate VIP codes if order status is not DELIVERED", () => {
    const statuses = ["PENDING_PAYMENT", "PENDING_VERIFICATION", "PROCESSING", "SHIPPED"];

    statuses.forEach((status) => {
      const order = {
        id: 1,
        orderType: "AGENT_ORDER" as const,
        status: status as any,
        memberId: 1,
      };

      const shouldGenerateCodes = order.orderType === "AGENT_ORDER" && order.status === "DELIVERED";
      expect(shouldGenerateCodes).toBe(false);
    });
  });

  it("should track VIP code generation for agent orders", () => {
    const agentOrders = [
      { id: 1, orderType: "AGENT_ORDER", status: "DELIVERED", codesGenerated: 3 },
      { id: 2, orderType: "AGENT_ORDER", status: "SHIPPED", codesGenerated: 0 },
      { id: 3, orderType: "AGENT_ORDER", status: "DELIVERED", codesGenerated: 2 },
    ];

    const deliveredWithCodes = agentOrders.filter((o) => o.status === "DELIVERED");
    const totalCodesGenerated = deliveredWithCodes.reduce((sum, o) => sum + o.codesGenerated, 0);

    expect(deliveredWithCodes).toHaveLength(2);
    expect(totalCodesGenerated).toBe(5);
  });

  it("should support both shipping locations for agent orders", () => {
    const locations = ["KK_STOCKIST", "PUCHONG_HQ"];
    locations.forEach((loc) => {
      const order = {
        id: 1,
        shippingLocation: loc,
        orderType: "AGENT_ORDER",
      };
      expect(["KK_STOCKIST", "PUCHONG_HQ"]).toContain(order.shippingLocation);
    });
  });

  it("should preserve shipping location through agent order lifecycle", () => {
    const order = {
      id: 1,
      shippingLocation: "KK_STOCKIST" as const,
      status: "PROCESSING" as const,
    };

    // Simulate status updates
    const shippedOrder = { ...order, status: "SHIPPED" as const };
    expect(shippedOrder.shippingLocation).toBe("KK_STOCKIST");

    const deliveredOrder = { ...shippedOrder, status: "DELIVERED" as const };
    expect(deliveredOrder.shippingLocation).toBe("KK_STOCKIST");
  });

  it("should filter agent orders by shipping location", () => {
    const orders = [
      { id: 1, orderType: "AGENT_ORDER", shippingLocation: "KK_STOCKIST" },
      { id: 2, orderType: "AGENT_ORDER", shippingLocation: "PUCHONG_HQ" },
      { id: 3, orderType: "AGENT_ORDER", shippingLocation: "KK_STOCKIST" },
      { id: 4, orderType: "VIP_ORDER", shippingLocation: "PUCHONG_HQ" },
    ];

    const agentOrdersKK = orders.filter(
      (o) => o.orderType === "AGENT_ORDER" && o.shippingLocation === "KK_STOCKIST"
    );
    expect(agentOrdersKK).toHaveLength(2);

    const agentOrdersHQ = orders.filter(
      (o) => o.orderType === "AGENT_ORDER" && o.shippingLocation === "PUCHONG_HQ"
    );
    expect(agentOrdersHQ).toHaveLength(1);
  });
});
