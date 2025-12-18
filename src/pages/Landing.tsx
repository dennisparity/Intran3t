import { useTypink } from 'typink'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ConnectWallet from '../components/ConnectWallet'

export default function Landing() {
  const { connectedAccount } = useTypink()
  const navigate = useNavigate()

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (connectedAccount) {
      navigate('/dashboard')
    }
  }, [connectedAccount, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#fafaf9]">
      <div className="max-w-2xl w-full">
        {/* Logo/Brand Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-polkadot mb-6">
            <span className="text-4xl font-bold text-white">I3</span>
          </div>

          <h1 className="text-6xl font-bold text-[#1c1917] mb-4 font-serif">
            Intran<span className="text-gradient">3</span>t
          </h1>

          <p className="text-xl text-[#78716c] max-w-md mx-auto">
            Connect your Polkadot wallet to get started
          </p>
        </div>

        {/* Connect Wallet Section */}
        <div className="flex justify-center">
          <ConnectWallet />
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-400">
            Powered by Polkadot light client
          </p>
        </div>
      </div>
    </div>
  )
}
