import { describe, it, expect, vi } from "vitest";
import { filterDevices, qrAssetId, isDue, seedData, today } from "./domain";
describe("registry", () => {
  const { devices } = seedData();
  it("searches asset IDs ignoring case and spaces", () =>
    expect(filterDevices(devices, " bme-0001 ", "", "")).toHaveLength(1));
  it("searches Arabic names", () =>
    expect(filterDevices(devices, "غسيل", "", "")).toHaveLength(1));
  it("searches serial numbers", () =>
    expect(filterDevices(devices, "SN-70231", "", "")).toHaveLength(1));
  it("combines department and status filters", () =>
    expect(filterDevices(devices, "", "icu", "down")).toHaveLength(1));
  it("returns no devices for missing values", () =>
    expect(filterDevices(devices, "missing", "", "")).toHaveLength(0));
  it("extracts deep links without navigating to untrusted URLs", () =>
    expect(qrAssetId("https://example.com/?asset=BME-0001")).toBe("BME-0001"));
  it("accepts bare asset IDs", () =>
    expect(qrAssetId(" BME-0002 ")).toBe("BME-0002"));
  it("rejects an unrelated QR URL", () =>
    expect(() => qrAssetId("https://example.com/")).toThrow());
  it("rejects empty QR", () => expect(() => qrAssetId(" ")).toThrow());
  it("treats today as due and handles missing dates", () => {
    expect(isDue({ nextPmDate: today() })).toBe(true);
    expect(isDue({})).toBe(false);
    expect(isDue({ nextPmDate: "2999-01-01" })).toBe(false);
  });
});
