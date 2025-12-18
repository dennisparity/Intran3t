# Intran3t Modular Architecture

This directory contains self-contained modules following a plugin architecture pattern inspired by the Polkadot Hub App.

## Architecture Overview

Each module is self-contained with its own:
- **manifest.json**: Module metadata and configuration
- **types.ts**: TypeScript type definitions
- **config.ts**: Default configuration and data
- **Widget component(s)**: React components that can be embedded anywhere
- **index.ts**: Public API exports

## Current Modules

### Governance (`governance/`)
OpenGov referendum viewer and voting interface.

**Key Features:**
- Active/Completed referendum tabs
- Vote progress visualization
- Status tracking (deciding, passing, failing, confirming)
- External links to detailed views
- Mock data ready to be replaced with PAPI queries

**Usage:**
```tsx
import { GovernanceWidget, defaultGovernanceConfig } from '../modules/governance'

<GovernanceWidget config={defaultGovernanceConfig} />
```

**Configuration:**
```typescript
{
  title: 'OpenGov',
  description: 'Polkadot governance referenda',
  showActiveTab: true,
  showCompletedTab: true,
  network: 'polkadot',
  useRealData: false // Set true when PAPI integration ready
}
```

### Acc3ss (`acc3ss/`)
Office access management for desk booking and visitor management.

**Key Features:**
- Three tabs: Visit Office, Book Meeting Room, Invite Guest
- Floor plan visualization
- Desk availability tracking
- Current booking display
- Floor navigation
- Occupancy statistics

**Usage:**
```tsx
import { Acc3ssWidget, defaultAcc3ssConfig } from '../modules/acc3ss'

<Acc3ssWidget config={defaultAcc3ssConfig} />
```

**Configuration:**
```typescript
{
  title: 'Acc3ss',
  description: 'Office access management',
  showVisitTab: true,
  showMeetingTab: true,
  showGuestTab: true,
  defaultTab: 'visit',
  floors: [1, 2, 3, 4, 5],
  useRealData: false // Set true when backend integration ready
}
```

### Quick Navigation (`quick-navigation/`)
Provides quick access links organized by category.

**Key Features:**
- Collapsible sections
- Internal and external links
- Icon support
- Smooth scroll to dashboard sections

**Usage:**
```tsx
import { QuickNavWidget, defaultQuickNavConfig } from '../modules/quick-navigation'

<QuickNavWidget config={defaultQuickNavConfig} />
```

### Help Center (`help-center/`)
Displays help articles and resources organized by category.

**Key Features:**
- Collapsible categories
- Article modal viewer
- External resource links
- Search support (planned)

**Usage:**
```tsx
import { HelpCenterWidget, defaultHelpCenterConfig } from '../modules/help-center'

<HelpCenterWidget config={defaultHelpCenterConfig} />
```

## Creating a New Module

1. **Create module directory**: `src/modules/your-module/`

2. **Create manifest.json**:
```json
{
  "id": "your-module",
  "name": "Your Module",
  "version": "1.0.0",
  "description": "Module description",
  "widgets": [
    {
      "id": "YourWidget",
      "name": "Your Widget",
      "component": "YourWidget",
      "defaultPosition": "sidebar"
    }
  ],
  "permissions": [],
  "dependencies": []
}
```

3. **Create types.ts**:
```typescript
export interface YourModuleConfig {
  // Your configuration interface
}
```

4. **Create config.ts**:
```typescript
import type { YourModuleConfig } from './types'

export const defaultYourModuleConfig: YourModuleConfig = {
  // Default configuration
}
```

5. **Create YourWidget.tsx**:
```tsx
import type { YourModuleConfig } from './types'

export function YourWidget({ config }: { config: YourModuleConfig }) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* Your widget content */}
    </div>
  )
}
```

6. **Create index.ts**:
```typescript
export { YourWidget } from './YourWidget'
export { defaultYourModuleConfig } from './config'
export type { YourModuleConfig } from './types'
```

## Brand Guidelines Compliance

All modules MUST follow Intran3t brand guidelines:

### Typography
- **Headlines**: `font-serif` (DM Serif Display)
- **Body**: `font-sans` (DM Sans)
- **Code**: `font-mono` (JetBrains Mono)

### Colors
- **Background**: `bg-[#fafaf9]`
- **Text Primary**: `text-[#1c1917]`
- **Text Secondary**: `text-[#78716c]`
- **Text Muted**: `text-[#a8a29e]`
- **Accent/Hover**: `text-[#ff2867]` or `hover:text-[#ff2867]`
- **Borders**: `border-[#e7e5e4]`

### Spacing & Layout
- **Border Radius**: `rounded-2xl` (cards), `rounded-lg` (buttons/inputs), `rounded-full` (badges)
- **Shadows**: `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` (subtle)
- **Padding**: `p-4` to `p-6` for cards
- **Gaps**: `gap-2` to `gap-4` for flex/grid

### Interactive Elements
- **Transitions**: `transition-all duration-200` or `transition-colors`
- **Hover States**: Always include hover effects with color changes
- **Active States**: Use pink accent (`#ff2867`) for active/selected

## Integration with Dashboard

To add a module to the dashboard:

1. **Import the widget and config**:
```tsx
import { YourWidget, defaultYourModuleConfig } from '../modules/your-module'
```

2. **Add to the grid layout**:
```tsx
<div className="col-span-12 md:col-span-4 row-span-1">
  <YourWidget config={defaultYourModuleConfig} />
</div>
```

## Future Enhancements

### Phase 2 (Planned)
- Settings module
- Forms module
- Module registry system
- Dynamic module loading

### Phase 3 (Future)
- Backend integration
- Module permissions
- Cross-module communication (portals)
- Configuration-driven layout
- Module marketplace

## Module Best Practices

1. **Self-Contained**: Modules should not depend on other modules
2. **Configurable**: Use configuration objects for customization
3. **Typed**: Provide comprehensive TypeScript types
4. **Documented**: Include clear documentation in manifest
5. **Branded**: Follow brand guidelines consistently
6. **Accessible**: Include proper ARIA labels and keyboard navigation
7. **Responsive**: Work well on mobile and desktop
8. **Performant**: Optimize for fast loading and rendering

## Resources

- [Polkadot Hub App](https://github.com/paritytech/polkadot-hub-app) - Original inspiration
- [Intran3t Brand Guidelines](../index.css) - See `@theme` section
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
