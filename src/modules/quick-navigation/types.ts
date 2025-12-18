export interface NavigationLink {
  id: string
  label: string
  url: string
  icon?: string
  external?: boolean
  description?: string
}

export interface NavigationSection {
  id: string
  title: string
  links: NavigationLink[]
  collapsed?: boolean
}

export interface QuickNavConfig {
  sections: NavigationSection[]
  title?: string
  showIcons?: boolean
}
