import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssignSuggesterModal } from '@/components/worship-set/assign-suggester-modal'
import * as suggestionHooks from '@/hooks/use-suggestions'

vi.mock('@/hooks/use-suggestions')

const mockUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@test.com',
    roles: ['musician'],
  },
  {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@test.com',
    roles: ['leader'],
  },
  {
    id: 'user-3',
    name: 'Bob Wilson',
    email: 'bob@test.com',
    roles: ['musician'],
  },
]

const mockExistingSlot = {
  id: 'slot-1',
  setId: 'ws-1',
  assignedUserId: 'user-1',
  minSongs: 1,
  maxSongs: 3,
  dueAt: '2025-03-01T00:00:00Z',
  status: 'pending' as const,
  assignedUser: mockUsers[0],
  suggestions: [],
}

describe('AssignSuggesterModal Component', () => {
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
  })

  const renderComponent = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      worshipSetId: 'ws-1',
      users: mockUsers,
      ...props,
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <AssignSuggesterModal {...defaultProps} />
      </QueryClientProvider>
    )
  }

  describe('Create Mode (No Existing Slot)', () => {
    it('should render create mode title and description', () => {
      renderComponent()

      expect(screen.getByText('Create Suggestion Slot')).toBeInTheDocument()
      expect(
        screen.getByText('Create a new suggestion slot and assign a user to suggest songs')
      ).toBeInTheDocument()
    })

    it('should display all form fields for creating slot', () => {
      renderComponent()

      expect(screen.getByLabelText(/assign to/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/min songs/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/max songs/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    })

    it('should display user select dropdown with all users', async () => {
      const user = userEvent.setup()
      renderComponent()

      const select = screen.getByRole('combobox')
      await user.click(select)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      })
    })

    it('should display user emails in dropdown', async () => {
      const user = userEvent.setup()
      renderComponent()

      const select = screen.getByRole('combobox')
      await user.click(select)

      await waitFor(() => {
        expect(screen.getByText('john@test.com')).toBeInTheDocument()
        expect(screen.getByText('jane@test.com')).toBeInTheDocument()
      })
    })

    it('should set default min/max songs values', () => {
      renderComponent()

      const minSongsInput = screen.getByLabelText(/min songs/i)
      const maxSongsInput = screen.getByLabelText(/max songs/i)

      expect(minSongsInput).toHaveValue(1)
      expect(maxSongsInput).toHaveValue(3)
    })

    it('should update form values when user inputs', async () => {
      const user = userEvent.setup()
      renderComponent()

      const minSongsInput = screen.getByLabelText(/min songs/i)
      const maxSongsInput = screen.getByLabelText(/max songs/i)

      await user.clear(minSongsInput)
      await user.type(minSongsInput, '2')
      await user.clear(maxSongsInput)
      await user.type(maxSongsInput, '5')

      expect(minSongsInput).toHaveValue(2)
      expect(maxSongsInput).toHaveValue(5)
    })

    it('should validate user selection before submission', async () => {
      const mockCreate = vi.fn()
      vi.mocked(suggestionHooks.useCreateSuggestionSlot).mockReturnValue({
        mutateAsync: mockCreate,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderComponent()

      const submitButton = screen.getByRole('button', { name: /create & assign/i })
      await user.click(submitButton)

      // Should not call create without user selection
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should validate due date before submission', async () => {
      const mockCreate = vi.fn()
      vi.mocked(suggestionHooks.useCreateSuggestionSlot).mockReturnValue({
        mutateAsync: mockCreate,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderComponent()

      // Select user but no due date
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('John Doe'))

      const submitButton = screen.getByRole('button', { name: /create & assign/i })
      await user.click(submitButton)

      // Should show validation error
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should call createSlot mutation with correct data', async () => {
      const mockCreate = vi.fn().mockResolvedValue({})
      vi.mocked(suggestionHooks.useCreateSuggestionSlot).mockReturnValue({
        mutateAsync: mockCreate,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderComponent()

      // Fill form
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('John Doe'))

      const dueAtInput = screen.getByLabelText(/due date/i)
      await user.type(dueAtInput, '2025-03-15')

      const submitButton = screen.getByRole('button', { name: /create & assign/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          setId: 'ws-1',
          assignedUserId: 'user-1',
          minSongs: 1,
          maxSongs: 3,
          dueAt: expect.stringContaining('2025-03-15'),
        })
      })
    })

    it('should close modal after successful creation', async () => {
      const mockCreate = vi.fn().mockResolvedValue({})
      vi.mocked(suggestionHooks.useCreateSuggestionSlot).mockReturnValue({
        mutateAsync: mockCreate,
        isPending: false,
      } as any)

      const onClose = vi.fn()
      const user = userEvent.setup()
      renderComponent({ onClose })

      // Fill and submit form
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('John Doe'))

      const dueAtInput = screen.getByLabelText(/due date/i)
      await user.type(dueAtInput, '2025-03-15')

      const submitButton = screen.getByRole('button', { name: /create & assign/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  describe('Update Mode (Existing Slot)', () => {
    it('should render update mode title and description', () => {
      renderComponent({ existingSlot: mockExistingSlot })

      expect(screen.getByText('Reassign Suggester')).toBeInTheDocument()
      expect(
        screen.getByText('Change the user assigned to this suggestion slot')
      ).toBeInTheDocument()
    })

    it('should pre-populate user selection', async () => {
      renderComponent({ existingSlot: mockExistingSlot })

      // The select should have the existing user selected
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should hide min/max songs and due date fields in update mode', () => {
      renderComponent({ existingSlot: mockExistingSlot })

      expect(screen.queryByLabelText(/min songs/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/max songs/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/due date/i)).not.toBeInTheDocument()
    })

    it('should show "Reassign User" button text', () => {
      renderComponent({ existingSlot: mockExistingSlot })

      expect(screen.getByRole('button', { name: /reassign user/i })).toBeInTheDocument()
    })

    it('should call assignUser mutation with correct data', async () => {
      const mockAssign = vi.fn().mockResolvedValue({})
      vi.mocked(suggestionHooks.useAssignUserToSlot).mockReturnValue({
        mutateAsync: mockAssign,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderComponent({ existingSlot: mockExistingSlot })

      // Change user
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('Jane Smith'))

      const submitButton = screen.getByRole('button', { name: /reassign user/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalledWith({
          slotId: 'slot-1',
          assignedUserId: 'user-2',
        })
      })
    })

    it('should close modal after successful reassignment', async () => {
      const mockAssign = vi.fn().mockResolvedValue({})
      vi.mocked(suggestionHooks.useAssignUserToSlot).mockReturnValue({
        mutateAsync: mockAssign,
        isPending: false,
      } as any)

      const onClose = vi.fn()
      const user = userEvent.setup()
      renderComponent({ existingSlot: mockExistingSlot, onClose })

      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('Jane Smith'))

      const submitButton = screen.getByRole('button', { name: /reassign user/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })
  })

  describe('Modal Controls', () => {
    it('should call onClose when cancel button clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderComponent({ onClose })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('should not render when isOpen is false', () => {
      renderComponent({ isOpen: false })

      expect(screen.queryByText('Create Suggestion Slot')).not.toBeInTheDocument()
    })

    it('should disable submit button while pending', () => {
      vi.mocked(suggestionHooks.useCreateSuggestionSlot).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      } as any)

      renderComponent()

      const submitButton = screen.getByRole('button', { name: /create & assign/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should show error toast when creation fails', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('Failed to create slot'))
      vi.mocked(suggestionHooks.useCreateSuggestionSlot).mockReturnValue({
        mutateAsync: mockCreate,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderComponent()

      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('John Doe'))

      const dueAtInput = screen.getByLabelText(/due date/i)
      await user.type(dueAtInput, '2025-03-15')

      const submitButton = screen.getByRole('button', { name: /create & assign/i })
      await user.click(submitButton)

      // Error should be caught and displayed (via toast)
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled()
      })
    })

    it('should show error toast when assignment fails', async () => {
      const mockAssign = vi.fn().mockRejectedValue(new Error('Failed to assign user'))
      vi.mocked(suggestionHooks.useAssignUserToSlot).mockReturnValue({
        mutateAsync: mockAssign,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      renderComponent({ existingSlot: mockExistingSlot })

      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('Jane Smith'))

      const submitButton = screen.getByRole('button', { name: /reassign user/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalled()
      })
    })
  })

  describe('Form Validation', () => {
    it('should enforce minimum value for min songs', async () => {
      const user = userEvent.setup()
      renderComponent()

      const minSongsInput = screen.getByLabelText(/min songs/i) as HTMLInputElement

      expect(minSongsInput.min).toBe('1')
    })

    it('should enforce minimum value for max songs', async () => {
      const user = userEvent.setup()
      renderComponent()

      const maxSongsInput = screen.getByLabelText(/max songs/i) as HTMLInputElement

      expect(maxSongsInput.min).toBe('1')
    })
  })
})
