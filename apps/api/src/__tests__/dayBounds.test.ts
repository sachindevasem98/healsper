import { describe, it, expect } from "vitest";
import { dayBoundsUtc } from "../lib/dayBounds";

describe("dayBoundsUtc", () => {
  it("returns server-local bounds when no timezone given", () => {
    const { start, end } = dayBoundsUtc();
    expect(end.getTime() - start.getTime()).toBe(86400000);
  });

  it("returns a 24h window for a known timezone", () => {
    const { start, end } = dayBoundsUtc("Asia/Kolkata");
    expect(end.getTime() - start.getTime()).toBe(86400000);
  });

  it("ISO date parts fall on the requested timezone's calendar day", () => {
    const { start } = dayBoundsUtc("Asia/Kolkata");
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const tzMidnightInUtc = start;
    const tzParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(tzMidnightInUtc);
    expect(tzParts).toBe(parts);
  });
});