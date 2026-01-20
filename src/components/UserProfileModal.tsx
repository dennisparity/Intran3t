import { X, CheckCircle2, Mail, Globe, Twitter, MessageCircle, Github, MapPin, Tag } from 'lucide-react'
import Identicon from '@polkadot/react-identicon'
import { useIdentity } from '../modules/profile/use-identity'
import { getTeamMember } from '../config/team-members'

interface UserProfileModalProps {
  address: string
  onClose: () => void
}

export function UserProfileModal({ address, onClose }: UserProfileModalProps) {
  const { data: identity, isLoading } = useIdentity(address)
  const teamMember = getTeamMember(address)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e7e5e4] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-[#1c1917] font-serif">Team Member Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#fafaf9] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#78716c]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#ff2867] border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Identicon
                    value={address}
                    size={80}
                    theme="polkadot"
                    className="rounded-full"
                  />
                  {identity?.verified && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Name and Verification */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold text-[#1c1917] font-serif">
                      {identity?.display || 'Unknown User'}
                    </h3>
                    {identity?.verified && (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Role Badge */}
                  {teamMember?.role && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-[rgba(255,40,103,0.08)] border border-[#ff2867]/20 text-[#ff2867] text-xs font-medium rounded-full mb-2">
                      <span className="capitalize">{teamMember.role}</span>
                    </div>
                  )}

                  {/* Verification Status */}
                  {identity?.verified ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified on Polkadot People Chain</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[#a8a29e] mb-2">
                      <span>No on-chain identity verification</span>
                    </div>
                  )}

                  {/* Address */}
                  <div className="flex items-center gap-2 text-sm text-[#78716c] font-mono bg-[#fafaf9] px-3 py-2 rounded-lg border border-[#e7e5e4]">
                    <span className="truncate">{address}</span>
                  </div>
                </div>
              </div>

              {/* Identity Details */}
              {identity && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[#1c1917] uppercase tracking-wide">
                    Identity Information
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {/* Email */}
                    {identity.email && (
                      <div className="flex items-center gap-3 p-3 bg-[#fafaf9] rounded-lg border border-[#e7e5e4]">
                        <Mail className="w-5 h-5 text-[#78716c] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#78716c] mb-0.5">Email</p>
                          <p className="text-sm text-[#1c1917] font-medium truncate">{identity.email}</p>
                        </div>
                      </div>
                    )}

                    {/* Website */}
                    {identity.web && (
                      <div className="flex items-center gap-3 p-3 bg-[#fafaf9] rounded-lg border border-[#e7e5e4]">
                        <Globe className="w-5 h-5 text-[#78716c] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#78716c] mb-0.5">Website</p>
                          <a
                            href={identity.web.startsWith('http') ? identity.web : `https://${identity.web}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#ff2867] font-medium hover:underline truncate block"
                          >
                            {identity.web}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Twitter */}
                    {identity.twitter && (
                      <div className="flex items-center gap-3 p-3 bg-[#fafaf9] rounded-lg border border-[#e7e5e4]">
                        <Twitter className="w-5 h-5 text-[#78716c] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#78716c] mb-0.5">Twitter</p>
                          <a
                            href={`https://twitter.com/${identity.twitter.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#ff2867] font-medium hover:underline truncate block"
                          >
                            @{identity.twitter.replace('@', '')}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* GitHub */}
                    {identity.github && (
                      <div className="flex items-center gap-3 p-3 bg-[#fafaf9] rounded-lg border border-[#e7e5e4]">
                        <Github className="w-5 h-5 text-[#78716c] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#78716c] mb-0.5">GitHub</p>
                          <a
                            href={`https://github.com/${identity.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#ff2867] font-medium hover:underline truncate block"
                          >
                            {identity.github}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Discord */}
                    {identity.discord && (
                      <div className="flex items-center gap-3 p-3 bg-[#fafaf9] rounded-lg border border-[#e7e5e4]">
                        <MessageCircle className="w-5 h-5 text-[#78716c] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#78716c] mb-0.5">Discord</p>
                          <p className="text-sm text-[#1c1917] font-medium font-mono truncate">{identity.discord}</p>
                        </div>
                      </div>
                    )}

                    {/* Matrix */}
                    {identity.matrix && (
                      <div className="flex items-center gap-3 p-3 bg-[#fafaf9] rounded-lg border border-[#e7e5e4]">
                        <MessageCircle className="w-5 h-5 text-[#78716c] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#78716c] mb-0.5">Matrix</p>
                          <p className="text-sm text-[#1c1917] font-medium font-mono truncate">{identity.matrix}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No Identity Message */}
              {!identity && (
                <div className="text-center py-8 text-[#78716c]">
                  <p className="text-sm">This user has not set up an on-chain identity yet.</p>
                  <p className="text-xs mt-2 text-[#a8a29e]">
                    They can create one on the Polkadot People Chain.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#fafaf9] border-t border-[#e7e5e4] px-6 py-4 flex items-center justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#1c1917] text-white rounded-lg hover:bg-[#292524] transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
