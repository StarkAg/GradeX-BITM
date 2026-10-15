// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_SUBJECTS, DEFAULT_TIMETABLE } from '../src/lib/subjects';

vi.mock('html2canvas', () => ({ default: vi.fn(async () => { throw new Error('canvas failed'); }) }));
// The same objects on every call: the page copies the snapshot into state in an
// effect keyed on it, so a fresh one each render would never stop re-rendering.
const SNAPSHOT = { subjects: DEFAULT_SUBJECTS, timetable: DEFAULT_TIMETABLE };
const PROFILE = { id: 'u1', username: 'asha', name: 'Asha' };
vi.mock('../src/lib/academic-data', () => ({
  useAcademicSnapshot: () => SNAPSHOT,
  useCurrentProfile: () => PROFILE,
}));

const { default: Timetable } = await import('../src/components/Timetable');

beforeAll(() => { window.innerWidth = 1280; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// The page is shown as the picture is taken: the schedule is pulled out of the
// layout (absolute, 900px wide, on top of everything) for the capture. If the
// capture fails it has to go back, or the schedule stays stuck over the page.
describe('downloading the schedule as an image', () => {
  it('puts the schedule back when the capture fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<MemoryRouter><Timetable /></MemoryRouter>);

    const grid = document.querySelector('.timetable-container');
    expect(grid.style.position).toBe('');

    fireEvent.click(screen.getByText('Download Image'));
    await waitFor(() => expect(window.alert).toHaveBeenCalled(), { timeout: 3000 });

    expect(grid.style.position).toBe('');
    expect(grid.style.zIndex).toBe('');
    expect(grid.style.width).toBe('');
  });
});
