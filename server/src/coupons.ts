import type { Coupon } from "@prisma/client";

export type CouponError =
  | "COUPON_NOT_FOUND"
  | "COUPON_INACTIVE"
  | "COUPON_EXPIRED"
  | "COUPON_EXHAUSTED"
  | "COUPON_WRONG_COURSE"
  | "COUPON_CUSTOM_PRICE";

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

export function validateCouponForCourse(
  coupon: Coupon,
  courseId: string,
  coursePrice: number,
  customPrice = false
): { discountAmount: number; finalPrice: number } | CouponError {
  if (customPrice) return "COUPON_CUSTOM_PRICE";
  if (!coupon.active) return "COUPON_INACTIVE";
  if (coupon.expiresAt && coupon.expiresAt <= new Date()) return "COUPON_EXPIRED";
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return "COUPON_EXHAUSTED";
  if (coupon.courseId && coupon.courseId !== courseId) return "COUPON_WRONG_COURSE";

  const discountAmount = computeDiscount(coupon, coursePrice);
  const finalPrice = Math.max(0, roundMoney(coursePrice - discountAmount));

  return { discountAmount, finalPrice };
}

function computeDiscount(coupon: Coupon, price: number) {
  if (coupon.discountType === "percent") {
    const pct = Math.min(100, Math.max(0, coupon.discountValue));
    return roundMoney((price * pct) / 100);
  }
  return roundMoney(Math.min(coupon.discountValue, price));
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

export const couponErrorMessages: Record<CouponError, string> = {
  COUPON_NOT_FOUND: "Invalid coupon code",
  COUPON_INACTIVE: "This coupon is no longer active",
  COUPON_EXPIRED: "This coupon has expired",
  COUPON_EXHAUSTED: "This coupon has reached its usage limit",
  COUPON_WRONG_COURSE: "This coupon does not apply to this course",
  COUPON_CUSTOM_PRICE: "Coupons cannot be applied to courses with custom pricing",
};
