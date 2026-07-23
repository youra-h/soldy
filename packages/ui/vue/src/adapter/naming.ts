/**
 * Vue-стратегия именования props и событий.
 *
 * - props: `icon-styles:styles` → `iconStyles_styles` (camelCase для JS)
 * - events: `element:ready` → `element:ready` (двоеточия допустимы в emit)
 */

import type { INamingStrategy } from '@soldy/accessor'

export const vueNaming: INamingStrategy = {
    prop: (name, ns) => {
        if (!ns) return name

        // Преобразуем kebab-case namespace в camelCase: 'icon-styles' → 'iconStyles'
        const formattedNs = ns.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

        return `${formattedNs}_${name}`
    },

    event: (name, ns) => (ns ? `${ns}:${name}` : name),
}
