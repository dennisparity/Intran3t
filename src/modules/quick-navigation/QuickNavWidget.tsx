import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Grid3x3, Building, Vote, BookOpen, Code } from 'lucide-react'
import type { NavigationSection, NavigationLink, QuickNavConfig } from './types'

const iconMap: Record<string, any> = {
  Grid3x3,
  Building,
  Vote,
  ExternalLink,
  BookOpen,
  Code
}

function NavigationLinkItem({ link, showIcons }: { link: NavigationLink; showIcons: boolean }) {
  const Icon = link.icon && iconMap[link.icon] ? iconMap[link.icon] : null
  const isExternal = link.external

  const handleClick = (e: React.MouseEvent) => {
    if (!isExternal && link.url.startsWith('/dashboard#')) {
      e.preventDefault()
      const elementId = link.url.split('#')[1]
      const element = document.getElementById(elementId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <a
      href={link.url}
      onClick={handleClick}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#fafaf9] transition-all duration-200"
      title={link.description}
    >
      {showIcons && Icon && (
        <Icon className="w-4 h-4 text-[#78716c] group-hover:text-[#ff2867] transition-colors" />
      )}
      <span className="text-sm text-[#1c1917] group-hover:text-[#ff2867] transition-colors flex-1">
        {link.label}
      </span>
      {isExternal && (
        <ExternalLink className="w-3 h-3 text-[#a8a29e] group-hover:text-[#ff2867] transition-colors" />
      )}
    </a>
  )
}

function NavigationSectionComponent({
  section,
  showIcons
}: {
  section: NavigationSection
  showIcons: boolean
}) {
  const [collapsed, setCollapsed] = useState(section.collapsed ?? false)

  return (
    <div className="mb-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-[#78716c] uppercase tracking-wide hover:text-[#1c1917] transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        {section.title}
      </button>
      {!collapsed && (
        <div className="mt-1 space-y-0.5">
          {section.links.map((link) => (
            <NavigationLinkItem
              key={link.id}
              link={link}
              showIcons={showIcons}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function QuickNavWidget({ config }: { config: QuickNavConfig }) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {config.title && (
        <h3 className="text-base font-bold text-[#1c1917] mb-3 font-serif px-3">
          {config.title}
        </h3>
      )}
      <div className="space-y-2">
        {config.sections.map((section) => (
          <NavigationSectionComponent
            key={section.id}
            section={section}
            showIcons={config.showIcons ?? true}
          />
        ))}
      </div>
    </div>
  )
}
