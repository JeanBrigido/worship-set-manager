import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MyAssignmentsPage from '@/app/suggestions/my-assignments/page'
import * as suggestionHooks from '@/hooks/use-suggestions'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Mock dependencies
vi.mock('next/navigation')
vi.mock('next-auth/react')
vi.mock('@/hooks/use-suggestions')
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockPush = vi.fn()
vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('My Suggestions Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useSession with authenticated user
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          roles: ['musician'],
        },
        expires: '2099-01-01',
      },
      status: 'authenticated',
      update: vi.fn(),
    } as any)

    // Set up default mock implementations
    vi.mocked(suggestionHooks.useMyAssignments).mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(suggestionHooks.useCreateSuggestion).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    vi.mocked(suggestionHooks.useDeleteSuggestion).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  })

  it('should display loading state', () => {
    vi.mocked(suggestionHooks.useMyAssignments).mockReturnValue({
      data: [],
      isLoading: true,
    } as any)

    render(<MyAssignmentsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('My Song Suggestions')).toBeInTheDocument()
  })

  it('should display empty state when no assignments', async () => {
    vi.mocked(suggestionHooks.useMyAssignments).mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    render(<MyAssignmentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('No Assignments Yet')).toBeInTheDocument()
      expect(
        screen.getByText("You haven't been assigned to suggest songs for any upcoming services.")
      ).toBeInTheDocument()
    })
  })

  it('should display assignment cards with pending status', async () => {
    const mockAssignments = [
      {
        id: 'assignment-1',
        minSongs: 1,
        maxSongs: 3,
        dueAt: new Date('2027-12-31').toISOString(),
        status: 'pending',
        worshipSet: {
          service: {
            serviceDate: '2025-12-25',
            serviceType: {
              name: 'Sunday',
            },
          },
        },
        suggestions: [],
      },
    ]

    vi.mocked(suggestionHooks.useMyAssignments).mockReturnValue({
      data: mockAssignments,
      isLoading: false,
    } as any)

    render(<MyAssignmentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Sunday Service')).toBeInTheDocument()
      expect(screen.getByText(/Dec \d{1,2}, 2027/)).toBeInTheDocument()
      expect(screen.getByText('1 - 3 songs')).toBeInTheDocument()
      expect(screen.getByText('Add First Suggestion')).toBeInTheDocument()
    })
  })

  it('should display submitted suggestions', async () => {
    const mockAssignments = [
      {
        id: 'assignment-1',
        minSongs: 1,
        maxSongs: 3,
        dueAt: new Date('2027-12-31').toISOString(),
        status: 'submitted',
        worshipSet: {
          service: {
            serviceDate: '2025-12-25',
            serviceType: {
              name: 'Sunday',
            },
          },
        },
        suggestions: [
          {
            id: 'suggestion-1',
            song: {
              title: 'Amazing Grace',
              artist: 'Traditional',
            },
            notes: 'Great hymn',
          },
        ],
      },
    ]

    vi.mocked(suggestionHooks.useMyAssignments).mockReturnValue({
      data: mockAssignments,
      isLoading: false,
    } as any)

    render(<MyAssignmentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Your Suggestions:')).toBeInTheDocument()
      expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
      expect(screen.getByText('by Traditional')).toBeInTheDocument()
      expect(screen.getByText('"Great hymn"')).toBeInTheDocument()
    })
  })

  it('should show overdue badge for past due assignments', async () => {
    const pastDate = new Date('2020-01-01').toISOString()
    const mockAssignments = [
      {
        id: 'assignment-1',
        minSongs: 1,
        maxSongs: 3,
        dueAt: pastDate,
        status: 'pending',
        worshipSet: {
          service: {
            serviceDate: '2025-12-25',
            serviceType: {
              name: 'Sunday',
            },
          },
        },
        suggestions: [],
      },
    ]

    vi.mocked(suggestionHooks.useMyAssignments).mockReturnValue({
      data: mockAssignments,
      isLoading: false,
    } as any)

    render(<MyAssignmentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Overdue')).toBeInTheDocument()
      expect(
        screen.getByText(/This assignment is overdue. Contact your worship leader/)
      ).toBeInTheDocument()
    })
  })

  it('should open add suggestion dialog when clicking add button', async () => {
    const mockAssignments = [
      {
        id: 'assignment-1',
        minSongs: 1,
        maxSongs: 3,
        dueAt: new Date('2027-12-31').toISOString(),
        status: 'pending',
        worshipSet: {
          service: {
            serviceDate: '2025-12-25',
            serviceType: {
              name: 'Sunday',
            },
          },
        },
        suggestions: [],
      },
    ]

    vi.mocked(suggestionHooks.useMyAssignments).mockReturnValue({
      data: mockAssignments,
      isLoading: false,
    } as any)

    render(<MyAssignmentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      const addButton = screen.getByText('Add First Suggestion')
      fireEvent.click(addButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Add Song Suggestion')).toBeInTheDocument()
      expect(screen.getByText('Select a song to suggest for the worship set')).toBeInTheDocument()
    })
  })

  it('should not allow adding more suggestions when at max', async () => {
    const mockAssignments = [
      {
        id: 'assignment-1',
        minSongs: 1,
        maxSongs: 2,
        dueAt: new Date('2027-12-31').toISOString(),
        status: 'pending',
        worshipSet: {
          service: {
            serviceDate: '2025-12-25',
            serviceType: {
              name: 'Sunday',
            },
          },
        },
        suggestions: [
          {
            id: 'suggestion-1',
            song: { title: 'Song 1', artist: 'Artist 1' },
          },
          {
            id: 'suggestion-2',
            song: { title: 'Song 2', artist: 'Artist 2' },
          },
        ],
      },
    ]

    vi.mocked(suggestionHooks.useMyAssignments).mockReturnValue({
      data: mockAssignments,
      isLoading: false,
    } as any)

    render(<MyAssignmentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Should not show add button when at max capacity (2/2 suggestions)
      expect(screen.queryByText(/Add/)).not.toBeInTheDocument()
    })
  })
})
