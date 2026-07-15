import { describe, expect, it } from "vitest";
import {
  isTransientError,
  isValidEmail,
  isValidPhone,
  nextStatusFromFailure,
  parseChannels,
} from "./logic";

describe("workflow-alert-processor logic", () => {
  it("parses and deduplicates supported channels", () => {
    expect(parseChannels("email,sms,email,pager")).toEqual(["email", "sms"]);
  });

  it("classifies transient transport errors", () => {
    expect(isTransientError(new Error("Timeout while calling downstream service"))).toBe(true);
    expect(isTransientError(new Error("MessageRejected"))).toBe(false);
  });

  it("requeues transient failures below retry cap", () => {
    expect(nextStatusFromFailure(1, 3, true)).toBe("queued");
    expect(nextStatusFromFailure(3, 3, true)).toBe("failed");
    expect(nextStatusFromFailure(1, 3, false)).toBe("failed");
  });

  it("validates email and phone shapes", () => {
    expect(isValidEmail("alerts@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidPhone("+12055001784")).toBe(true);
    expect(isValidPhone("2055001784")).toBe(false);
  });
});
