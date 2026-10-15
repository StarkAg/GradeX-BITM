// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@convex-dev/auth/react', () => ({ useAuthActions: () => ({ signOut: vi.fn() }) }));
vi.mock('../src/lib/academic-data', () => ({
  useCurrentProfile: () => ({ id: 'u1', username: 'asha', name: 'Asha', email: 'a@b.co' }),
  useUpdateCurrentProfile: () => async () => { throw new Error('You are offline. Connect to the internet to change your name.'); },
  useDeleteCurrentUserData: () => async () => { throw new Error('[CONVEX M(users:deleteCurrentUserData)] Server Error'); },
}));

const { default: UserPage } = await import('../src/components/UserPage');

beforeAll(() => { window.innerWidth = 1280; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// A refused save used to leave the screen exactly as it was: no message, so
// the student could not tell a dropped connection from a button that does
// nothing.
describe('the profile page when the server refuses', () => {
  it('says so when the name cannot be saved', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<UserPage />);
    fireEvent.click(screen.getByTitle('Edit Name'));
    const input = screen.getByDisplayValue('Asha');
    fireEvent.change(input, { target: { value: 'Asha K' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((await screen.findByRole('alert')).textContent).toMatch(/offline/i);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('says so when the account cannot be deleted', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<UserPage />);
    fireEvent.click(screen.getByText('Delete Account'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getAllByText('Delete Account').at(-1));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not delete/i));
  });
});

// The sidebar's profile popup does the same two things and went quiet the same way.
describe('the sidebar profile popup when the server refuses', () => {
  it('says so when the account cannot be deleted, without closing the popup', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { default: UserSection } = await import('../src/components/UserSection');
    render(<UserSection isCollapsed={false} onLogout={() => {}} />);
    fireEvent.click(screen.getByTitle('View Profile'));
    fireEvent.click(screen.getByText('Delete Account'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getAllByText('Delete Account').at(-1));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not delete/i));
  });
});
