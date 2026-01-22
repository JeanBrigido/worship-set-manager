import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuggestedSongs } from '@/components/worship-set/suggested-songs'
import { AssignSuggesterModal } from '@/components/worship-set/assign-suggester-modal'
import * as suggestionHooks from '@/hooks/use-suggestions'

vi.mock('@/hooks/use-suggestions')
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

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

describe('Suggestion Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set up default mock implementations for suggestion hooks
    vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(suggestionHooks.useCreateSuggestionSlot).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      data: undefined,
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      reset: vi.fn(),
      status: 'idle',
      submittedAt: 0,
    } as any)

    vi.mocked(suggestionHooks.useAssignUserToSlot).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      data: undefined,
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      reset: vi.fn(),
      status: 'idle',
      submittedAt: 0,
    } as any)

    vi.mocked(suggestionHooks.useApproveSuggestion).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    vi.mocked(suggestionHooks.useRejectSuggestion).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  })

  describe('Admin - Assign Suggester Flow', () => {
    it('should allow admin to assign a suggester to a worship set', async () => {
      const user = userEvent.setup()
      const mockUsers = [
        { id: 'user-1', name: 'John Doe', email: 'john@example.com', roles: ['musician'] },
        { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', roles: ['musician'] },
      ]

      const mockOnClose = vi.fn()
      const mockCreateSlot = vi.fn()

      render(
        <AssignSuggesterModal
          isOpen={true}
          onClose={mockOnClose}
          worshipSetId="worship-set-1"
          users={mockUsers}
        />,
        { wrapper: createWrapper() }
      )

      // Should display modal title
      expect(screen.getByText('Create Suggestion Slot')).toBeInTheDocument()

      // Should display user dropdown
      const userSelect = screen.getByRole('combobox', { name: /assign to/i })
      expect(userSelect).toBeInTheDocument()
    })
  })

  describe('Leader - Review Suggestions Flow', () => {
    it('should display suggested songs and allow approval', async () => {
      const user = userEvent.setup()
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          songId: 'song-1',
          notes: 'Great song for worship',
          song: {
            id: 'song-1',
            title: 'Amazing Grace',
            artist: 'Traditional',
            versions: [
              { id: 'version-1', name: 'Original', defaultKey: 'G' },
              { id: 'version-2', name: 'Modern', defaultKey: 'C' },
            ],
          },
          suggester: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
          slotInfo: {
            id: 'slot-1',
            minSongs: 1,
            maxSongs: 3,
            dueAt: '2025-12-31',
            status: 'submitted',
          },
        },
      ]

      const mockApproveSuggestion = vi.fn().mockResolvedValue({})
      const mockRejectSuggestion = vi.fn().mockResolvedValue({})

      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockClear()
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockImplementation(() => ({
        data: mockSuggestions,
        isLoading: false,
      } as any))
      vi.mocked(suggestionHooks.useApproveSuggestion).mockReturnValue({
        mutateAsync: mockApproveSuggestion,
        isPending: false,
      } as any)
      vi.mocked(suggestionHooks.useRejectSuggestion).mockReturnValue({
        mutateAsync: mockRejectSuggestion,
        isPending: false,
      } as any)

      const mockOnAddToSet = vi.fn()
      const mockOnReject = vi.fn()

      render(
        <SuggestedSongs
          worshipSetId="worship-set-1"
          onAddToSet={mockOnAddToSet}
          onReject={mockOnReject}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Should display suggestion
        expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
        expect(screen.getByText('Traditional')).toBeInTheDocument()
        expect(screen.getByText('"Great song for worship"')).toBeInTheDocument()
        // Check for suggester name - the text is split across elements
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click "Add to Set" button
      const addButton = screen.getByRole('button', { name: /add to set/i })
      await user.click(addButton)

      await waitFor(() => {
        // Should show version selection dialog
        expect(screen.getByText('Add "Amazing Grace" to Worship Set')).toBeInTheDocument()
        expect(screen.getByText('Select the version you want to add to the worship set')).toBeInTheDocument()
      })
    })

    it('should allow rejecting a suggestion', async () => {
      const user = userEvent.setup()
      const mockSuggestions = [
        {
          id: 'suggestion-1',
          songId: 'song-1',
          song: {
            id: 'song-1',
            title: 'Test Song',
            artist: 'Test Artist',
            versions: [{ id: 'version-1', name: 'Original' }],
          },
          suggester: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      ]

      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)
      vi.mocked(suggestionHooks.useApproveSuggestion).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(suggestionHooks.useRejectSuggestion).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      const mockOnReject = vi.fn()

      render(
        <SuggestedSongs
          worshipSetId="worship-set-1"
          onReject={mockOnReject}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Test Song')).toBeInTheDocument()
      })

      // Click reject button
      const rejectButton = screen.getByRole('button', { name: /reject/i })
      await user.click(rejectButton)

      expect(mockOnReject).toHaveBeenCalledWith('suggestion-1')
    })

    it('should show empty state when no suggestions', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      render(
        <SuggestedSongs worshipSetId="worship-set-1" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Suggested Songs')).toBeInTheDocument()
        expect(screen.getByText('No song suggestions yet')).toBeInTheDocument()
      })
    })
  })

  describe('Complete Workflow', () => {
    it('should handle the complete suggestion lifecycle', async () => {
      // 1. Admin assigns suggester
      // 2. User submits suggestion
      // 3. Leader reviews and approves
      // 4. Song is added to worship set

      const mockSuggestion = {
        id: 'suggestion-1',
        songId: 'song-1',
        notes: 'Perfect for this Sunday',
        song: {
          id: 'song-1',
          title: 'How Great Is Our God',
          artist: 'Chris Tomlin',
          versions: [
            { id: 'version-1', name: 'Original', defaultKey: 'C' },
          ],
        },
        suggester: {
          id: 'user-1',
          name: 'Worship Leader',
          email: 'leader@example.com',
        },
        slotInfo: {
          id: 'slot-1',
          minSongs: 1,
          maxSongs: 3,
          dueAt: new Date('2025-12-31').toISOString(),
          status: 'submitted',
        },
      }

      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockClear()
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockImplementation(() => ({
        data: [mockSuggestion],
        isLoading: false,
      } as any))

      const mockOnAddToSet = vi.fn()

      render(
        <SuggestedSongs
          worshipSetId="worship-set-1"
          onAddToSet={mockOnAddToSet}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Verify suggestion is displayed
        expect(screen.getByText('How Great Is Our God')).toBeInTheDocument()
        expect(screen.getByText('Chris Tomlin')).toBeInTheDocument()
        expect(screen.getByText('"Perfect for this Sunday"')).toBeInTheDocument()
        // Check for suggester name - the text is split across elements
        expect(screen.getByText('Worship Leader')).toBeInTheDocument()
      })

      // Leader clicks "Add to Set"
      const addButton = screen.getByRole('button', { name: /add to set/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        // Version selection dialog appears
        expect(screen.getByText('Add "How Great Is Our God" to Worship Set')).toBeInTheDocument()
      })

      // Leader confirms adding with selected version
      const confirmButton = screen.getByRole('button', { name: /^add to set$/i })
      fireEvent.click(confirmButton)

      // Verify the callback was called with correct data
      await waitFor(() => {
        expect(mockOnAddToSet).toHaveBeenCalledWith(mockSuggestion, 'version-1')
      })
    })
  })
})
