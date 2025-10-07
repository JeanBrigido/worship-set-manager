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

    it('should display available versions in dialog', async () => {
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

      // Open the select dropdown
      await user.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByText(/Live Version/)).toBeInTheDocument()
        expect(screen.getByText(/Studio Version/)).toBeInTheDocument()
      })
    })

    it('should call onAddToSet with correct parameters', async () => {
      vi.mocked(suggestionHooks.useSuggestionsByWorshipSet).mockReturnValue({
        data: mockSuggestions,
        isLoading: false,
      } as any)

      const onAddToSet = vi.fn()
      const user = userEvent.setup()
      renderComponent({ onAddToSet })

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /add to set/i })[0]).toBeInTheDocument()
      })

      await user.click(screen.getAllByRole('button', { name: /add to set/i })[0])

      // Click the add button in the dialog (should use pre-selected version)
      const dialogAddButton = screen.getAllByRole('button', { name: /add to set/i })[1]
      await user.click(dialogAddButton)

      expect(onAddToSet).toHaveBeenCalledWith(mockSuggestions[0], 'ver-1')
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

      const user = userEvent.setup()
      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /add to set/i })[0]).toBeInTheDocument()
      })

      await user.click(screen.getAllByRole('button', { name: /add to set/i })[0])

      const dialogAddButton = screen.getAllByRole('button', { name: /add to set/i })[1]
      expect(dialogAddButton).toBeDisabled()
    })
  })
})
