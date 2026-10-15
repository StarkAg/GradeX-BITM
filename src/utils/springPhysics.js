// Minimal mass-spring-damper stepper (rAF-driven), the same model behind
// react-spring/Framer Motion's spring presets. A CSS cubic-bezier fakes this
// shape with 4 fixed control points; this actually integrates stiffness,
// damping (friction), and mass frame by frame, so overshoot/settle time
// genuinely change with those parameters instead of being baked into a curve.
// `velocity` (units per second) lets a spring pick up a motion already under
// way, e.g. a flick, instead of starting from a standstill.
export function animateSpring({ from, to, stiffness, damping, mass, velocity: startVelocity = 0, onUpdate, onComplete }) {
  let value = from;
  let velocity = startVelocity;
  let rafId = null;
  let lastTime = performance.now();

  function step(now) {
    // Clamp dt so a backgrounded tab resuming doesn't apply one giant jump.
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    const springForce = -stiffness * (value - to);
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;
    velocity += acceleration * dt;
    value += velocity * dt;

    onUpdate(value);

    const settled = Math.abs(value - to) < 0.0015 && Math.abs(velocity) < 0.0015;
    if (settled) {
      onUpdate(to);
      onComplete?.();
      return;
    }
    rafId = requestAnimationFrame(step);
  }

  rafId = requestAnimationFrame(step);
  return () => { if (rafId !== null) cancelAnimationFrame(rafId); };
}

// The same spring, worked out ahead of time instead of frame by frame: the
// position every `dt` seconds from start to rest. Handing these to the Web
// Animations API lets the browser run the motion off the main thread, so it
// keeps its pace while React is busy (mounting a page, say).
export function sampleSpring({ from, to, stiffness, damping, mass, velocity = 0, dt = 1 / 120, rest = 0.1, maxSeconds = 2 }) {
  const xs = [from];
  let value = from;
  let v = velocity;
  for (let t = 0; t < maxSeconds; t += dt) {
    const acceleration = (-stiffness * (value - to) - damping * v) / mass;
    v += acceleration * dt;
    value += v * dt;
    xs.push(value);
    if (Math.abs(value - to) < rest && Math.abs(v) < rest * 10) break;
  }
  xs[xs.length - 1] = to;
  return xs;
}
