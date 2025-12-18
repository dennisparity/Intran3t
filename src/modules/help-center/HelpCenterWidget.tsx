import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Rocket,
  Building,
  Vote,
  Wallet,
  LayoutDashboard,
  Calendar,
  Users,
  CheckSquare,
  MessageSquare,
  BookOpen,
  Code,
  HelpCircle,
  X
} from 'lucide-react'
import type { HelpCategory, HelpArticle, HelpCenterConfig } from './types'

const iconMap: Record<string, any> = {
  Rocket,
  Building,
  Vote,
  Wallet,
  LayoutDashboard,
  Calendar,
  Users,
  CheckSquare,
  MessageSquare,
  BookOpen,
  Code,
  HelpCircle,
  ExternalLink
}

function HelpArticleItem({
  article,
  onSelect
}: {
  article: HelpArticle
  onSelect: (article: HelpArticle) => void
}) {
  const Icon = article.icon && iconMap[article.icon] ? iconMap[article.icon] : null
  const isExternal = article.external && article.url

  if (isExternal && article.url) {
    return (
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-[#fafaf9] transition-all duration-200"
      >
        {Icon && (
          <Icon className="w-4 h-4 text-[#78716c] group-hover:text-[#ff2867] transition-colors flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[#1c1917] group-hover:text-[#ff2867] transition-colors">
            {article.title}
          </div>
          {article.description && (
            <div className="text-xs text-[#78716c] mt-0.5 line-clamp-1">
              {article.description}
            </div>
          )}
        </div>
        <ExternalLink className="w-3 h-3 text-[#a8a29e] group-hover:text-[#ff2867] transition-colors flex-shrink-0 mt-1" />
      </a>
    )
  }

  return (
    <button
      onClick={() => onSelect(article)}
      className="group flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-[#fafaf9] transition-all duration-200 w-full text-left"
    >
      {Icon && (
        <Icon className="w-4 h-4 text-[#78716c] group-hover:text-[#ff2867] transition-colors flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[#1c1917] group-hover:text-[#ff2867] transition-colors">
          {article.title}
        </div>
        {article.description && (
          <div className="text-xs text-[#78716c] mt-0.5 line-clamp-1">
            {article.description}
          </div>
        )}
      </div>
    </button>
  )
}

function HelpCategorySection({
  category,
  onSelectArticle
}: {
  category: HelpCategory
  onSelectArticle: (article: HelpArticle) => void
}) {
  const [collapsed, setCollapsed] = useState(category.collapsed ?? false)
  const Icon = category.icon && iconMap[category.icon] ? iconMap[category.icon] : null

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
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {category.title}
      </button>
      {!collapsed && (
        <div className="mt-1 space-y-0.5">
          {category.articles.map((article) => (
            <HelpArticleItem
              key={article.id}
              article={article}
              onSelect={onSelectArticle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ArticleModal({
  article,
  onClose
}: {
  article: HelpArticle | null
  onClose: () => void
}) {
  if (!article) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#e7e5e4]">
          <h2 className="text-2xl font-bold text-[#1c1917] font-serif">
            {article.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#fafaf9] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#78716c]" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {article.description && (
            <p className="text-[#78716c] mb-4">{article.description}</p>
          )}
          {article.content && (
            <div className="text-[#1c1917] whitespace-pre-line leading-relaxed">
              {article.content}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function HelpCenterWidget({ config }: { config: HelpCenterConfig }) {
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null)

  return (
    <>
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] h-full flex flex-col">
        {config.title && (
          <h3 className="text-base font-bold text-[#1c1917] mb-3 font-serif px-3">
            {config.title}
          </h3>
        )}
        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {config.categories.map((category) => (
            <HelpCategorySection
              key={category.id}
              category={category}
              onSelectArticle={setSelectedArticle}
            />
          ))}
        </div>
      </div>
      <ArticleModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </>
  )
}
