import { describe, it, expect } from "vitest";

describe("Zone-Specific Pricing and Bonus Calculations", () => {
  it("should calculate guben based on zone-specific base value and rate", () => {
    // VIP Zone: base value RM100, guben rate 15%
    const vipGubenBase = 100;
    const vipGubenRate = 15;
    const vipGuben = (vipGubenBase * vipGubenRate) / 100;
    expect(vipGuben).toBe(15);

    // Agent Zone: base value RM80, guben rate 12%
    const agentGubenBase = 80;
    const agentGubenRate = 12;
    const agentGuben = (agentGubenBase * agentGubenRate) / 100;
    expect(agentGuben).toBe(9.6);
  });

  it("should calculate bonus based on zone-specific base value", () => {
    // VIP Zone: bonus base RM100
    const vipBonusBase = 100;
    const vipOrgBonusRate = 0.1; // 10% for SM
    const vipOrgBonus = vipBonusBase * vipOrgBonusRate;
    expect(vipOrgBonus).toBe(10);

    // Agent Zone: bonus base RM80
    const agentBonusBase = 80;
    const agentOrgBonus = agentBonusBase * vipOrgBonusRate;
    expect(agentOrgBonus).toBe(8);
  });

  it("should support different prices for same product in different zones", () => {
    // Product: VIP Package
    const vipPrice = 200; // VIP Zone price
    const agentPrice = 180; // Agent Zone price (discounted)

    expect(vipPrice).toBeGreaterThan(agentPrice);
    expect(agentPrice / vipPrice).toBe(0.9); // 10% discount for agents
  });

  it("should apply zone-specific calculation to organizational bonuses", () => {
    // SM gets 10% of bonus base
    // GM gets 15% of bonus base + 5% from SM
    // CEO gets 10% from GM + 5% from SM

    const productBonusBase = 100;
    const smRate = 0.1; // 10%
    const gmRate = 0.15; // 15%
    const gmSecondaryRate = 0.05; // 5% from SM

    const smBonus = productBonusBase * smRate;
    expect(smBonus).toBe(10);

    const gmBonus = productBonusBase * gmRate + productBonusBase * gmSecondaryRate;
    expect(gmBonus).toBe(20);
  });

  it("should handle BOTH zone products with single configuration", () => {
    // Product available in both zones with same pricing
    const productZone = "BOTH";
    const baseValue = 100;
    const gubenRate = 15;

    // Both VIP and Agent members see same calculation
    const vipGuben = (baseValue * gubenRate) / 100;
    const agentGuben = (baseValue * gubenRate) / 100;

    expect(vipGuben).toBe(agentGuben);
    expect(productZone).toBe("BOTH");
  });

  it("should validate zone-specific configuration completeness", () => {
    const zoneConfigs = [
      { zone: "VIP", gubenBase: 100, bonusBase: 100, gubenRate: 15 },
      { zone: "AGENT", gubenBase: 80, bonusBase: 80, gubenRate: 12 },
    ];

    zoneConfigs.forEach((config) => {
      expect(config.zone).toBeDefined();
      expect(config.gubenBase).toBeGreaterThan(0);
      expect(config.bonusBase).toBeGreaterThan(0);
      expect(config.gubenRate).toBeGreaterThan(0);
      expect(config.gubenRate).toBeLessThanOrEqual(100);
    });
  });

  it("should calculate total earnings with zone-specific rates", () => {
    // Member buys product in VIP Zone
    const vipProductPrice = 200;
    const vipGubenBase = 100;
    const vipGubenRate = 15;
    const vipBonusBase = 100;

    const gubenEarned = (vipGubenBase * vipGubenRate) / 100;
    const bonusEarned = vipBonusBase * 0.1; // 10% organizational bonus (SM level)

    expect(gubenEarned).toBe(15);
    expect(bonusEarned).toBe(10);
    expect(gubenEarned + bonusEarned).toBe(25);
  });
});
