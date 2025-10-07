import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import MyAssignmentsPage from '@/app/suggestions/my-assignments/page'
import { useMyAssignments, useCreateSuggestion } from '@/hooks/use-suggestions'
import { useRouter } from 'next/navigation'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('@/hooks/use-suggestions')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.Mock
mockUseRouter.mockReturnValue({ push: mockPush })

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={{ user: { id: '1', name: 'Test User', email: 'test@example.com' }, expires: '2099-01-01' }}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  )
}

describe('My Suggestions Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display loading state', () => {
    (useMyAssignments as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
    })
    ;(useCreateSuggestion as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    })

    render(<MyAssignmentsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('My Song Suggestions')).toBeInTheDocument()
  })

  it('should display empty state when no assignments', async () => {
    (useMyAssignments as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    })
    ;(useCreateSuggestion as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    })

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
        dueAt: new Date('2025-12-31').toISOString(),
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

    ;(useMyAssignments as jest.Mock).mockReturnValue({
      data: mockAssignments,
      isLoading: false,
    })
    ;(useCreateSuggestion as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    })

    render(<MyAssignmentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Sunday Service')).toBeInTheDocument()
      expect(screen.getByText(/Dec 31, 2025/)).toBeInTheDocument()
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
        dueAt: new Date('2025-12-31').toISOString(),
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

    ;(useMyAssignments as jest.Mock).mockReturnValue({
      data: mockAssignments,
      isLoading: false,
    })
    ;(useCreateSuggestion as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    })

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

    ;(useMyAssignments as jest.Mock).mockReturnValue({
      data: mockAssignments,
      isLoading: false,
    })
    ;(useCreateSuggestion as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    })

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
        dueAt: new Date('2025-12-31').toISOString(),
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

    ;(useMyAssignments as jest.Mock).mockReturnValue({
      data: mockAssignments,
      isLoading: false,
    })
    ;(useCreateSuggestion as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    })

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
        dueAt: new Date('2025-12-31').toISOString(),
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

    ;(useMyAssignments as jest.Mock).mockReturnValue({
      data: mockAssignments,
      isLoading: false,
    })
    ;(useCreateSuggestion as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    })

    render(<MyAssignmentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Should not show add button when at max capacity (2/2 suggestions)
      expect(screen.queryByText(/Add/)).not.toBeInTheDocument()
    })
  })
})
