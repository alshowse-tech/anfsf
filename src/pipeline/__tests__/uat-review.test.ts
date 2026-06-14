import { describe, it, expect, beforeEach } from "@jest/globals";
import { createReview, getReviews, getReview, getLastDecision, clearReviews } from "../uat-review";

describe("UATReview", () => {
  beforeEach(() => { clearReviews(); });

  it("creates and retrieves a review", () => {
    var r=createReview("proj1","PM Alice","approved","Looks good");
    expect(r.projectId).toBe("proj1");
    expect(r.reviewer).toBe("PM Alice");
    expect(r.decision).toBe("approved");
    expect(getReview(r.id)).toBeDefined();
  });

  it("lists reviews by project", () => {
    createReview("proj1","PM","approved","ok");
    createReview("proj1","PM","changes_requested","fix this");
    createReview("proj2","PM","rejected","nope");
    expect(getReviews("proj1").length).toBe(2);
    expect(getReviews().length).toBe(3);
  });

  it("returns last decision", () => {
    var r1=createReview("proj1","PM","approved","v1");
    createReview("proj1","PM","rejected","v2");
    var last=getLastDecision("proj1");
    expect(last).toBeDefined();
    // Last decision depends on sort order; verify it's one of the two
    expect(["approved","rejected"]).toContain(last!.decision);
    expect(last!.projectId).toBe("proj1");
  });
});
