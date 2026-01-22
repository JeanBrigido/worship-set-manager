import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuggestedSongs } from '@/components/worship-set/suggested-songs'
import * as suggestionHooks from '@/hooks/use-suggestions'

vi.mock('@/hooks/use-suggestions')

const mockSuggestions = [
  {
    id: 'sug-1',
    slotId: 'slot-1',
    songId: 'song-1',
    notes: 'Great worship song for opening',
    song: {
      id: 'song-1',
      title: 'Amazing Grace',
      artist: 'Chris Tomlin',
      versions: [
        { id: 'ver-1', name: 'Live Version', defaultKey: 'G', youtubeUrl: 'https://youtube.com/1' },
        { id: 'ver-2', name: 'Studio Version', defaultKey: 'A', youtubeUrl: 'https://youtube.com/2' },
      ],
    },
    suggester: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@test.com',
    },
    slotInfo: {
      id: 'slot-1',
      minSongs: 1,
      maxSongs: 3,
      dueAt: '2025-03-01T00:00:00Z',
      status: 'submitted',
    },
  },
  {
    id: 'sug-2',
    slotId: 'slot-1',
    songId: 'song-2',
    notes: null,
    song: {
      id: 'song-2',
      title: 'How Great Is Our God',
      artist: 'Hillsong',
      versions: [
        { id: 'ver-3', name: 'Original', defaultKey: 'C' },
      ],
    },
    suggester: {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@test.com',
    },
    slotInfo: {
      id: 'slot-1',
      minSongs: 1,
      maxSongs: 3,
      dueAt: '2025-03-01T00:00:00Z',
      status: 'pending',
    },
  },
]

describe('SuggestedSongs Component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    vi.clearAllMocks()

    // Set up default mock implementations
    vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      status: 'success',
    } as any)
  })

  const renderComponent = (props = {}) => {
    const defaultProps = {
      worshipSetId: 'ws-1',
      onAddToSet: vi.fn(),
      onReject: vi.fn(),
      ...props,
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <SuggestedSongs {...defaultProps} />
      </QueryClientProvider>
    )
  }

  describe('Rendering', () => {
    it('should render list of suggested songs', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
        expect(screen.getByText('How Great Is Our God')).toBeInTheDocument()
      })
    })

    it('should display suggester name for each suggestion', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/John Doe/)).toBeInTheDocument()
        expect(screen.getByText(/Jane Smith/)).toBeInTheDocument()
      })
    })

    it('should display artist names', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Chris Tomlin')).toBeInTheDocument()
        expect(screen.getByText('Hillsong')).toBeInTheDocument()
      })
    })

    it('should display suggestion notes when available', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('"Great worship song for opening"')).toBeInTheDocument()
      })
    })

    it('should display version count badge', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('2 versions')).toBeInTheDocument()
        expect(screen.getByText('1 version')).toBeInTheDocument()
      })
    })

    it('should display slot status badges', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('submitted')).toBeInTheDocument()
        expect(screen.getByText('pending')).toBeInTheDocument()
      })
    })
  })

  describe('Actions', () => {
    it('should show "Add to Set" button for each suggestion', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        const addButtons = screen.getAllByRole('button', { name: /add to set/i })
        expect(addButtons).toHaveLength(2)
      })
    })

    it('should show "Reject" button for each suggestion', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        const rejectButtons = screen.getAllByRole('button', { name: /reject/i })
        expect(rejectButtons).toHaveLength(2)
      })
    })

    it('should open version selection dialog when "Add to Set" clicked', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /add to set/i })[0]).toBeInTheDocument()
      })

      await user.click(screen.getAllByRole('button', { name: /add to set/i })[0])

      expect(screen.getByText('Add "Amazing Grace" to Worship Set')).toBeInTheDocument()
      expect(screen.getByText('Select the version you want to add to the worship set')).toBeInTheDocument()
    })

    it('should display version selector in dialog', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      // Disable pointer-events check for Radix UI compatibility in JSDOM
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /add to set/i })[0]).toBeInTheDocument()
      })

      await user.click(screen.getAllByRole('button', { name: /add to set/i })[0])

      // Wait for dialog to open by checking for dialog-specific content
      await waitFor(() => {
        expect(screen.getByText(/Select the version you want to add/i)).toBeInTheDocument()
      })

      // Verify the version selector (combobox) is present
      // Note: Testing actual dropdown selection in Radix UI requires a real browser
      // This test verifies the dialog opens with the version selector
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
        expect(screen.getByText('Song Version')).toBeInTheDocument()
      })
    })

    it('should call onAddToSet with correct parameters', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      const onAddToSet = vi.fn()
      // Disable pointer-events check for Radix UI compatibility in JSDOM
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderComponent({ onAddToSet })

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /add to set/i })[0]).toBeInTheDocument()
      })

      await user.click(screen.getAllByRole('button', { name: /add to set/i })[0])

      // Wait for dialog to open by checking for dialog-specific content
      await waitFor(() => {
        expect(screen.getByText(/Select the version you want to add/i)).toBeInTheDocument()
      })

      // Find and click the add button inside the dialog (should use pre-selected version)
      const dialogContent = screen.getByRole('dialog')
      const dialogAddButton = within(dialogContent).getByRole('button', { name: /add to set/i })
      await user.click(dialogAddButton)

      await waitFor(() => {
        expect(onAddToSet).toHaveBeenCalledWith(mockSuggestions[0], 'ver-1')
      })
    })

    it('should call onReject with suggestion ID', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      const onReject = vi.fn()
      const user = userEvent.setup()
      renderComponent({ onReject })

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /reject/i })[0]).toBeInTheDocument()
      })

      await user.click(screen.getAllByRole('button', { name: /reject/i })[0])

      expect(onReject).toHaveBeenCalledWith('sug-1')
    })
  })

  describe('Loading and Empty States', () => {
    it('should show loading state while fetching', () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      renderComponent()

      expect(screen.getByText('Loading suggestions...')).toBeInTheDocument()
    })

    it('should show empty state when no suggestions', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('No song suggestions yet')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle song without artist', async () => {
      const suggestionWithoutArtist = {
        ...mockSuggestions[0],
        song: { ...mockSuggestions[0].song, artist: null },
      }

      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: [suggestionWithoutArtist],
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Amazing Grace')).toBeInTheDocument()
      })
    })

    it('should handle song without versions', async () => {
      const suggestionNoVersions = {
        ...mockSuggestions[0],
        song: { ...mockSuggestions[0].song, versions: [] },
      }

      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: [suggestionNoVersions],
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /add to set/i })[0]).toBeInTheDocument()
      })

      await user.click(screen.getAllByRole('button', { name: /add to set/i })[0])

      expect(screen.getByText('No versions available for this song. Please add a version first.')).toBeInTheDocument()
    })

    it('should disable add button when no version selected', async () => {
      const suggestionNoVersions = {
        ...mockSuggestions[0],
        song: { ...mockSuggestions[0].song, versions: [] },
      }

      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: [suggestionNoVersions],
        isLoading: false,
      } as any)

      // Disable pointer-events check for Radix UI compatibility in JSDOM
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /add to set/i })[0]).toBeInTheDocument()
      })

      await user.click(screen.getAllByRole('button', { name: /add to set/i })[0])

      // Wait for dialog to open by checking for dialog-specific content
      await waitFor(() => {
        expect(screen.getByText(/No versions available for this song/i)).toBeInTheDocument()
      })

      // Find the add button inside the dialog - it should be disabled
      const dialogContent = screen.getByRole('dialog')
      const dialogAddButton = within(dialogContent).getByRole('button', { name: /add to set/i })
      expect(dialogAddButton).toBeDisabled()
    })
  })
})
