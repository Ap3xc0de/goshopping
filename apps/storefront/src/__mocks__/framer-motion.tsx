/* apps/storefront/src/__mocks__/framer-motion.tsx
 * Clean mock that strips framer-motion specific props before passing to DOM
 */
import React from 'react';

const FRAMER_PROPS = new Set([
  'initial', 'animate', 'exit', 'variants', 'transition',
  'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView',
  'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
  'layout', 'layoutId', 'onAnimationComplete', 'onAnimationStart',
  'viewport', 'custom', 'inherit', 'onHoverStart', 'onHoverEnd',
  'onTap', 'onTapStart', 'onTapCancel',
]);

function stripFramerProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in props) {
    if (!FRAMER_PROPS.has(key)) {
      result[key] = props[key];
    }
  }
  return result;
}

function createMotionComponent(Tag: keyof JSX.IntrinsicElements) {
  return function MotionComponent({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
    const cleanProps = stripFramerProps(props);
    return React.createElement(Tag, cleanProps, children);
  };
}

const motion = new Proxy({} as Record<string, ReturnType<typeof createMotionComponent>>, {
  get(_, tag: string) {
    return createMotionComponent(tag as keyof JSX.IntrinsicElements);
  },
});

const AnimatePresence = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
const useAnimation = () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() });
const useMotionValue = (initial: unknown) => ({ get: () => initial, set: jest.fn() });
const useTransform = (_v: unknown, _input: unknown, output: unknown[]) => ({ get: () => output[0] });
const useInView = () => [null, true];
const useScroll = () => ({ scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 } });

export {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  useInView,
  useScroll,
};
