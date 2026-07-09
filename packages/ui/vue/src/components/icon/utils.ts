import { markRaw, defineAsyncComponent, type Component } from 'vue'

const icons = import.meta.glob('../../../../../icons/src/*.svg')

export function useIconImport(path: string): Component {
    const name = path.split('/').pop() ?? path
    const loader = icons[`../../../../../icons/src/${name}`]

    if (!loader) {
        console.error(`Icon not found: ${path}`)
        return markRaw({ template: '<svg></svg>' })
    }

    return markRaw(defineAsyncComponent(loader as () => Promise<Component>))
}
