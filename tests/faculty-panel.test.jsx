// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_SUBJECTS } from '../src/lib/subjects';

const save = vi.fn(async () => null);
vi.mock('../src/lib/academic-data', () => ({
  useDemoSubjectCatalog: () => DEFAULT_SUBJECTS,
  useSetFacultyAttendance: () => save,
}));
const { default: FacultyAttendancePanel } = await import('../src/components/FacultyAttendancePanel');

beforeAll(() => { window.innerWidth = 1280; });
afterEach(() => { cleanup(); save.mockClear(); });

const openRegister = () => {
  render(<MemoryRouter><FacultyAttendancePanel /></MemoryRouter>);
  fireEvent.click(screen.getByText('LH-11'));
  fireEvent.click(screen.getByText(/Research Methodology/));
};
const statusesSaved = () => save.mock.calls.map(([entry]) => entry.status);

describe('the faculty register', () => {
  it('marks a student present on the first tap, on a date picked after the subject', async () => {
    openRegister();
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByText('Rahul Sharma'));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(statusesSaved()).toEqual(['present']);
  });

  it('cycles unmarked, present, absent and back to unmarked', async () => {
    openRegister();
    const tap = async (count) => {
      fireEvent.click(screen.getByText('Rahul Sharma'));
      await waitFor(() => expect(save).toHaveBeenCalledTimes(count));
    };
    await tap(1);
    await tap(2);
    await tap(3);
    expect(statusesSaved()).toEqual(['present', 'absent', null]);
  });
});
