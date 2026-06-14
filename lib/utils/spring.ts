export interface MotionSpringConfig {
  type: "spring";
  stiffness: number;
  damping: number;
  mass?: number;
}

export function createMotionSpring(
  stiffness = 150,
  damping = 15,
  mass?: number,
): MotionSpringConfig {
  return {
    type: "spring",
    stiffness,
    damping,
    ...(mass === undefined ? {} : { mass }),
  };
}
