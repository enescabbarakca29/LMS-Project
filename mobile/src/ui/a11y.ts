// src/ui/a11y.ts
import { Platform } from "react-native";

export const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export function a11yLabel(label: string) {
  // iOS/Android için aynı
  return { accessible: true, accessibilityLabel: label };
}

export function a11yHint(hint: string) {
  return { accessibilityHint: hint };
}

export const A11Y_ROLE_BUTTON = Platform.select({
  default: { accessibilityRole: "button" as const },
});
