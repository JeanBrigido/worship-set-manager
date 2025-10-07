import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { SuggestedSongs } from '@/components/worship-set/suggested-songs'
import { AssignSuggesterModal } from '@/components/worship-set/assign-suggester-modal'
import { useSuggestionsByWorshipSet, useApproveSuggestion, useRejectSuggestion } from '@/hooks/use-suggestions'

jest.mock('@/hooks/use-suggestions')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
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
      <SessionProvider session={{ user: { id: '1', name: 'Admin', email: 'admin@example.com', roles: ['admin'] }, expires: '2099-01-01' }}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  )
}

describe('Suggestion Workflow Integration Tests', () => {
  describe('Admin - Assign Suggester Flow', () => {
    it('should allow admin to assign a suggester to a worship set', async () => {
      const user = userEvent.setup()
      const mockUsers = [
        { id: 'user-1', name: 'John Doe', email: 'john@example.com', roles: ['musician'] },
        { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', roles: ['musician'] },
      ]

      const mockOnClose = jest.fn()
      const mockCreateSlot = jest.fn()

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

      const mockApproveSuggestion = jest.fn().mockResolvedValue({})
      const mockRejectSuggestion = jest.fn().mockResolvedValue({})

      ;(useSuggestionsByWorshipSet as jest.Mock).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      })
      ;(useApproveSuggestion as jest.Mock).mockReturnValue({
        mutateAsync: mockApproveSuggestion,
        isPending: false,
      })
      ;(useRejectSuggestion as jest.Mock).mockReturnValue({
        mutateAsync: mockRejectSuggestion,
        isPending: false,
      })

      const mockOnAddToSet = jest.fn()
      const mockOnReject = jest.fn()

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
        expect(screen.getByText('Suggested by John Doe')).toBeInTheDocument()
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

      ;(useSuggestionsByWorshipSet as jest.Mock).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      })
      ;(useApproveSuggestion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      })
      ;(useRejectSuggestion as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      })

      const mockOnReject = jest.fn()

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
      ;(useSuggestionsByWorshipSet as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      })

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

      ;(useSuggestionsByWorshipSet as jest.Mock).mockReturnValue({
        data: [mockSuggestion],
        isLoading: false,
      })

      const mockOnAddToSet = jest.fn()

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
        expect(screen.getByText('Suggested by Worship Leader')).toBeInTheDocument()
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
