import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import PolkadotLogo from '../components/PolkadotLogo'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#e7e5e4]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-6">
          <div className="flex items-center gap-3">
            <PolkadotLogo className="w-8 h-8 text-[#1c1917]" />
            <div>
              <div className="font-serif text-lg text-[#1c1917]">
                Intran<span className="text-[#a8a29e]">3</span>t
              </div>
              <div className="text-xs text-[#78716c] flex items-center gap-1">
                from <PolkadotLogo className="w-3 h-3 text-[#1c1917]" /> Polkadot
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 md:px-12 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-serif text-5xl md:text-6xl text-[#1c1917] mb-6 leading-tight"
          >
            Your workplace,
            <br />
            on Polkadot.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-[#78716c] mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Integrate key workplace functions as plugins under a single interface. Forms, governance, identity — all on Polkadot.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#1c1917] text-white rounded-xl font-semibold hover:bg-[#292524] transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              className="px-8 py-4 rounded-xl font-medium border border-[#d6d3d1] text-[#1c1917] hover:bg-[#fafaf9] transition-all duration-200"
            >
              Learn More
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-32 flex flex-col items-center text-[#a8a29e]"
          >
            <div className="text-sm uppercase tracking-wider mb-2">Scroll</div>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-[#e7e5e4] bg-[#fafaf9] py-24">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-3xl text-[#1c1917] mb-16 text-center"
          >
            Why Intran3t?
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: "Plugin Architecture",
                description: "Extend your workspace with modular plugins for forms, governance, and more. Add what you need, skip what you don't.",
              },
              {
                title: "Identity-First",
                description: "Verified identities from People Chain. Know who's who across your organization — no passwords, no guessing.",
              },
              {
                title: "On-Chain Storage",
                description: "Forms, documents, and data stored securely using Polkadot's decentralized infrastructure. Durable and transparent.",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-12 h-12 bg-white rounded-xl mb-6 flex items-center justify-center border border-[#e7e5e4]">
                  <PolkadotLogo className="w-7 h-7 text-[#1c1917]" />
                </div>
                <h3 className="font-serif text-2xl text-[#1c1917] mb-4">
                  {feature.title}
                </h3>
                <p className="text-[#57534e] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-[#e7e5e4] py-24">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-3xl text-[#1c1917] mb-6"
          >
            Ready to get started?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#78716c] mb-12 leading-relaxed"
          >
            Join teams running their operations on Polkadot.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#1c1917] text-white rounded-xl font-semibold hover:bg-[#292524] transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e7e5e4] bg-[#fafaf9] py-12">
        <div className="max-w-6xl mx-auto px-6 md:px-12 text-center text-[#57534e]">
          <p>© 2026 Intran3t. Built on Polkadot.</p>
        </div>
      </footer>
    </div>
  )
}
