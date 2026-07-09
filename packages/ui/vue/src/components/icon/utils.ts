import { markRaw, defineAsyncComponent } from 'vue'

const icons = import.meta.glob('../../../../../icons/src/*.svg')

export function useIconImport(path: string) {
    // Извлекаем имя файла из пути: '@soldy/icons/check.svg' → 'check.svg'
    const name = path.split('/').pop() ?? path
    const loader = icons[`../../../../../icons/src/${name}`]

    if (!loader) {
        console.error(`Icon not found: ${path}`)
    }

    return markRaw(defineAsyncComponent(loader ?? (() => Promise.resolve({ template: '<svg></svg>' }))))
}
