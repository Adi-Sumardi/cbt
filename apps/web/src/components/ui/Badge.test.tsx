import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders with default gray color', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toContain('bg-gray-100');
  });

  it('renders with blue color', () => {
    render(<Badge color="blue">Blue</Badge>);
    expect(screen.getByText('Blue').className).toContain('bg-blue-100');
  });

  it('renders with green color', () => {
    render(<Badge color="green">Green</Badge>);
    expect(screen.getByText('Green').className).toContain('bg-green-100');
  });

  it('renders with red color', () => {
    render(<Badge color="red">Error</Badge>);
    expect(screen.getByText('Error').className).toContain('bg-red-100');
  });

  it('renders with yellow color', () => {
    render(<Badge color="yellow">Warning</Badge>);
    expect(screen.getByText('Warning').className).toContain('bg-yellow-100');
  });

  it('renders with purple color', () => {
    render(<Badge color="purple">Admin</Badge>);
    expect(screen.getByText('Admin').className).toContain('bg-purple-100');
  });

  it('renders with orange color', () => {
    render(<Badge color="orange">Orange</Badge>);
    expect(screen.getByText('Orange').className).toContain('bg-orange-100');
  });

  it('has correct base styling classes', () => {
    render(<Badge>Test</Badge>);
    const el = screen.getByText('Test');
    expect(el.className).toContain('rounded-full');
    expect(el.className).toContain('text-xs');
    expect(el.className).toContain('font-medium');
  });
});
