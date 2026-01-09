import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, LayoutDashboard, FileText, Vote, Users, Search, User, CheckCircle2, Plus, Wallet, AlertCircle, UserPlus } from 'lucide-react'
import { useTypink } from 'typink'
import { SettingsMenu } from '../components/SettingsMenu'
import { useIdentity } from '../modules/profile/use-identity'
import { useEVM } from '../providers/EVMProvider'
import { useRBACContract, Role, Action, Resource, roleToString, stringToRole } from '../hooks/useRBACContract'
import { useDiscoveredUsers } from '../hooks/useDiscoveredUsers'

type AdminSection = 'rbac' | 'dashboard' | 'forms' | 'polls' | 'users'

export default function Admin() {
  const { connectedAccount } = useTypink()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')

  if (!connectedAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#fafaf9]">
        <div className="max-w-md w-full text-center">
          <h2 className="text-3xl font-bold text-[#1c1917] mb-4 font-serif">
            Access Denied
          </h2>
          <p className="text-[#78716c] mb-8">
            Please connect your wallet to access the admin panel
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-grey-900 text-white rounded-xl hover:bg-grey-800 transition-colors font-medium"
          >
            Go to Landing Page
          </button>
        </div>
      </div>
    )
  }

  const sections = [
    {
      id: 'dashboard' as AdminSection,
      name: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview and analytics'
    },
    {
      id: 'rbac' as AdminSection,
      name: 'RBAC',
      icon: Shield,
      description: 'Role-based access control'
    },
    {
      id: 'users' as AdminSection,
      name: 'Users',
      icon: Users,
      description: 'Manage team members'
    },
    {
      id: 'polls' as AdminSection,
      name: 'Polls',
      icon: Vote,
      description: 'Governance & voting'
    },
    {
      id: 'forms' as AdminSection,
      name: 'Forms',
      icon: FileText,
      description: 'Form management'
    }
  ]

  return (
    <div className="min-h-screen p-6 bg-[#fafaf9]">
      <div className="max-w-[1600px] mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-6 mb-6">
          {/* Back Button + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-3 bg-white border border-[#e7e5e4] hover:bg-[#fafaf9] rounded-xl transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <ArrowLeft className="w-5 h-5 text-[#78716c]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#1c1917] font-serif">
                Admin Panel
              </h1>
              <p className="text-sm text-[#78716c]">
                Manage organization settings and permissions
              </p>
            </div>
          </div>

          {/* Settings Menu */}
          <SettingsMenu />
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="text-xs font-semibold text-[#78716c] uppercase tracking-wide mb-3 px-2">
                Admin Sections
              </h2>
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  const isActive = activeSection === section.id

                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-accent-soft border border-accent/20 text-accent'
                          : 'hover:bg-[#fafaf9] text-[#57534e] hover:text-[#1c1917]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        isActive ? 'text-accent' : 'text-[#78716c]'
                      }`} />
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-medium ${
                          isActive ? 'text-accent' : 'text-[#1c1917]'
                        }`}>
                          {section.name}
                        </p>
                        <p className="text-xs text-[#78716c] mt-0.5">
                          {section.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-9">
            {activeSection === 'dashboard' && <AdminDashboard />}
            {activeSection === 'rbac' && <AdminRBAC />}
            {activeSection === 'users' && <AdminUsers />}
            {activeSection === 'polls' && <AdminPolls />}
            {activeSection === 'forms' && <AdminForms />}
          </div>
        </div>
      </div>
    </div>
  )
}

// Admin Dashboard Section
function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-xl font-bold text-[#1c1917] mb-4 font-serif">
          Dashboard Overview
        </h2>
        <p className="text-sm text-[#78716c] mb-6">
          Analytics and insights for your organization
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl">
            <p className="text-xs text-[#78716c] mb-1">Total Members</p>
            <p className="text-2xl font-bold text-[#1c1917]">0</p>
          </div>
          <div className="p-4 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl">
            <p className="text-xs text-[#78716c] mb-1">Active Polls</p>
            <p className="text-2xl font-bold text-[#1c1917]">0</p>
          </div>
          <div className="p-4 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl">
            <p className="text-xs text-[#78716c] mb-1">Forms Created</p>
            <p className="text-2xl font-bold text-[#1c1917]">0</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Admin RBAC Section
function AdminRBAC() {
  const { provider, signer, account, connected, connecting, connect, error: evmError } = useEVM()
  const rbac = useRBACContract(provider, signer)
  const [organizationName, setOrganizationName] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false)

  // Check if user has an organization (for demo, using localStorage)
  useEffect(() => {
    const savedOrgId = localStorage.getItem('intran3t_org_id')
    if (savedOrgId) {
      setOrgId(savedOrgId)
    }
  }, [])

  const handleCreateOrganization = async () => {
    if (!organizationName.trim()) return

    try {
      setCreatingOrg(true)
      const newOrgId = await rbac.createOrganization(organizationName)
      setOrgId(newOrgId)
      localStorage.setItem('intran3t_org_id', newOrgId)
      setShowCreateOrgModal(false)
      setOrganizationName('')
    } catch (error) {
      console.error('Failed to create organization:', error)
      alert('Failed to create organization. Check console for details.')
    } finally {
      setCreatingOrg(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* EVM Connection Card */}
      {!connected && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                Enable EVM Mode
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                RBAC management requires your Polkadot wallet's EVM capability to interact with the smart contract on Polkadot Hub EVM. Supported wallets: Polkadot.js Extension, Talisman, SubWallet, Nova Wallet.
              </p>
              {evmError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700">{evmError}</p>
                </div>
              )}
              <button
                onClick={connect}
                disabled={connecting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? 'Connecting...' : 'Enable EVM Mode'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main RBAC Card */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-accent" />
            <div>
              <h2 className="text-xl font-bold text-[#1c1917] font-serif">
                Role-Based Access Control
              </h2>
              <p className="text-sm text-[#78716c] mt-1">
                Manage on-chain roles and permissions via smart contract
              </p>
            </div>
          </div>
          {connected && (
            <div className="text-right">
              <p className="text-xs text-[#78716c]">EVM Account</p>
              <p className="text-xs font-mono text-[#1c1917]">
                {account?.slice(0, 6)}...{account?.slice(-4)}
              </p>
            </div>
          )}
        </div>

        {/* Organization Management */}
        {connected ? (
          <>
            {!orgId ? (
              <div className="p-6 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl text-center">
                <Shield className="w-12 h-12 text-[#a8a29e] mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-[#1c1917] mb-2">
                  Create Your Organization
                </h3>
                <p className="text-sm text-[#78716c] mb-4">
                  Initialize your organization on-chain to start managing roles and permissions
                </p>
                <button
                  onClick={() => setShowCreateOrgModal(true)}
                  className="px-4 py-2 bg-grey-900 text-white rounded-lg hover:bg-grey-800 transition-colors font-medium text-sm"
                >
                  Create Organization
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Organization Info */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-green-900">
                      Organization Active
                    </p>
                  </div>
                  <p className="text-xs text-green-700 font-mono">
                    Org ID: {orgId.slice(0, 10)}...{orgId.slice(-10)}
                  </p>
                </div>

                {/* Permission Matrix */}
                <div>
                  <h3 className="text-sm font-semibold text-[#1c1917] mb-3">
                    Permission Matrix
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#e7e5e4]">
                          <th className="text-left py-2 px-3 text-[#78716c] font-semibold">Role</th>
                          <th className="text-center py-2 px-3 text-[#78716c] font-semibold">Create Poll</th>
                          <th className="text-center py-2 px-3 text-[#78716c] font-semibold">Vote</th>
                          <th className="text-center py-2 px-3 text-[#78716c] font-semibold">Create Form</th>
                          <th className="text-center py-2 px-3 text-[#78716c] font-semibold">View Results</th>
                          <th className="text-center py-2 px-3 text-[#78716c] font-semibold">Manage Users</th>
                          <th className="text-center py-2 px-3 text-[#78716c] font-semibold">Settings</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#f5f5f4]">
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 bg-accent-soft text-accent border border-accent/20 rounded text-xs font-medium">
                              Admin
                            </span>
                          </td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">✅</td>
                        </tr>
                        <tr className="border-b border-[#f5f5f4]">
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-medium">
                              People/Culture
                            </span>
                          </td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">❌</td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">❌</td>
                        </tr>
                        <tr className="border-b border-[#f5f5f4]">
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium">
                              Member
                            </span>
                          </td>
                          <td className="text-center py-2 px-3">❌</td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">✅</td>
                          <td className="text-center py-2 px-3">❌</td>
                          <td className="text-center py-2 px-3">❌</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-700 border border-gray-200 rounded text-xs font-medium">
                              Viewer
                            </span>
                          </td>
                          <td className="text-center py-2 px-3">❌</td>
                          <td className="text-center py-2 px-3">❌</td>
                          <td className="text-center py-2 px-3">❌</td>
                          <td className="text-center py-2 px-3">❌</td>
                          <td className="text-center py-2 px-3">❌</td>
                          <td className="text-center py-2 px-3">❌</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Smart Contract Info */}
                <div className="p-4 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl">
                  <p className="text-xs text-[#78716c] mb-2">
                    <strong>Smart Contract:</strong> Roles and permissions are managed on-chain via Verifiable Credentials
                  </p>
                  <p className="text-xs text-[#78716c]">
                    <strong>Chain:</strong> Polkadot Hub EVM (Testnet: Chain ID 420420)
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl text-center">
            <AlertCircle className="w-12 h-12 text-[#a8a29e] mx-auto mb-3" />
            <p className="text-sm text-[#78716c]">
              Enable EVM mode in your Polkadot wallet to manage RBAC settings
            </p>
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-[#e7e5e4]">
              <h3 className="text-lg font-bold text-[#1c1917] font-serif">Create Organization</h3>
              <p className="text-xs text-[#78716c] mt-1">
                This will deploy your organization on-chain
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-[#1c1917] mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter organization name..."
                className="w-full px-3 py-2 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                maxLength={64}
              />
              <p className="text-xs text-[#78716c] mt-1">
                Max 64 characters. You'll be automatically granted Admin role.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#e7e5e4] flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateOrgModal(false)
                  setOrganizationName('')
                }}
                disabled={creatingOrg}
                className="px-4 py-2 bg-white border border-[#e7e5e4] text-[#57534e] rounded-lg hover:bg-[#fafaf9] transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrganization}
                disabled={creatingOrg || !organizationName.trim()}
                className="px-4 py-2 bg-grey-900 text-white rounded-lg hover:bg-grey-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingOrg ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Admin Users Section
function AdminUsers() {
  const { connectedAccount } = useTypink()
  const { account: evmAccount, provider, signer } = useEVM()
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showSearchPeopleModal, setShowSearchPeopleModal] = useState(false)
  const [userRoles, setUserRoles] = useState<Record<string, string>>({})

  // Discovered users hook
  const { discoveredUsers, addUserBySubstrateAddress, linkEvmAddress } = useDiscoveredUsers()

  // RBAC contract hook
  const rbac = useRBACContract(provider, signer)

  // Get orgId from localStorage
  const orgId = localStorage.getItem('intran3t_org_id')

  // Track if we've already linked the EVM address
  const linkedRef = useRef<string | null>(null)

  // Track last fetched roles to prevent re-fetching
  const lastFetchedRef = useRef<string>('')

  // Link EVM address when user connects with EVM
  useEffect(() => {
    if (evmAccount && connectedAccount?.address) {
      const linkKey = `${connectedAccount.address}-${evmAccount}`

      // Only link if we haven't already linked this combination
      if (linkedRef.current !== linkKey) {
        const user = discoveredUsers.find(u => u.substrateAddress === connectedAccount.address)
        if (user && user.evmAddress !== evmAccount) {
          linkEvmAddress(connectedAccount.address, evmAccount)
          linkedRef.current = linkKey
        }
      }
    }
  }, [evmAccount, connectedAccount?.address, discoveredUsers, linkEvmAddress])

  // Fetch roles for users with EVM addresses
  useEffect(() => {
    if (!orgId || !rbac.contract) {
      console.log('⚠️ Cannot fetch roles:', { orgId, hasContract: !!rbac.contract })
      return
    }

    // Create a key from discovered users to track if we need to re-fetch
    const usersKey = discoveredUsers.map(u => u.evmAddress).filter(Boolean).sort().join(',')

    // Skip if we've already fetched for these exact users
    if (lastFetchedRef.current === usersKey) {
      return
    }

    const fetchRoles = async () => {
      console.log('🔍 Fetching roles for', discoveredUsers.length, 'discovered users')
      const roles: Record<string, string> = {}

      for (const user of discoveredUsers) {
        if (user.evmAddress) {
          try {
            console.log(`  Checking role for ${user.evmAddress}...`)
            const { role, hasRole } = await rbac.getUserRole(orgId, user.evmAddress)
            console.log(`  Result:`, { role, hasRole, roleName: hasRole ? roleToString(role) : 'none' })
            if (hasRole) {
              roles[user.evmAddress] = roleToString(role).toLowerCase()
            } else {
              roles[user.evmAddress] = 'viewer'
            }
          } catch (error) {
            console.error(`❌ Failed to get role for ${user.evmAddress}:`, error)
            roles[user.evmAddress] = 'viewer'
          }
        }
      }

      console.log('✅ Roles fetched:', roles)
      setUserRoles(roles)
      lastFetchedRef.current = usersKey
    }

    fetchRoles()
  }, [discoveredUsers, orgId, rbac.contract, rbac.getUserRole])

  // Build users list from discovered users
  const users = discoveredUsers.map(u => ({
    substrateAddress: u.substrateAddress,
    evmAddress: u.evmAddress,
    name: u.identity?.display || 'Unknown',
    email: u.identity?.email || '',
    role: u.evmAddress ? (userRoles[u.evmAddress] || 'viewer') : 'viewer',
    verified: u.identity?.verified || false,
    tags: u.evmAddress ? ['Discovered'] : ['Pending EVM'],
    joinedAt: new Date(u.discoveredAt).toISOString().split('T')[0]
  }))

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.substrateAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.evmAddress && user.evmAddress.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1c1917] font-serif">
            Team Members
          </h2>
          <p className="text-sm text-[#78716c] mt-1">
            {users.length} member{users.length !== 1 ? 's' : ''} in your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg transition-colors font-medium text-sm ${
              showFilters
                ? 'bg-accent-soft border-accent/20 text-accent'
                : 'bg-white border-[#e7e5e4] text-[#57534e] hover:bg-[#fafaf9]'
            }`}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          <button className="px-4 py-2 bg-grey-900 text-white rounded-lg hover:bg-grey-800 transition-colors font-medium text-sm">
            Add Member
          </button>
        </div>
      </div>

      {/* Filters (collapsible) */}
      {showFilters && (
        <div className="mb-6 p-4 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#78716c] mb-2">Role</label>
              <select className="w-full px-3 py-2 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-accent/20">
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#78716c] mb-2">Verification</label>
              <select className="w-full px-3 py-2 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-accent/20">
                <option value="">All Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#78716c] mb-2">Tags</label>
              <select className="w-full px-3 py-2 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-accent/20">
                <option value="">All Tags</option>
                <option value="admin">Admin</option>
                <option value="core-team">Core Team</option>
                <option value="engineering">Engineering</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar & Action Buttons */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#78716c]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, identity, or address..."
            className="w-full pl-12 pr-4 py-3 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
        </div>
        <button
          onClick={() => setShowSearchPeopleModal(true)}
          className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          title="Search People Chain by Substrate address"
        >
          <UserPlus className="w-4 h-4" />
          Search People Chain
        </button>
        <button
          onClick={() => setShowAddUserModal(true)}
          className="px-4 py-3 bg-grey-900 text-white rounded-xl hover:bg-grey-800 transition-colors flex items-center gap-2 whitespace-nowrap"
          title="Manually add user by EVM address"
        >
          <Plus className="w-4 h-4" />
          Add by EVM
        </button>
      </div>

      {/* Info Banner */}
      {discoveredUsers.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                {discoveredUsers.length} user{discoveredUsers.length !== 1 ? 's' : ''} discovered
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Users are auto-discovered when they connect to the dapp. Click "Edit" to issue on-chain credentials.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      {filteredUsers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e7e5e4]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#78716c] uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#78716c] uppercase tracking-wide">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#78716c] uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#78716c] uppercase tracking-wide">
                  Tags
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#78716c] uppercase tracking-wide">
                  Joined
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[#78716c] uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.substrateAddress}
                  className="border-b border-[#f5f5f4] hover:bg-[#fafaf9] transition-colors"
                >
                  {/* Name Column */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center">
                          <User className="w-5 h-5 text-accent" />
                        </div>
                        {user.verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1c1917]">{user.name}</p>
                        <p className="text-xs text-[#78716c] font-mono">
                          {user.substrateAddress.slice(0, 6)}...{user.substrateAddress.slice(-6)}
                        </p>
                        {user.evmAddress && (
                          <p className="text-xs text-[#a8a29e] font-mono">
                            EVM: {user.evmAddress.slice(0, 6)}...{user.evmAddress.slice(-4)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email Column */}
                  <td className="py-4 px-4">
                    <p className="text-sm text-[#57534e]">{user.email}</p>
                  </td>

                  {/* Role Column */}
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-accent-soft text-accent border border-accent/20'
                        : user.role === 'people/culture'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : user.role === 'member'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      {user.role === 'people/culture' ? 'People/Culture' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>

                  {/* Tags Column */}
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1">
                      {user.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                      <button className="inline-flex items-center px-2 py-0.5 bg-[#fafaf9] text-[#78716c] border border-[#e7e5e4] rounded text-xs font-medium hover:bg-white transition-colors">
                        + Add
                      </button>
                    </div>
                  </td>

                  {/* Joined Column */}
                  <td className="py-4 px-4">
                    <p className="text-sm text-[#78716c]">
                      {new Date(user.joinedAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </td>

                  {/* Actions Column */}
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          if (user.evmAddress) {
                            setSelectedUser(user.evmAddress)
                            setShowEditModal(true)
                          }
                        }}
                        disabled={!user.evmAddress}
                        className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                          user.evmAddress
                            ? 'bg-white border border-[#e7e5e4] text-[#57534e] hover:bg-[#fafaf9]'
                            : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        title={user.evmAddress ? 'Issue on-chain credential' : 'Waiting for user to connect with EVM wallet'}
                      >
                        {user.evmAddress ? 'Issue Credential' : 'Pending EVM'}
                      </button>
                      <button className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-[#78716c]">
          <Users className="w-12 h-12 text-[#a8a29e] mx-auto mb-3" />
          <p className="text-sm">No team members found</p>
          <p className="text-xs mt-2 text-[#a8a29e]">
            {searchQuery ? 'Try adjusting your search' : 'Add team members to get started'}
          </p>
        </div>
      )}

      {/* Add User Modal (Legacy - for manual EVM entry) */}
      {showAddUserModal && (
        <AddUserByAddressModal
          onAdd={(address, name) => {
            console.log('Manual user added:', address, name)
            setShowAddUserModal(false)
          }}
          onClose={() => setShowAddUserModal(false)}
        />
      )}

      {/* Search People Chain Modal */}
      {showSearchPeopleModal && (
        <SearchPeopleChainModal
          onAdd={async (substrateAddress) => {
            const success = await addUserBySubstrateAddress(substrateAddress)
            if (success) {
              setShowSearchPeopleModal(false)
            }
            return success
          }}
          onClose={() => setShowSearchPeopleModal(false)}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          userAddress={selectedUser}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}

// Edit User Modal Component
function EditUserModal({ userAddress, onClose }: { userAddress: string; onClose: () => void }) {
  const { provider, signer, connected } = useEVM()
  const rbac = useRBACContract(provider, signer)
  const [role, setRole] = useState('member')
  const [tags, setTags] = useState(['Engineering', 'Core Team'])
  const [newTag, setNewTag] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [expirationDays, setExpirationDays] = useState(0)

  // Get orgId from localStorage
  const orgId = localStorage.getItem('intran3t_org_id')

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSaveChanges = async () => {
    if (!connected || !orgId) {
      alert('Please connect MetaMask and create an organization first')
      return
    }

    try {
      setIssuing(true)

      // Convert role string to Role enum
      const roleEnum = stringToRole(role)

      // Calculate expiration timestamp (0 for no expiration)
      const expiresAt = expirationDays > 0
        ? Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60)
        : 0

      // Issue credential on-chain
      await rbac.issueCredential(orgId, userAddress, roleEnum, expiresAt)

      alert('Credential issued successfully!')
      onClose()
    } catch (error) {
      console.error('Failed to issue credential:', error)
      alert('Failed to issue credential. Check console for details.')
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e7e5e4]">
          <h3 className="text-lg font-bold text-[#1c1917] font-serif">Issue Credential</h3>
          <p className="text-xs text-[#78716c] font-mono mt-1">
            {userAddress.slice(0, 8)}...{userAddress.slice(-8)}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Connection Warning */}
          {!connected && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700">
                Enable EVM mode in your Polkadot wallet to issue on-chain credentials
              </p>
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              <option value="admin">Admin</option>
              <option value="peopleculture">People/Culture</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <p className="text-xs text-[#78716c] mt-1">
              This will be stored on-chain as a Verifiable Credential
            </p>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              Expiration (Optional)
            </label>
            <select
              value={expirationDays}
              onChange={(e) => setExpirationDays(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            >
              <option value={0}>No expiration</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
            <p className="text-xs text-[#78716c] mt-1">
              Credential will automatically expire after this period
            </p>
          </div>

          {/* Tags Management */}
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-blue-900 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add new tag..."
                className="flex-1 px-3 py-2 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-grey-900 text-white rounded-lg hover:bg-grey-800 transition-colors text-sm font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Custom Fields (Future) */}
          <div className="p-4 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl">
            <p className="text-xs text-[#78716c] text-center">
              Custom fields coming soon - integrate with your data schema
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e7e5e4] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={issuing}
            className="px-4 py-2 bg-white border border-[#e7e5e4] text-[#57534e] rounded-lg hover:bg-[#fafaf9] transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={issuing || !connected || !orgId}
            className="px-4 py-2 bg-grey-900 text-white rounded-lg hover:bg-grey-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {issuing ? 'Issuing...' : 'Issue Credential'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Admin Polls Section
function AdminPolls() {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1c1917] font-serif">
            Poll Management
          </h2>
          <p className="text-sm text-[#78716c] mt-1">
            Create and manage organization polls
          </p>
        </div>
        <button className="px-4 py-2 bg-grey-900 text-white rounded-lg hover:bg-grey-800 transition-colors font-medium text-sm">
          Create Poll
        </button>
      </div>

      {/* Empty State */}
      <div className="p-8 text-center text-[#78716c]">
        <Vote className="w-12 h-12 text-[#a8a29e] mx-auto mb-3" />
        <p className="text-sm">No polls created yet</p>
        <p className="text-xs mt-2 text-[#a8a29e]">
          Create your first poll to gather team feedback
        </p>
      </div>
    </div>
  )
}

// Admin Forms Section
function AdminForms() {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1c1917] font-serif">
            Form Management
          </h2>
          <p className="text-sm text-[#78716c] mt-1">
            View and manage all forms and submissions
          </p>
        </div>
        <button className="px-4 py-2 bg-grey-900 text-white rounded-lg hover:bg-grey-800 transition-colors font-medium text-sm">
          Create Form
        </button>
      </div>

      {/* Empty State */}
      <div className="p-8 text-center text-[#78716c]">
        <FileText className="w-12 h-12 text-[#a8a29e] mx-auto mb-3" />
        <p className="text-sm">No forms created yet</p>
        <p className="text-xs mt-2 text-[#a8a29e]">
          Create forms to collect information from team members
        </p>
      </div>
    </div>
  )
}

// Search People Chain Modal Component
function SearchPeopleChainModal({
  onAdd,
  onClose
}: {
  onAdd: (substrateAddress: string) => Promise<boolean>
  onClose: () => void
}) {
  const [address, setAddress] = useState('')
  const [searching, setSearching] = useState(false)
  const [identity, setIdentity] = useState<any>(null)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!address.trim()) {
      setError('Please enter a Substrate address')
      return
    }

    // Validate Substrate address format (should NOT be 0x format)
    if (address.startsWith('0x')) {
      setError('Please enter a Substrate address, not an EVM address (0x...)')
      return
    }

    // Basic validation - Substrate addresses are typically 47-48 characters
    if (address.length < 40) {
      setError('Invalid Substrate address format')
      return
    }

    try {
      setSearching(true)
      setError('')
      setSearched(false)

      // Import the identity query function
      const { queryOnChainIdentity } = await import('../modules/profile/identity-helpers')
      const result = await queryOnChainIdentity(address)

      setSearched(true)

      if (result.success && result.identity) {
        setIdentity(result.identity)
        setError('')
      } else {
        setIdentity(null)
        setError('No identity found for this address on People Chain')
      }
    } catch (err) {
      console.error('Search failed:', err)
      setError('Failed to search People Chain. Check console for details.')
      setIdentity(null)
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = async () => {
    setSearching(true)
    setError('')
    try {
      console.log('🔍 Adding user via People Chain:', address)
      const success = await onAdd(address)
      console.log('✅ Add user result:', success)
      if (!success) {
        setError('User already exists in discovered users')
      }
    } catch (err) {
      console.error('❌ Failed to add user:', err)
      setError(`Failed to add user: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e7e5e4]">
          <h3 className="text-lg font-bold text-[#1c1917] font-serif">Search People Chain</h3>
          <p className="text-xs text-[#78716c] mt-1">
            Search for users with on-chain identities on Polkadot People Chain
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {/* Substrate Address Input */}
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              Substrate Address
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setError('')
                  setIdentity(null)
                  setSearched(false)
                }}
                placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                className="flex-1 px-3 py-2 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !address.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
            <p className="text-xs text-[#78716c] mt-1">
              Enter a Polkadot Substrate address (not 0x... format)
            </p>
          </div>

          {/* Identity Results */}
          {searched && identity && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 mb-2">
                    Identity Found
                  </p>
                  <div className="space-y-1 text-xs">
                    <p className="text-green-800">
                      <strong>Display:</strong> {identity.display || 'N/A'}
                    </p>
                    {identity.legal && (
                      <p className="text-green-800">
                        <strong>Legal:</strong> {identity.legal}
                      </p>
                    )}
                    {identity.email && (
                      <p className="text-green-800">
                        <strong>Email:</strong> {identity.email}
                      </p>
                    )}
                    {identity.web && (
                      <p className="text-green-800">
                        <strong>Web:</strong> {identity.web}
                      </p>
                    )}
                    {identity.twitter && (
                      <p className="text-green-800">
                        <strong>Twitter:</strong> {identity.twitter}
                      </p>
                    )}
                    <p className="text-green-800">
                      <strong>Verified:</strong> {identity.verified ? '✅ Yes' : '❌ No'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              This searches the Polkadot People Chain for on-chain identity data. If found, the user will be added to your discovered users list. They'll need to connect with their EVM wallet to receive on-chain credentials.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e7e5e4] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={searching}
            className="px-4 py-2 text-[#78716c] hover:text-[#1c1917] transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={searching || !identity || !searched}
            className="px-4 py-2 bg-grey-900 text-white rounded-lg hover:bg-grey-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? 'Adding...' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Add User by Address Modal Component
function AddUserByAddressModal({ onAdd, onClose }: { onAdd: (address: string, name: string) => void; onClose: () => void }) {
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    // Validate EVM address
    if (!address.startsWith('0x') || address.length !== 42) {
      setError('Invalid EVM address. Must start with 0x and be 42 characters long.')
      return
    }

    if (!name.trim()) {
      setError('Please enter a name or label for this user.')
      return
    }

    onAdd(address, name)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e7e5e4]">
          <h3 className="text-lg font-bold text-[#1c1917] font-serif">Add User by Address</h3>
          <p className="text-xs text-[#78716c] font-mono mt-1">
            Add an EVM address to issue credentials
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {/* EVM Address */}
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              EVM Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                setError('')
              }}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
            <p className="text-xs text-[#78716c] mt-1">
              Enter the EVM address (0x... format, 42 characters)
            </p>
          </div>

          {/* Name/Label */}
          <div>
            <label className="block text-sm font-medium text-[#1c1917] mb-2">
              Name/Label *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="e.g., AphexTwin94"
              className="w-full px-3 py-2 bg-white border border-[#e7e5e4] rounded-lg text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
            <p className="text-xs text-[#78716c] mt-1">
              A friendly name to identify this user
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              After adding this user, click "Edit" to issue them an on-chain credential with a specific role (Admin, People/Culture, Member, or Viewer).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e7e5e4] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#78716c] hover:text-[#1c1917] transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-grey-900 text-white rounded-lg hover:bg-grey-800 transition-colors text-sm font-medium"
          >
            Add User
          </button>
        </div>
      </div>
    </div>
  )
}
