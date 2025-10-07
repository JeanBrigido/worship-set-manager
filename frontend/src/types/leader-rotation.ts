export interface LeaderRotation {
  id: string
  userId: string
  serviceTypeId: string
  rotationOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    roles: string[]
  }
  serviceType: {
    id: string
    name: string
  }
}

export interface CreateLeaderRotationInput {
  userId: string
  serviceTypeId: string
  rotationOrder?: number
}

export interface UpdateLeaderRotationInput {
  rotationOrder?: number
  isActive?: boolean
}
