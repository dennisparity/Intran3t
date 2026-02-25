import React, { useState, useEffect } from 'react'
import { Wallet, ChevronRight, Check, Download, User } from 'lucide-react'
import { Button } from './ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/Dialog'
import Identicon from '@polkadot/react-identicon'
import { useEVM } from '../providers/EVMProvider'
import { useWallet } from '../providers/WalletProvider'

type View = 'wallets' | 'accounts'

interface WalletInfo {
  id: string
  name: string
  logo?: string
  installed: boolean
  installUrl: string
}

// Known wallets with their metadata
const KNOWN_WALLETS: WalletInfo[] = [
  {
    id: 'polkadot-js',
    name: 'Polkadot.js',
    installed: false,
    installUrl: 'https://polkadot.js.org/extension/'
  },
  {
    id: 'talisman',
    name: 'Talisman',
    installed: false,
    installUrl: 'https://talisman.xyz/'
  },
  {
    id: 'subwallet-js',
    name: 'SubWallet',
    installed: false,
    installUrl: 'https://subwallet.app/'
  },
  {
    id: 'nova',
    name: 'Nova Wallet',
    installed: false,
    installUrl: 'https://novawallet.io/'
  }
]

export default function ConnectWallet() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('wallets')
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([])

  const {
    isConnected,
    accounts,
    selectedAccount,
    connect,
    disconnect,
    selectAccount,
    inHost
  } = useWallet()

  const evm = useEVM()
  const isMetaMaskInstalled = !!(window as any).ethereum?.isMetaMask

  // Detect installed wallets on mount
  useEffect(() => {
    const detectWallets = () => {
      if (inHost) {
        // In host: show Spektr only
        setAvailableWallets([{
          id: 'spektr',
          name: 'Spektr (Host)',
          installed: true,
          installUrl: ''
        }])
        return
      }

      // Check window.injectedWeb3 for installed extensions
      const injected = (window as any).injectedWeb3 || {}
      const detected = KNOWN_WALLETS.map(wallet => ({
        ...wallet,
        installed: !!injected[wallet.id],
        logo: injected[wallet.id]?.logo
      }))

      // Sort: installed first
      detected.sort((a, b) => {
        if (a.installed && !b.installed) return -1
        if (!a.installed && b.installed) return 1
        return 0
      })

      setAvailableWallets(detected)
    }

    detectWallets()
  }, [inHost])

  const handleConnectWallet = async () => {
    try {
      console.log('🔌 Attempting to connect wallet...')

      // Product SDK handles wallet selection automatically
      await connect()
      console.log('✅ Wallet connected successfully')

      // Note: accounts state will be updated by WalletProvider
      // The useEffect below will handle showing the accounts view
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      alert(
        `Failed to connect wallet:\n\n${errorMessage}\n\n` +
        `Please ensure:\n` +
        `1. Your wallet extension is installed and enabled\n` +
        `2. You have authorized this site in your wallet settings\n` +
        `3. Try refreshing the page and connecting again`
      )
    }
  }

  // Show accounts view when connected with multiple accounts
  useEffect(() => {
    if (isConnected && accounts.length > 1 && view === 'wallets') {
      setView('accounts')
    } else if (isConnected && accounts.length === 1 && open) {
      // Auto-close modal if only one account
      setOpen(false)
    }
  }, [isConnected, accounts.length, view, open])

  const handleSelectAccount = (account: any) => {
    selectAccount(account.address)
    setOpen(false)
    setView('wallets')
  }

  const handleDisconnect = () => {
    disconnect()
    setOpen(false)
    setView('wallets')
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      // Reset to wallets view when closing
      setTimeout(() => setView('wallets'), 200)
    } else {
      // If opening and wallet is already connected with multiple accounts, go directly to accounts view
      if (selectedAccount && accounts.length > 1) {
        setView('accounts')
      }
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="lg"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          {selectedAccount ? (
            <div className="flex items-center gap-2">
              <Identicon
                value={selectedAccount.address}
                size={24}
                theme="polkadot"
              />
              <span>{selectedAccount.name || truncateAddress(selectedAccount.address)}</span>
            </div>
          ) : evm.connected && evm.account ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#fff3e0] flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-[#e65100]" />
              </div>
              <span>{truncateAddress(evm.account)}</span>
            </div>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </>
          )}
        </Button>
        {selectedAccount && accounts.length > 1 && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setOpen(true)
              setView('accounts')
            }}
            title="Switch Account"
          >
            <User className="w-5 h-5" />
          </Button>
        )}
      </div>

      <DialogContent className="sm:max-w-[500px]">
        {view === 'wallets' ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {isConnected ? 'Connected' : 'Connect Wallet'}
              </DialogTitle>
              <DialogDescription>
                {isConnected
                  ? 'Manage your wallet connections'
                  : 'Connect your wallet to access Polkadot features'}
              </DialogDescription>
              {selectedAccount && accounts.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('accounts')}
                  className="mt-2 gap-2"
                >
                  <User className="w-4 h-4" />
                  Switch Account ({accounts.length} available)
                </Button>
              )}
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {/* MetaMask */}
              <div className="group relative flex items-center justify-between p-4 rounded-xl border border-[#e7e5e4] bg-white hover:bg-[#fafaf9] hover:border-[#d6d3d1] transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#fff3e0] flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-[#e65100]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1c1917]">MetaMask</span>
                      {evm.connected && evm.account && isMetaMaskInstalled && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Connected
                        </div>
                      )}
                    </div>
                    {evm.connected && evm.account && isMetaMaskInstalled && (
                      <p className="text-xs text-[#78716c] mt-0.5 font-mono">
                        {truncateAddress(evm.account)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isMetaMaskInstalled ? (
                    evm.connected ? (
                      <Button variant="outline" size="sm" onClick={evm.disconnect}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button variant="default" size="sm" onClick={evm.connect} className="gap-1">
                        Connect
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('https://metamask.io/', '_blank')}
                      className="gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Install
                    </Button>
                  )}
                </div>
              </div>

              {/* Polkadot Wallets */}
              <div className="group relative flex items-center justify-between p-4 rounded-xl border border-[#e7e5e4] bg-white hover:bg-[#fafaf9] hover:border-[#d6d3d1] transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#f5f5f4] flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-[#e6007a]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1c1917]">
                        {inHost ? 'Spektr (Host)' : 'Polkadot Wallet'}
                      </span>
                      {isConnected && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Connected
                        </div>
                      )}
                    </div>
                    {isConnected && accounts.length > 0 && (
                      <p className="text-xs text-[#78716c] mt-0.5">
                        {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {!isConnected && !inHost && (
                      <p className="text-xs text-[#78716c] mt-0.5">
                        {availableWallets.filter(w => w.installed).length > 0
                          ? `${availableWallets.filter(w => w.installed).map(w => w.name).join(', ')} detected`
                          : 'Talisman, SubWallet, Polkadot.js'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('accounts')}
                        className="gap-1"
                      >
                        View Accounts
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : availableWallets.some(w => w.installed) || inHost ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleConnectWallet}
                      className="gap-1"
                    >
                      Connect
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <div className="text-xs text-[#78716c]">
                      <a
                        href="https://talisman.xyz/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#e6007a] hover:underline"
                      >
                        Install Wallet
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Wallet Installation Guide (if no wallets detected) */}
              {!isConnected && !inHost && !availableWallets.some(w => w.installed) && (
                <div className="p-4 rounded-xl border border-[#e7e5e4] bg-[#fafaf9]">
                  <p className="text-sm text-[#78716c] mb-2">No Polkadot wallet detected. Install one:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableWallets.map(wallet => (
                      <Button
                        key={wallet.id}
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(wallet.installUrl, '_blank')}
                        className="gap-1"
                      >
                        <Download className="w-4 h-4" />
                        {wallet.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              </div>

            {(selectedAccount || evm.connected) && (
              <div className="mt-6 pt-6 border-t border-[#e7e5e4]">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { handleDisconnect(); evm.disconnect(); }}
                  className="w-full"
                >
                  Disconnect All
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('wallets')}
                className="w-fit mb-2"
              >
                ← Back to Wallets
              </Button>
              <DialogTitle>Select Account</DialogTitle>
              <DialogDescription>
                Choose an account to use with this application
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-[#78716c]">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No accounts found</p>
                  <p className="text-sm mt-1">
                    Make sure you have created accounts in your wallet extension
                  </p>
                </div>
              ) : (
                accounts.map((account) => {
                  const isSelected = selectedAccount?.address === account.address

                  return (
                    <button
                      key={account.address}
                      onClick={() => handleSelectAccount(account)}
                      className={`
                        w-full group relative flex items-center justify-between p-4 rounded-xl border
                        transition-all duration-300 text-left
                        ${
                          isSelected
                            ? 'border-[#1c1917] bg-[#f5f5f4]'
                            : 'border-[#e7e5e4] bg-white hover:bg-[#fafaf9] hover:border-[#d6d3d1]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Identicon
                          value={account.address}
                          size={40}
                          theme="polkadot"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#1c1917] flex items-center gap-2">
                            {account.name || 'Unnamed Account'}
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#1c1917]" />
                            )}
                          </div>
                          <p className="text-xs text-[#78716c] mt-0.5 font-mono">
                            {truncateAddress(account.address)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
