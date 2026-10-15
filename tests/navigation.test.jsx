// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navigation from '../src/components/Navigation';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'timetable', label: 'Schedule', path: '/schedule' },
  { id: 'attendance', label: 'Attendance', path: '/attendance' },
  { id: 'calendar', label: 'Calendar', path: '/calendar' },
  { id: 'subjects', label: 'Subjects', path: '/subjects' },
  { id: 'marks', label: 'Marks', path: '/marks', comingSoon: true, desktopOnly: true },
];

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const mount = (width, path = '/') => {
  window.innerWidth = width;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navigation isCollapsed={false} onToggle={() => {}} navItems={NAV_ITEMS} isConnected={false} onLogout={() => {}} />
      <Routes><Route path="*" element={<Where />} /></Routes>
    </MemoryRouter>,
  );
};

beforeAll(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});
afterEach(cleanup);

describe('phone bar', () => {
  it('shows the five pages and More, and leaves out pages still to come', () => {
    mount(400, '/attendance');
    for (const label of ['Home', 'Schedule', 'Attendance', 'Calendar', 'Subjects', 'More']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.queryByText('Marks')).toBeNull();
    expect(document.querySelector('a[href="/attendance"]').getAttribute('data-active')).toBe('true');
  });

  it('opens More, and Profile from it goes to the profile page', () => {
    mount(400);
    fireEvent.click(screen.getByLabelText('Open more navigation'));
    fireEvent.click(screen.getByLabelText('Profile'));
    expect(screen.getByTestId('where').textContent).toBe('/user');
  });
});

describe('desktop rail', () => {
  it('lists the pages, keeps Marks under Coming Soon, and offers Profile when signed out', () => {
    mount(1280, '/schedule');
    expect(screen.getByText('Schedule')).toBeTruthy();
    expect(screen.queryByText('Marks')).toBeNull();
    fireEvent.click(screen.getByText('Coming Soon'));
    expect(screen.getByText('Marks')).toBeTruthy();
    expect(screen.getByText('Profile').closest('a').getAttribute('href')).toBe('/user');
  });
});
