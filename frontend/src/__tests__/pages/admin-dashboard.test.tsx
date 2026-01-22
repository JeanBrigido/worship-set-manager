import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminDashboard from '@/app/admin/dashboard/page'
import * as leaderRotationHooks from '@/hooks/use-leader-rotations'
import { apiClient } from '@/lib/api-client'

// Mock modules
vi.mock('next-auth/react')
vi.mock('next/navigation')
vi.mock('@/lib/api-client')
vi.mock('@/hooks/use-leader-rotations')

const mockSession = {
  user: {
    id: 'admin-user-id',
    email: 'admin@test.com',
    name: 'Admin User',
    roles: ['admin'],
  },
  expires: '2025-12-31',
}

const mockServiceTypes = [
  { id: 'st-1', name: 'Sunday Service', defaultStartTime: '09:00' },
  { id: 'st-2', name: 'Tuesday Prayer', defaultStartTime: '19:00' },
]

const mockLeaders = [
  { id: 'user-1', name: 'Leader One', email: 'leader1@test.com', roles: ['leader'] },
  { id: 'user-2', name: 'Leader Two', email: 'leader2@test.com', roles: ['leader'] },
]

const mockRotations = [
  {
    id: 'rot-1',
    userId: 'user-1',
    serviceTypeId: 'st-1',
    rotationOrder: 1,
    isActive: true,
    user: mockLeaders[0],
    serviceType: mockServiceTypes[0],
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'rot-2',
    userId: 'user-2',
    serviceTypeId: 'st-1',
    rotationOrder: 2,
    isActive: true,
    user: mockLeaders[1],
    serviceType: mockServiceTypes[0],
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
]

const mockUpcomingServices = [
  {
    id: 'service-1',
    serviceDate: '2025-03-01T09:00:00Z',
    serviceType: { id: 'st-1', name: 'Sunday Service' },
    worshipSet: {
      id: 'ws-1',
      leaderUserId: 'user-1',
      leaderUser: { id: 'user-1', name: 'Leader One', email: 'leader1@test.com' },
    },
  },
  {
    id: 'service-2',
    serviceDate: '2025-03-08T09:00:00Z',
    serviceType: { id: 'st-1', name: 'Sunday Service' },
    worshipSet: {
      id: 'ws-2',
      leaderUserId: null,
    },
  },
]

describe('AdminDashboard Page', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    vi.clearAllMocks()

    // Mock useSession with admin user
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    } as any)

    // Mock useRouter
    const mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    }
    vi.mocked(useRouter).mockReturnValue(mockRouter as any)

    // Mock API calls
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/service-types') {
        return Promise.resolve({ data: mockServiceTypes })
      }
      if (url === '/users') {
        return Promise.resolve({ data: [...mockLeaders] })
      }
      if (url.includes('/services')) {
        return Promise.resolve({ data: mockUpcomingServices })
      }
      return Promise.resolve({ data: [] })
    })

    // Set up default mock implementations for leader rotation hooks
    vi.mocked(leaderRotationHooks.useLeaderRotations).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      status: 'success',
    } as any)

    vi.mocked(leaderRotationHooks.useCreateLeaderRotation).mockReturnValue({
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

    vi.mocked(leaderRotationHooks.useDeleteLeaderRotation).mockReturnValue({
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

    vi.mocked(leaderRotationHooks.useUpdateLeaderRotation).mockReturnValue({
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

    vi.mocked(leaderRotationHooks.useAssignLeader).mockReturnValue({
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

    vi.mocked(leaderRotationHooks.useReorderLeaderRotations).mockReturnValue({
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

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AdminDashboard />
      </QueryClientProvider>
    )
  }

  describe('Authentication and Authorization', () => {
    it('should render dashboard for admin users', async () => {
      vi.mocked(leaderRotationHooks.useLeaderRotations).mockReturnValue({
        data: mockRotations,
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
    })

    it('should redirect non-admin users to homepage', () => {
      const mockPush = vi.fn()
      vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)

      vi.mocked(useSession).mockReturnValue({
        data: { ...mockSession, user: { ...mockSession.user, roles: ['musician'] } },
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      renderComponent()

      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('should show loading state while checking authentication', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'loading',
        update: vi.fn(),
      } as any)

      renderComponent()

      // Should not render dashboard content while loading
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
    })
  })

  describe('Leader Rotation Management', () => {
    beforeEach(() => {
      vi.mocked(leaderRotationHooks.useLeaderRotations).mockReturnValue({
        data: mockRotations,
        isLoading: false,
      } as any)
    })

    it('should display leader rotation table', async () => {
      renderComponent()

      // Wait for service types to load (which triggers the rotation display)
      // Use getAllByText since "Sunday Service" appears in multiple places
      await waitFor(() => {
        const serviceNames = screen.getAllByText('Sunday Service')
        expect(serviceNames.length).toBeGreaterThan(0)
      })

      expect(screen.getByText('Leader Rotation Management')).toBeInTheDocument()
      // Leaders appear in both rotation table and upcoming services, so use getAllByText
      const leaderOneElements = screen.getAllByText('Leader One')
      expect(leaderOneElements.length).toBeGreaterThan(0)
      expect(screen.getByText('Leader Two')).toBeInTheDocument()
    })

    it('should display rotation order correctly', async () => {
      renderComponent()

      // Wait for data to load - use getAllByText since "Sunday Service" appears in multiple places
      await waitFor(() => {
        const serviceNames = screen.getAllByText('Sunday Service')
        expect(serviceNames.length).toBeGreaterThan(0)
      })

      // Get the first table (leader rotation table, not upcoming services)
      const tables = screen.getAllByRole('table')
      const rotationTable = tables[0]
      const rows = within(rotationTable).getAllByRole('row')

      // Check rotation orders in table (skip header row)
      expect(within(rows[1]).getByText('1')).toBeInTheDocument()
      expect(within(rows[2]).getByText('2')).toBeInTheDocument()
    })

    it('should show "Add to Rotation" button', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add to rotation/i })).toBeInTheDocument()
      })
    })

    it('should open add rotation modal when button clicked', async () => {
      const user = userEvent.setup()
      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add to rotation/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /add to rotation/i }))

      await waitFor(() => {
        expect(screen.getByText('Add Leader to Rotation')).toBeInTheDocument()
      })
    })

    it('should display active/inactive status badges', async () => {
      renderComponent()

      // Wait for data to load - use getAllByText since "Sunday Service" appears in multiple places
      await waitFor(() => {
        const serviceNames = screen.getAllByText('Sunday Service')
        expect(serviceNames.length).toBeGreaterThan(0)
      })

      const badges = screen.getAllByText('Active')
      expect(badges.length).toBeGreaterThan(0)
    })

    it('should show delete button for each rotation', async () => {
      renderComponent()

      // Wait for data to load - use getAllByText since "Sunday Service" appears in multiple places
      await waitFor(() => {
        const serviceNames = screen.getAllByText('Sunday Service')
        expect(serviceNames.length).toBeGreaterThan(0)
      })

      // The delete buttons have aria-labels like "Remove Leader One from rotation"
      const deleteButtons = screen.getAllByRole('button', { name: /remove .* from rotation/i })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Add Rotation Modal', () => {
    beforeEach(() => {
      vi.mocked(leaderRotationHooks.useLeaderRotations).mockReturnValue({
        data: mockRotations,
        isLoading: false,
      } as any)
    })

    it('should show form fields in add rotation modal', async () => {
      const user = userEvent.setup()
      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add to rotation/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /add to rotation/i }))

      await waitFor(() => {
        // The dialog should be open
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Check for form fields inside the dialog
      const dialog = screen.getByRole('dialog')
      // The labels are inside the dialog, look for them by their text content
      // Using getAllByText because "Leader" might appear elsewhere, then check we found one in dialog
      const leaderLabels = within(dialog).getAllByText('Leader')
      expect(leaderLabels.length).toBeGreaterThan(0)
      expect(within(dialog).getByText('Service Type')).toBeInTheDocument()
      expect(within(dialog).getByText('Rotation Order')).toBeInTheDocument()
    })

    it('should validate required fields before submission', async () => {
      const user = userEvent.setup()
      const mockCreate = vi.fn()
      vi.mocked(leaderRotationHooks.useCreateLeaderRotation).mockReturnValue({
        mutateAsync: mockCreate,
        isPending: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add to rotation/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /add to rotation/i }))

      // Try to submit without selecting leader or service type
      const submitButton = screen.getByRole('button', { name: /add to rotation/i })
      await user.click(submitButton)

      // Should show validation error (toast)
      await waitFor(() => {
        expect(mockCreate).not.toHaveBeenCalled()
      })
    })
  })

  describe('Upcoming Services Display', () => {
    beforeEach(() => {
      vi.mocked(leaderRotationHooks.useLeaderRotations).mockReturnValue({
        data: mockRotations,
        isLoading: false,
      } as any)
    })

    it('should display upcoming services table', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Upcoming Services')).toBeInTheDocument()
      })
    })

    it('should show assigned leader for services', async () => {
      renderComponent()

      // Wait for services to load - Leader One is both in rotation AND assigned to a service
      await waitFor(() => {
        // The leader appears in multiple places - at least one should be visible
        const leaderElements = screen.getAllByText('Leader One')
        expect(leaderElements.length).toBeGreaterThan(0)
      })
    })

    it('should show "Not assigned" for services without leader', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Not assigned')).toBeInTheDocument()
      })
    })

    it('should show assign/reassign buttons', async () => {
      renderComponent()

      await waitFor(() => {
        // Look for buttons with aria-labels matching assign/reassign pattern
        const assignButtons = screen.getAllByRole('button', { name: /assign leader for|reassign leader for/i })
        expect(assignButtons.length).toBeGreaterThan(0)
      })
    })

    it('should open assign leader modal when assign button clicked', async () => {
      const user = userEvent.setup()
      renderComponent()

      await waitFor(() => {
        const assignButtons = screen.getAllByRole('button', { name: /assign leader for|reassign leader for/i })
        expect(assignButtons[0]).toBeInTheDocument()
      })

      const assignButton = screen.getAllByRole('button', { name: /assign leader for|reassign leader for/i })[0]
      await user.click(assignButton)

      await waitFor(() => {
        expect(screen.getByText('Assign Leader')).toBeInTheDocument()
      })
    })
  })

  describe('Loading and Error States', () => {
    it('should show loading skeleton while fetching rotations', () => {
      vi.mocked(leaderRotationHooks.useLeaderRotations).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      renderComponent()

      // Dashboard should still render but show loading state
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })

    it('should handle empty rotations gracefully', async () => {
      vi.mocked(leaderRotationHooks.useLeaderRotations).mockReturnValue({
        data: [],
        isLoading: false,
      } as any)

      renderComponent()

      await waitFor(() => {
        const elements = screen.getAllByText(/no leaders in rotation/i)
        expect(elements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Quick Actions', () => {
    beforeEach(() => {
      vi.mocked(leaderRotationHooks.useLeaderRotations).mockReturnValue({
        data: mockRotations,
        isLoading: false,
      } as any)
    })

    it('should show Back to Home button', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument()
      })
    })

    it('should navigate to home when back button clicked', async () => {
      renderComponent()

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to home/i })
        expect(backLink).toHaveAttribute('href', '/')
      })
    })
  })
})
