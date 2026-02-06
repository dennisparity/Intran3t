import React, { useState } from 'react'
import { useTypink } from 'typink'
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

type View = 'wallets' | 'accounts'

export default function ConnectWallet() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('wallets')
  
  const {
    wallets,
    connectedWallets,
    accounts,
    connectedAccount,
    connectWallet,
    disconnect,
    setConnectedAccount,
  } = useTypink()

  const evm = useEVM()
  const isMetaMaskInstalled = !!(window as any).ethereum?.isMetaMask

  const handleConnectWallet = async (walletId: string) => {
    try {
      console.log('Attempting to connect wallet:', walletId)

      // Connect with Typink - this will trigger only the selected wallet extension
      await connectWallet(walletId)
      console.log('Wallet connected successfully:', walletId)

      setView('accounts')
    } catch (error) {
      console.error('Failed to connect wallet:', error)

      // Provide helpful error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const walletName = walletId === 'polkadot-js' ? 'Polkadot.js' :
                        walletId === 'subwallet-js' ? 'SubWallet' :
                        walletId.charAt(0).toUpperCase() + walletId.slice(1)

      alert(
        `Failed to connect ${walletName}:\n\n${errorMessage}\n\n` +
        `If the wallet didn't open, please:\n` +
        `1. Open the ${walletName} extension\n` +
        `2. Check "Manage Website Access" settings\n` +
        `3. Authorize this site\n` +
        `4. Try connecting again`
      )
    }
  }

  const handleSelectAccount = (account: any) => {
    setConnectedAccount(account)
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
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        variant="default"
        size="lg"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        {connectedAccount ? (
          <div className="flex items-center gap-2">
            <Identicon
              value={connectedAccount.address}
              size={24}
              theme="polkadot"
            />
            <span>{connectedAccount.name || truncateAddress(connectedAccount.address)}</span>
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

      <DialogContent className="sm:max-w-[500px]">
        {view === 'wallets' ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {connectedWallets.length > 0 ? 'Connected Wallets' : 'Connect Wallet'}
              </DialogTitle>
              <DialogDescription>
                {connectedWallets.length > 0
                  ? 'Select a wallet to view accounts or connect a new one'
                  : 'Choose a wallet to connect to your Polkadot account'}
              </DialogDescription>
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

              {/* Polkadot Wallets — Sort: installed first, then not installed */}
              {[...wallets]
                .sort((a, b) => {
                  if (a.installed && !b.installed) return -1
                  if (!a.installed && b.installed) return 1
                  return 0
                })
                .map((wallet) => {
                  const isConnected = connectedWallets.some((w) => w.id === wallet.id)
                  const accountCount = accounts.filter((a) => a.source === wallet.id).length

                  return (
                    <div
                      key={wallet.id}
                      className="group relative flex items-center justify-between p-4 rounded-xl border border-[#e7e5e4] bg-white hover:bg-[#fafaf9] hover:border-[#d6d3d1] transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        {wallet.logo ? (
                          <img
                            src={wallet.logo}
                            alt={wallet.name}
                            className="w-10 h-10 rounded-lg"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#f5f5f4] flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-[#78716c]" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1c1917]">{wallet.name}</span>
                            {isConnected && (
                              <div className="flex items-center gap-1 text-xs text-green-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Connected
                              </div>
                            )}
                          </div>
                          {isConnected && accountCount > 0 && (
                            <p className="text-xs text-[#78716c] mt-0.5">
                              {accountCount} account{accountCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {wallet.installed ? (
                          isConnected ? (
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
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleConnectWallet(wallet.id)}
                              className="gap-1"
                            >
                              Connect
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          )
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Typink wallets have different install URLs based on wallet type
                              const installUrls: Record<string, string> = {
                                'polkadot-js': 'https://polkadot.js.org/extension/',
                                'talisman': 'https://talisman.xyz/',
                                'subwallet-js': 'https://subwallet.app/',
                                'nova': 'https://novawallet.io/',
                              }
                              const url = installUrls[wallet.id]
                              if (url) window.open(url, '_blank')
                            }}
                            className="gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Install
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

            {(connectedAccount || evm.connected) && (
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
                  const isSelected = connectedAccount?.address === account.address

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
                          <p className="text-xs text-[#a8a29e] mt-0.5">
                            {account.source}
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
