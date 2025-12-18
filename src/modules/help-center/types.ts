export interface HelpArticle {
  id: string
  title: string
  description?: string
  icon?: string
  url?: string
  external?: boolean
  content?: string
  category?: string
}

export interface HelpCategory {
  id: string
  title: string
  icon?: string
  articles: HelpArticle[]
  collapsed?: boolean
}

export interface HelpCenterConfig {
  categories: HelpCategory[]
  title?: string
  showSearch?: boolean
}
