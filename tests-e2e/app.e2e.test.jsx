import React from 'react';
import { afterAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConvexAuthProvider } from '@convex-dev/auth/react';

const url = import.meta.env.VITE_CONVEX_URL;
if (!url || url.includes('astute-bandicoot-235')) {
  throw new Error('Set E2E_CONVEX_URL to the dev deployment. This test must not run against production.');
}

const email = `ui-e2e-${Date.now()}@example.com`;
const password = 'correct-horse-9';

// Node's built-in WebSocket dispatches Node events, which jsdom's window
// rejects; the `ws` client (already here through jsdom) has no such tie.
globalThis.WebSocket = (await import('ws')).WebSocket;
window.WebSocket = globalThis.WebSocket;

// jsdom has no layout; the app only reads these.
window.scrollTo = () => {};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

async function mountApp() {
  const { convex } = await import('../src/lib/convex');
  const { default: App } = await import('../src/App');
  const { default: ErrorBoundary } = await import('../src/components/ErrorBoundary');
  return render(
    <ConvexAuthProvider client={convex} shouldHandleCode={false}>
      <BrowserRouter>
        <ErrorBoundary name="app">
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </ConvexAuthProvider>
  );
}

const wait = (fn) => waitFor(fn, { timeout: 30000, interval: 150 });
const tokenKeys = () => Object.keys(localStorage).filter((key) => key.startsWith('__convexAuth'));

async function fillAndSubmit({ createAccount }) {
  const emailInput = await wait(() => screen.getByPlaceholderText('Enter email'));
  fireEvent.change(emailInput, { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  const passwordInput = await wait(() => screen.getByPlaceholderText('••••••••'));
  fireEvent.change(passwordInput, { target: { value: password } });
  if (createAccount) {
    fireEvent.click(screen.getByRole('button', { name: /New here\? Create account/ }));
    fireEvent.click(await wait(() => screen.getByRole('button', { name: 'Create account' })));
  } else {
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  }
}

describe('the app against a real backend', () => {
  afterAll(() => cleanup());

  it('signs up, shows the timetable, keeps the session across a restart, signs out and back in', async () => {
    localStorage.clear();
    let app = await mountApp();

    // Signed out: the sign-in page.
    await wait(() => expect(screen.getByText('Sign in to your account')).toBeTruthy());

    // A wrong sign-in is refused with a message, not a blank or a crash.
    await fillAndSubmit({ createAccount: false });
    await wait(() => expect(screen.getByText(/Wrong email or password/)).toBeTruthy());

    // Create the account.
    fireEvent.click(screen.getByRole('button', { name: /New here\? Create account/ }));
    fireEvent.click(await wait(() => screen.getByRole('button', { name: 'Create account' })));

    // Signed in: asked for a name (a new account has none), tokens stored.
    await wait(() => expect(screen.getByText("What's your name?")).toBeTruthy());
    expect(tokenKeys().length).toBeGreaterThanOrEqual(2);
    const userId = localStorage.getItem('gradex_user_id');
    expect(userId).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), { target: { value: 'E2E Student' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await wait(() => expect(screen.getByText('Welcome, E2E Student!')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: "Let's Go!" }));

    // The shell and the seeded data are there.
    await wait(() => expect(screen.getByText('GradeX - BITM')).toBeTruthy());
    await wait(() => expect(JSON.parse(localStorage.getItem('gradex_subjects') || '[]').length).toBe(9));
    expect(localStorage.getItem('gradex_cache_owner')).toBe(userId);
    expect(localStorage.getItem('gradex_user_name')).toBe('E2E Student');

    // "Restart": a fresh mount with the same storage opens straight into the
    // app, never the sign-in page.
    app.unmount();
    app = await mountApp();
    await wait(() => expect(screen.getByText('GradeX - BITM')).toBeTruthy());
    expect(screen.queryByText('Sign in to your account')).toBeNull();
    expect(localStorage.getItem('gradex_user_id')).toBe(userId);

    // Sign out from the sidebar/profile control.
    const { convex } = await import('../src/lib/convex');
    const { anyApi } = await import('convex/server');
    await wait(async () => expect((await convex.query(anyApi.users.getCurrentProfile, {})).name).toBe('E2E Student'));
    // Mark a class from Home (on a day that has classes) and see it reach
    // the server under this account.
    const markButtons = screen.queryAllByRole('button', { name: /^Mark present/ });
    if (markButtons.length > 0) {
      fireEvent.click(markButtons[0]);
      await wait(async () => {
        const snapshot = await convex.query(anyApi.academics.getCurrentSnapshot, {});
        const marks = Object.values(snapshot.dailyAttendance).flatMap((day) => Object.values(day));
        expect(marks).toEqual(['present']);
        const totals = Object.values(snapshot.attendanceTotals);
        expect(totals).toEqual([{ attended: 1, conducted: 1 }]);
      });
    }

    // Sign out: the account button in the sidebar opens a panel with it.
    const accountButton = await wait(() => {
      const button = screen.getAllByRole('button').find((b) => (b.textContent || '').includes('@ui-e2e-'));
      if (!button) throw new Error('no account button yet');
      return button;
    });
    fireEvent.click(accountButton);
    fireEvent.click(await wait(() => screen.getByRole('button', { name: /Sign Out/ })));
    await wait(() => expect(screen.getByText('Sign in to your account')).toBeTruthy());
    expect(tokenKeys()).toEqual([]);
    expect(localStorage.getItem('gradex_user_id')).toBeNull();
    expect(localStorage.getItem('gradex_subjects')).toBeNull();

    // Sign back in with the password: straight to the welcome, no name prompt.
    await fillAndSubmit({ createAccount: false });
    await wait(() => expect(screen.getByText('Welcome, E2E Student!')).toBeTruthy());
    expect(localStorage.getItem('gradex_user_id')).toBe(userId);

    // Clean up the throwaway account.
    await convex.mutation(anyApi.users.deleteCurrentUserData, {});
  });
});
