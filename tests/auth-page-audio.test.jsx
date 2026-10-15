// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@convex-dev/auth/react', () => ({ useAuthActions: () => ({ signIn: vi.fn() }) }));
const { default: AuthPage } = await import('../src/components/AuthPage');

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// The arc reactor starts a song. A browser may refuse (no gesture, no
// connection for the file); the logo must not then behave as if it were playing.
describe('the logo on the sign-in page', () => {
  it('tries again on the next tap when the song would not start', async () => {
    const play = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
    const pause = vi.fn();
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', { value: play, configurable: true });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', { value: pause, configurable: true });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<AuthPage onAuthSuccess={() => {}} />);
    const logo = screen.getAllByAltText('Arc Reactor')[0];
    fireEvent.click(logo);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.click(logo);

    expect(play).toHaveBeenCalledTimes(2);
    expect(pause).not.toHaveBeenCalled();
  });
});
