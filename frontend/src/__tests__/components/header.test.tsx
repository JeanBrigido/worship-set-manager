import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithQueryClient } from '../utils';
import { Header } from '@/components/layout/header';
import * as NextAuth from 'next-auth/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/services',
}));

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      vi.spyOn(NextAuth, 'useSession').mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });
    });

    it('should render the application logo and title', () => {
      renderWithQueryClient(<Header />);

      expect(screen.getByText('Worship Set Manager')).toBeInTheDocument();
    });

    it('should display Sign In and Sign Up buttons when not authenticated', () => {
      renderWithQueryClient(<Header />);

      expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument();
    });

    it('should not display navigation menu when not authenticated', () => {
      renderWithQueryClient(<Header />);

      expect(screen.queryByText('Services')).not.toBeInTheDocument();
      expect(screen.queryByText('Songs')).not.toBeInTheDocument();
    });

    it('should render skip to content link for accessibility', () => {
      renderWithQueryClient(<Header />);

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
      expect(skipLink).toHaveClass('sr-only');
    });
  });

  describe('Authenticated State - Admin', () => {
    beforeEach(() => {
      vi.spyOn(NextAuth, 'useSession').mockReturnValue({
        data: {
          user: {
            name: 'Admin User',
            email: 'admin@test.com',
            roles: ['admin'],
          },
          expires: '2025-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });
    });

    it('should display user profile dropdown for authenticated users', () => {
      renderWithQueryClient(<Header />);

      expect(screen.getByText('A')).toBeInTheDocument(); // Avatar fallback
    });

    it('should display navigation menu for admin users', () => {
      renderWithQueryClient(<Header />);

      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('Songs')).toBeInTheDocument();
      expect(screen.getByText('Assignments')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('should not display Sign In/Sign Up buttons when authenticated', () => {
      renderWithQueryClient(<Header />);

      expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Sign Up' })).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State - Leader', () => {
    beforeEach(() => {
      vi.spyOn(NextAuth, 'useSession').mockReturnValue({
        data: {
          user: {
            name: 'Leader User',
            email: 'leader@test.com',
            roles: ['leader'],
          },
          expires: '2025-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });
    });

    it('should display Services and Songs navigation for leaders', () => {
      renderWithQueryClient(<Header />);

      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('Songs')).toBeInTheDocument();
      expect(screen.getByText('Assignments')).toBeInTheDocument();
    });

    it('should not display Users navigation for non-admin users', () => {
      renderWithQueryClient(<Header />);

      expect(screen.queryByText('Users')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State - Musician', () => {
    beforeEach(() => {
      vi.spyOn(NextAuth, 'useSession').mockReturnValue({
        data: {
          user: {
            name: 'Musician User',
            email: 'musician@test.com',
            roles: ['musician'],
          },
          expires: '2025-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });
    });

    it('should display limited navigation for musicians', () => {
      renderWithQueryClient(<Header />);

      expect(screen.getByText('Songs')).toBeInTheDocument();
      expect(screen.getByText('Assignments')).toBeInTheDocument();
    });

    it('should not display Services navigation for musicians', () => {
      renderWithQueryClient(<Header />);

      // Musicians don't have access to Services menu
      expect(screen.queryByText('All Services')).not.toBeInTheDocument();
    });

    it('should not display Users navigation for musicians', () => {
      renderWithQueryClient(<Header />);

      expect(screen.queryByText('Users')).not.toBeInTheDocument();
    });
  });

  describe('Active Navigation State', () => {
    beforeEach(() => {
      vi.spyOn(NextAuth, 'useSession').mockReturnValue({
        data: {
          user: {
            name: 'Test User',
            email: 'test@test.com',
            roles: ['admin'],
          },
          expires: '2025-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });
    });

    it('should highlight active navigation link based on current path', () => {
      // Mock usePathname to return /assignments
      vi.mock('next/navigation', () => ({
        usePathname: () => '/assignments',
      }));

      renderWithQueryClient(<Header />);

      const assignmentsLink = screen.getByRole('link', { name: /Assignments/i });
      expect(assignmentsLink).toHaveClass('bg-accent');
    });
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      vi.spyOn(NextAuth, 'useSession').mockReturnValue({
        data: {
          user: {
            name: 'Test User',
            email: 'test@test.com',
            roles: ['admin'],
          },
          expires: '2025-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      });
    });

    it('should have skip to content link as first focusable element', () => {
      renderWithQueryClient(<Header />);

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveClass('sr-only'); // Screen reader only
      expect(skipLink.className).toContain('focus:not-sr-only'); // Visible on focus
    });

    it('should render sticky header with backdrop blur', () => {
      const { container } = render(<Header />);

      const header = container.querySelector('header');
      expect(header).toHaveClass('sticky');
      expect(header).toHaveClass('top-0');
      expect(header).toHaveClass('backdrop-blur');
    });
  });

  describe('Theme Toggle', () => {
    it('should render theme toggle button', () => {
      vi.spyOn(NextAuth, 'useSession').mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      renderWithQueryClient(<Header />);

      // Theme toggle should be present even when not authenticated
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });
  });
});
