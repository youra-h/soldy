import { defineComponent, h, markRaw, type Component } from 'vue'
import * as icons from '@soldy/icons'

const iconMap = icons as Record<string, string>

export function useIconImport(name: string): Component {
    const svg = iconMap[name]

    if (!svg) {
        console.error(`Icon not found: ${name}`)
        return markRaw({ render: () => h('svg') })
    }

    return markRaw(defineComponent({ template: svg }))
}
