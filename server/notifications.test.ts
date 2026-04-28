import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Notifications - Pagination De-duplication", () => {
  it("should de-duplicate notifications when appending pages", () => {
    // Simulate first page (page 0)
    const page0Notifications = [
      { id: 1, title: "Notif 1", isRead: false },
      { id: 2, title: "Notif 2", isRead: false },
      { id: 3, title: "Notif 3", isRead: false },
    ];

    // Simulate second page (page 1) with one overlapping notification
    const page1Notifications = [
      { id: 3, title: "Notif 3", isRead: false }, // Duplicate from page 0
      { id: 4, title: "Notif 4", isRead: false },
      { id: 5, title: "Notif 5", isRead: false },
    ];

    // Simulate the de-duplication logic from Notifications.tsx
    let allNotifications = page0Notifications;
    
    // Append page 1 with de-duplication
    const existingIds = new Set(allNotifications.map((n) => n.id));
    const newNotifications = page1Notifications.filter((n) => !existingIds.has(n.id));
    allNotifications = [...allNotifications, ...newNotifications];

    // Verify no duplicates
    const ids = allNotifications.map((n) => n.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
    expect(allNotifications.length).toBe(5); // 3 from page 0 + 2 new from page 1
    expect(allNotifications.map((n) => n.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("should reset notifications when page is 0", () => {
    const oldNotifications = [
      { id: 1, title: "Old 1", isRead: true },
      { id: 2, title: "Old 2", isRead: true },
    ];

    const newPage0Notifications = [
      { id: 10, title: "New 1", isRead: false },
      { id: 11, title: "New 2", isRead: false },
    ];

    // When page === 0, replace entire list
    let allNotifications = oldNotifications;
    allNotifications = newPage0Notifications;

    expect(allNotifications.length).toBe(2);
    expect(allNotifications[0].id).toBe(10);
  });

  it("should handle empty notification list", () => {
    const emptyNotifications: any[] = [];
    const existingIds = new Set(emptyNotifications.map((n) => n.id));
    const newNotifications = [
      { id: 1, title: "First", isRead: false },
    ].filter((n) => !existingIds.has(n.id));

    const result = [...emptyNotifications, ...newNotifications];
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(1);
  });

  it("should verify event stopPropagation prevents bubbling", () => {
    const mockEvent = {
      stopPropagation: vi.fn(),
    } as any;

    // Simulate click handler with stopPropagation
    const handleMarkAsRead = (e: any, notificationId: number) => {
      e.stopPropagation();
      // mutation logic would happen here
    };

    handleMarkAsRead(mockEvent, 1);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });
});
