import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { animateSpring, sampleSpring } from '../utils/springPhysics';
import { triggerNativeHaptic } from '../lib/nativeHaptics.js';

// The lens on the mobile bottom bar: one highlight that sits on the active
// slot, slides to the next one with a real spring when the page changes, and
// can be carried across the bar with a finger — let go and the slot it is
// over opens (carried to More, it opens the More panel). A plain tap lifts it too, the same way the start of a drag does. It replaces nothing: the icons and labels still show which page
// is active by themselves; this adds the moving glass on top of them.
//
// Lifted, it behaves like the lens on an iOS tab bar: the slot under it is
// shown larger and takes the selected colour, the lens stretches with its
// speed and jiggles when it stops, and the bar swells under the press. All of it is
// transforms on things that already exist.
//
// It is painted, never filtered, and moved only by `transform`, written
// straight to the element. Both choices are about phones: a backdrop-filter
// has to be redrawn on every frame of a drag, and sending sixty positions a
// second through React state would re-render the 1,700-line Navigation
// component each time.

// How far a finger must travel before a press becomes a drag. Less is a tap,
// which the slot's own <Link> handles as it always has.
const DRAG_AFTER_PX = 6;
// The motion constants below are the ones measured from the native iOS tab bar
// (Codename One recorded UIKit's layers during real touches and fitted springs
// to them: codenameone.com/blog/ios27-glass-from-measurements). A spring is
// given there as a natural frequency w and a damping ratio z; with a mass of 1
// that is stiffness w*w and damping 2*z*w.
//
// While dragged the lens follows the finger on a spring of its own (w 32,
// z 0.9), so it trails a fast finger slightly and never snaps.
const FOLLOW = { stiffness: 1024, damping: 57.6 };
// Past either end it gives a little, then no more.
const GIVE = 0.22;
const MAX_GIVE_PX = 10;
// At rest the lens is a soft capsule that fills its slot and touches the
// bar's border top and bottom, with no gap. It reaches the same few pixels past
// the slot on both sides at every slot; the row of slots is inset by exactly
// that much at each end (see Navigation.jsx), so on the first slot the lens
// starts at the bar's border and its rounded end is the bar's own.
//
// Picked up by a finger it becomes a piece of clear glass: it lifts, grows
// past the top and bottom of the bar, and gets a bright rim. The bar normally
// clips what is inside it, so for as long as the drag lasts the bar is marked
// `data-lens-drag` and the stylesheet lets it show outside.
const OVERHANG_PX = 4;

function lensFor(slot) {
  return { x: slot.offsetLeft - OVERHANG_PX, w: slot.offsetWidth + OVERHANG_PX * 2 };
}

// Every place the lens can go: the page links, and the More button at the end.
const SLOT = '.footer-option';
const ACTIVE_SLOT = 'a.footer-option[data-active="true"]';
// More is not a page. The lens rests on it for as long as its panel is open.
const OPEN_MORE = 'button.footer-option[aria-expanded="true"]';
// The slide to a slot: the measured frequency (w 2pi/0.4), but looser than the
// measured damping (z 0.7 where iOS has 0.85). At 0.85 the lens arrives and
// simply stops; at 0.7 it runs a few pixels past and comes back, and further
// the faster it was thrown, which is the bounce a hand expects of it.
const SPRING = { stiffness: 247, damping: 22, mass: 1 };
// Time between the spring's precomputed positions.
const SPRING_DT = 1 / 120;
// Most of a flick's speed a spring takes on, in px/s. Uncapped, a fast throw
// overshoots its slot by half the next one and visibly comes back.
const MAX_CARRIED_SPEED = 800;
// The lens is soft. Its shape is a spring of its own, pulled by how fast the
// lens is moving: the faster it goes the longer and thinner it is drawn, this
// much per px/s and no further than the cap.
const STRETCH_PER_SPEED = 0.00034;
const MAX_STRETCH = 0.26;
// That spring is very loose (a period near 0.28s, damping ratio 0.13), so the shape
// lags the speed and then overshoots it: stop suddenly and the lens goes
// short and tall, long again, and settles in four or five wobbles, each
// smaller than the last, over about a second and a half. A faster stop wobbles harder.
// This is the jiggle.
const JELLY = { stiffness: 484, damping: 5.72 };
// A press sets it wobbling in place even when the lens goes nowhere, and
// letting go gives it a smaller push the other way. In stretch per second.
const PRESS_KICK = 4;
const RELEASE_KICK = -2.4;
// What is under the lens is shown larger, the way a magnifying glass does it:
// a slot grows by this much with the lens centred on it, and by less the
// further off-centre the lens is.
const ZOOM = 0.15;


const stretchOf = (speed) => Math.min(Math.abs(speed) * STRETCH_PER_SPEED, MAX_STRETCH);
// A negative stretch is a squash: shorter and taller.
const shapeOf = (stretch) => `scale(${(1 + stretch).toFixed(3)}, ${(1 - stretch * 0.6).toFixed(3)})`;
// The shape spring, moved on by `dt` seconds towards the stretch `pull`. In
// steps of a 240th of a second at most, so a dropped frame cannot upset it.
function jelly(state, pull, dt) {
  const steps = Math.max(1, Math.ceil(dt * 240));
  const h = dt / steps;
  for (let n = 0; n < steps; n += 1) {
    state.v += (JELLY.stiffness * (pull - state.s) - JELLY.damping * state.v) * h;
    state.s += state.v * h;
  }
  return state;
}
// Navigations run as transitions, so the bar does not mark the new slot active
// until the next page has loaded — longer offline or on a cold chunk. Until
// then the lens trusts the slot it was sent to; this is how long it waits
// before giving up on that (the page never came) and going back.
const PENDING_GIVE_UP_MS = 5000;

export default function NavLens({ containerRef, watch, draggable = true }) {
  const navigate = useNavigate();
  const lensRef = useRef(null);
  const bodyRef = useRef(null);
  const motion = useRef({
    x: 0, target: 0, v: 0, stretch: 0, stretchV: 0, drawn: 0, lastT: 0, shown: false, dragging: false, raf: 0,
    stopSpring: null, springTo: null, anim: null, over: -1, pendingHref: null, pendingTimer: 0,
  });
  const geometry = useRef(null);
  const press = useRef(null);
  const swallowClick = useRef(false);
  const passClick = useRef(false);

  const put = (x) => {
    motion.current.x = x;
    if (lensRef.current) lensRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  // The stretch is written to the body inside the lens, never to the lens: a
  // scale on the lens would scale its translate too.
  const shape = (stretch) => {
    const m = motion.current;
    m.stretch = stretch;
    if (Math.abs(stretch - m.drawn) < 0.002 && stretch !== 0) return;
    m.drawn = stretch;
    if (bodyRef.current) bodyRef.current.style.transform = Math.abs(stretch) > 0.002 ? shapeOf(stretch) : '';
  };

  // At rest: round, and not about to wobble.
  const round = () => {
    motion.current.stretchV = 0;
    shape(0);
  };

  // Stops a running spring where it is, and says how fast it was going.
  const halt = () => {
    const m = motion.current;
    let v = 0;
    const a = m.anim;
    if (a) {
      // Where the compositor has the lens right now, read from the same
      // positions it was given, so stopping it never makes it jump.
      const i = Math.min(Math.floor((Number(a.animation.currentTime) || 0) / (SPRING_DT * 1000)), a.xs.length - 1);
      const x = a.xs[i];
      v = i + 1 < a.xs.length ? (a.xs[i + 1] - x) / SPRING_DT : 0;
      put(x);
      // The shape is left as it was, mid-wobble if need be, so whatever takes
      // over starts from there. The wobble outlasts the slide, so it has its
      // own clock.
      if (a.wobble) {
        const j = Math.min(Math.floor((Number(a.wobble.currentTime) || 0) / (SPRING_DT * 1000)), a.shapes.length - 1);
        m.stretchV = j + 1 < a.shapes.length ? (a.shapes[j + 1] - a.shapes[j]) / SPRING_DT : 0;
        shape(a.shapes[j]);
      }
      a.animation.cancel();
      a.wobble?.cancel();
      m.anim = null;
    }
    m.stopSpring?.();
    m.stopSpring = null;
    m.springTo = null;
    return v;
  };

  // A spring already heading to `x` is left alone: restarting it would drop
  // its speed to zero mid-slide, which reads as a stall. A spring sent
  // somewhere else on the way keeps the speed it had.
  const springTo = (x, velocity) => {
    const m = motion.current;
    if ((m.anim || m.stopSpring) && m.springTo !== null && Math.abs(m.springTo - x) < 0.5) return;
    const carried = halt();
    const v = Math.max(-MAX_CARRIED_SPEED, Math.min(MAX_CARRIED_SPEED, velocity ?? carried));
    const lens = lensRef.current;
    m.springTo = x;
    if (!lens?.animate) {
      round();
      m.stopSpring = animateSpring({
        from: m.x, to: x, ...SPRING, velocity: v, onUpdate: put,
        onComplete: () => { m.stopSpring = null; m.springTo = null; },
      });
      return;
    }
    // Run by the browser, not by requestAnimationFrame: the slide that follows
    // a release overlaps the next page mounting, and a main-thread spring
    // drops frames exactly then. The inline transform is set to where it ends,
    // so when the animation finishes the lens is already there.
    const xs = sampleSpring({ from: m.x, to: x, ...SPRING, velocity: v, dt: SPRING_DT });
    const animation = lens.animate(
      xs.map((p) => ({ transform: `translate3d(${p}px, 0, 0)` })),
      { duration: (xs.length - 1) * SPRING_DT * 1000, easing: 'linear' },
    );
    put(x);
    // The shape for the same run, from the shape spring: pulled by the speed
    // of each step of the slide, starting from however stretched and however
    // fast-changing the lens is now, and then left to wobble itself out after
    // the slide has stopped. So it outlasts the slide, and runs as an
    // animation of its own.
    const state = { s: m.stretch, v: m.stretchV };
    const shapes = [];
    for (let i = 0; i < xs.length; i += 1) {
      shapes.push(state.s);
      jelly(state, i + 1 < xs.length ? stretchOf((xs[i + 1] - xs[i]) / SPRING_DT) : 0, SPRING_DT);
    }
    while ((Math.abs(state.s) > 0.003 || Math.abs(state.v) > 0.05) && shapes.length < 2 / SPRING_DT) {
      shapes.push(state.s);
      jelly(state, 0, SPRING_DT);
    }
    shapes.push(0);
    const wobble = bodyRef.current?.animate?.(
      shapes.map((stretch) => ({ transform: shapeOf(stretch) })),
      { duration: (shapes.length - 1) * SPRING_DT * 1000, easing: 'linear' },
    );
    round();
    const run = { animation, wobble, xs, shapes };
    m.anim = run;
    // The run is over when its wobble is.
    (wobble || animation).onfinish = () => {
      if (m.anim !== run) return;
      m.anim = null;
      m.springTo = null;
    };
  };

  // The slot the lens belongs on: the one just navigated to while that page is
  // still loading, otherwise the active one.
  const restingSlot = (container) => {
    const m = motion.current;
    if (m.pendingHref) {
      const pending = [...container.querySelectorAll(SLOT)].find((slot) => slot.getAttribute('href') === m.pendingHref);
      if (pending) return pending;
    }
    return container.querySelector(OPEN_MORE) || container.querySelector(ACTIVE_SLOT);
  };

  const clearPending = () => {
    const m = motion.current;
    window.clearTimeout(m.pendingTimer);
    m.pendingTimer = 0;
    m.pendingHref = null;
  };

  // Hold the lens on `href` until the route catches up (see PENDING_GIVE_UP_MS).
  const expect = (href) => {
    const container = containerRef.current;
    const active = container?.querySelector(ACTIVE_SLOT);
    clearPending();
    if (!href || active?.getAttribute('href') === href) return;
    const m = motion.current;
    m.pendingHref = href;
    m.pendingTimer = window.setTimeout(() => {
      m.pendingTimer = 0;
      m.pendingHref = null;
      place(true);
    }, PENDING_GIVE_UP_MS);
  };

  // Rest position: over the active slot. `animate` is false for the first
  // placement and for resizes, where sliding in from the left would be noise.
  const place = (animate) => {
    const container = containerRef.current;
    const lens = lensRef.current;
    const m = motion.current;
    if (!container || !lens || m.dragging) return;
    const active = restingSlot(container);
    if (!active) {
      // On a page that is not in the bar (opened from More): no lens.
      lens.style.opacity = '0';
      m.shown = false;
      return;
    }
    const { x, w } = lensFor(active);
    lens.style.width = `${w}px`;
    lens.style.opacity = '1';
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!animate || !m.shown || still || (!m.stopSpring && !m.anim && Math.abs(x - m.x) < 0.5)) {
      halt();
      put(x);
      round();
    } else {
      springTo(x);
    }
    m.shown = true;
  };

  useLayoutEffect(() => {
    // The route (or the bar) changed: whatever was pending has landed.
    clearPending();
    place(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const onResize = () => place(false);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(container);
    window.addEventListener('resize', onResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      halt();
      clearPending();
      cancelAnimationFrame(motion.current.raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pressing and carrying the lens.
  //
  // A press on a slot lifts the lens at once: it grows into clear glass and
  // springs under the finger, so a plain tap reads the same as the start of a
  // drag. Let go without moving and the slot's own <Link> does the navigating;
  // the lens is already there and settles back into its capsule. Move sideways
  // first and it becomes a drag — except when the bar itself scrolls sideways
  // (many slots), where a sideways move has to stay a scroll.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const bar = container.closest('nav');
    let settleTimer = 0;
    let clipTimer = 0;

    // The slot the lens is on takes the selected colour for as long as the
    // lens is up (see the stylesheet), so the tint travels with the glass.
    const mark = (slot) => {
      container.querySelectorAll(SLOT).forEach((el) => {
        if (el === slot) el.dataset.lensOver = '1';
        else delete el.dataset.lensOver;
      });
    };

    // Magnifies one slot and lets the rest go back. Outside a drag the
    // stylesheet eases the change; `null` lets them all go back.
    const zoomTo = (slot) => {
      container.querySelectorAll(SLOT).forEach((el) => {
        el.style.scale = el === slot ? String(1 + ZOOM) : '';
      });
    };

    // During a drag: each slot by how near the lens is to it, every frame.
    const zoomUnder = (x) => {
      const g = geometry.current;
      if (!g) return;
      g.els.forEach((el, i) => {
        const near = Math.max(0, 1 - Math.abs(x - g.xs[i]) / g.pitch);
        const zoom = 1 + ZOOM * near * near * (3 - 2 * near);
        if (Math.abs(zoom - g.zooms[i]) < 0.004) return;
        g.zooms[i] = zoom;
        el.style.scale = zoom.toFixed(3);
      });
    };

    // Lifted: the clear-glass look, and the bar unclipped so it can show outside.
    const lift = () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(clipTimer);
      if (lensRef.current) lensRef.current.dataset.drag = '1';
      container.dataset.lensDrag = '1';
      if (bar) {
        bar.dataset.lensDrag = '1';
        // The whole bar swells a little under a press, as it does on iOS.
        bar.dataset.lensPress = '1';
      }
    };

    // Back to the capsule, a beat after the finger leaves so a tap is seen and
    // not just felt. The bar stays unclipped until the lens has shrunk back
    // inside it; clipping at once would slice its top and bottom off.
    const settle = (after) => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (motion.current.dragging || press.current) return;
        if (lensRef.current) delete lensRef.current.dataset.drag;
        if (bar) delete bar.dataset.lensPress;
        zoomTo(null);
        // Wherever the press left it, the lens belongs on the active slot. This
        // also covers a tap that did not navigate.
        place(true);
        clipTimer = window.setTimeout(() => {
          if (motion.current.dragging || press.current) return;
          delete container.dataset.lensDrag;
          if (bar) delete bar.dataset.lensDrag;
          mark(null);
          // Long enough for the wobble to die down: a squashed lens is taller
          // than the bar, and clipping it mid-wobble would flatten its top.
        }, 1200);
      }, after);
    };

    // Sets the lens wobbling where it is (or on its way to where it is going).
    const nudge = (kick) => {
      const m = motion.current;
      const to = m.springTo ?? m.x;
      const carried = halt();
      m.stretchV += kick;
      springTo(to, carried);
    };

    const frame = (now) => {
      const m = motion.current;
      const dt = m.lastT ? Math.min(Math.max((now - m.lastT) / 1000, 1 / 240), 1 / 30) : 1 / 60;
      m.lastT = now;
      // The speed is kept from frame to frame, and handed on to the slide's
      // spring when the lens is let go.
      // Worked out in steps of a 240th of a second at most: a spring this
      // stiff, stepped once across a dropped frame, overshoots further each
      // time and flies off the bar.
      let next = m.x;
      const steps = Math.ceil(dt * 240);
      const h = dt / steps;
      for (let i = 0; i < steps; i += 1) {
        m.v += (FOLLOW.stiffness * (m.target - next) - FOLLOW.damping * m.v) * h;
        next += m.v * h;
      }
      put(next);
      // The shape chases the speed on its own loose spring: it stretches as
      // the finger speeds up and wobbles when the finger stops or turns.
      const state = jelly({ s: m.stretch, v: m.stretchV }, stretchOf(m.v), dt);
      m.stretchV = state.v;
      shape(state.s);
      zoomUnder(next);
      if (m.dragging) m.raf = requestAnimationFrame(frame);
    };

    const aim = (clientX) => {
      const g = geometry.current;
      const m = motion.current;
      if (!g) return;
      const min = g.xs[0];
      const max = g.xs[g.xs.length - 1];
      // The bar is drawn slightly larger while pressed; `scale` undoes that.
      const raw = (clientX - g.left) / g.scale - g.w / 2;
      m.target = raw < min ? min - Math.min((min - raw) * GIVE, MAX_GIVE_PX)
        : raw > max ? max + Math.min((raw - max) * GIVE, MAX_GIVE_PX)
        : raw;
      let nearest = 0;
      g.xs.forEach((x, i) => { if (Math.abs(x - raw) < Math.abs(g.xs[nearest] - raw)) nearest = i; });
      if (nearest !== m.over) {
        m.over = nearest;
        mark(g.els[nearest]);
        // The same light tick a tap gives, as the lens crosses into a slot.
        triggerNativeHaptic('light').catch(() => {});
      }
    };

    const begin = (event) => {
      const slots = [...container.querySelectorAll(SLOT)];
      if (slots.length < 2 || !lensRef.current) return;
      const m = motion.current;
      // Measured once here; reading layout on every move is what makes a drag stutter.
      const box = container.getBoundingClientRect();
      geometry.current = {
        left: box.left,
        scale: box.width / container.offsetWidth || 1,
        xs: slots.map((slot) => lensFor(slot).x),
        w: lensFor(slots[0]).w,
        hrefs: slots.map((slot) => slot.getAttribute('href')),
        els: slots,
        pitch: Math.max(1, lensFor(slots[1]).x - lensFor(slots[0]).x),
        zooms: slots.map((slot) => Number(slot.style.scale) || 1),
      };
      m.v = halt();
      m.dragging = true;
      m.over = -1;
      m.lastT = 0;
      lift();
      // From here the zoom is written every frame, so the stylesheet swaps
      // its bounce for a short straight ease.
      container.dataset.lensCarry = '1';
      try { container.setPointerCapture(event.pointerId); } catch { /* older WebViews */ }
      aim(event.clientX);
      m.raf = requestAnimationFrame(frame);
    };

    const end = (commit) => {
      const m = motion.current;
      const g = geometry.current;
      const pressed = press.current;
      press.current = null;
      if (!m.dragging) {
        // A tap, or a press that was cancelled (the page scrolled instead).
        // Either way the lens was lifted on the way down and now comes back.
        // A tap's <Link> navigates, so the lens stays on the tapped slot.
        if (pressed) {
          nudge(RELEASE_KICK);
          if (commit) expect(pressed.href);
          settle(commit ? 180 : 0);
        }
        return;
      }
      m.dragging = false;
      cancelAnimationFrame(m.raf);
      delete container.dataset.lensCarry;
      if (!commit || !g || m.over < 0) { settle(0); return; }
      zoomTo(g.els[m.over]);
      swallowClick.current = true;
      const href = g.hrefs[m.over];
      expect(href);
      springTo(g.xs[m.over], m.v);
      if (href) {
        navigate(href);
      } else if (g.els[m.over].getAttribute('aria-expanded') !== 'true') {
        // Let go on More: open its panel, by the button's own click. That
        // click is ours and must get past the handler below, which is waiting
        // to swallow the one the browser sends after a drag.
        passClick.current = true;
        g.els[m.over].click();
        passClick.current = false;
      }
      settle(120);
    };

    const onDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      // Only a press that starts on a slot counts. More is one of them: the
      // lens comes to it and its own click opens the panel.
      const slot = event.target.closest?.(SLOT);
      if (!slot || !lensRef.current) { press.current = null; return; }
      // A fresh press starts clean: if the click after the last drag never came,
      // its flag must not eat this tap.
      swallowClick.current = false;
      press.current = { x: event.clientX, id: event.pointerId, href: slot.getAttribute('href') };

      // Lift, and come to the pressed slot.
      const m = motion.current;
      const { x, w } = lensFor(slot);
      const lens = lensRef.current;
      lens.style.width = `${w}px`;
      if (!m.shown) {
        // Nothing in the bar was active: the lens appears where it is pressed.
        halt();
        put(x);
        round();
        lens.style.opacity = '1';
        m.shown = true;
      } else {
        // Carried on from whatever it was doing, with the press's push added.
        const carried = halt();
        m.stretchV += PRESS_KICK;
        springTo(x, carried);
      }
      lift();
      mark(slot);
      zoomTo(slot);
    };
    const onMove = (event) => {
      const p = press.current;
      if (!p || p.id !== event.pointerId) return;
      if (motion.current.dragging) { aim(event.clientX); return; }
      if (draggable && Math.abs(event.clientX - p.x) >= DRAG_AFTER_PX) begin(event);
    };
    const onUp = () => end(true);
    const onCancel = () => end(false);
    // A finger that slides off the bar without a drag has let go of it.
    const onLeave = () => { if (!motion.current.dragging) end(false); };
    const onClick = (event) => {
      // The click that follows a drag belongs to the drag, which has already
      // chosen the slot. Letting it through would choose again.
      if (passClick.current || !swallowClick.current) return;
      swallowClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    };

    container.addEventListener('pointerdown', onDown);
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onUp);
    container.addEventListener('pointercancel', onCancel);
    container.addEventListener('pointerleave', onLeave);
    container.addEventListener('click', onClick, true);
    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(clipTimer);
      delete container.dataset.lensCarry;
      if (bar) delete bar.dataset.lensPress;
      zoomTo(null);
      mark(null);
      container.removeEventListener('pointerdown', onDown);
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerup', onUp);
      container.removeEventListener('pointercancel', onCancel);
      container.removeEventListener('pointerleave', onLeave);
      container.removeEventListener('click', onClick, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggable]);

  return (
    <span ref={lensRef} className="gx-nav-lens" aria-hidden="true" style={{ opacity: 0 }}>
      <span ref={bodyRef} className="gx-nav-lens__body" />
    </span>
  );
}
