/**
 * Team Members Registry
 *
 * This file contains the list of wallet addresses for team members in this organization.
 *
 * TODO: Replace with on-chain registry (System Remarks or Smart Contract with RBAC)
 * For now, this serves as a simple MVP implementation.
 *
 * Each organization instance should maintain their own team member list here.
 */

export interface TeamMember {
  address: string
  role?: 'admin' | 'member' | 'viewer' // For future RBAC implementation
  addedAt?: string
}

/**
 * List of team member addresses for this organization
 *
 * To add a new team member:
 * 1. Add their Polkadot address to this array
 * 2. They must have an on-chain identity set on People Chain
 * 3. Their role determines access permissions (to be implemented)
 */
export const TEAM_MEMBERS: TeamMember[] = [
  // Example entries - replace with your actual team members
  // {
  //   address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', // Alice
  //   role: 'admin',
  //   addedAt: '2024-01-01'
  // },
  // Add your team members here
]

/**
 * Check if an address is a team member
 */
export function isTeamMember(address: string): boolean {
  return TEAM_MEMBERS.some(member => member.address === address)
}

/**
 * Get team member info
 */
export function getTeamMember(address: string): TeamMember | undefined {
  return TEAM_MEMBERS.find(member => member.address === address)
}

/**
 * Get all team member addresses
 */
export function getTeamMemberAddresses(): string[] {
  return TEAM_MEMBERS.map(member => member.address)
}
