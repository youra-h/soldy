import type { TComponentEntry } from '@soldy/playground-shared'

/**
 * Сниппет для колонки «Component»: значение приходит пропом.
 *
 * Импорт один и настоящий — код можно вставить в проект и он заработает. Ради
 * этого же в сниппете нет ничего от стенда: ни реактивных обёрток, ни хелперов.
 */
export function propSnippet(entry: TComponentEntry, prop: string, value: unknown): string {
	const literal = toTemplateValue(value)

	return [
		'<script setup lang="ts">',
		`import { ${entry.label} } from '@soldy/ui-vue'`,
		'</script>',
		'',
		'<template>',
		`\t<${entry.label} ${literal === null ? prop : `:${prop}="${literal}"`} />`,
		'</template>',
	].join('\n')
}

/**
 * Сниппет для колонки «Component Instance»: компонент получает готовый
 * экземпляр ядра, а свойство меняется на нём.
 *
 * Это второй законный способ управления, и стенд показывает его рядом
 * намеренно: расхождение колонок означает, что проп и инстанс разошлись.
 */
export function instanceSnippet(entry: TComponentEntry, prop: string, value: unknown): string {
	const ctor = entry.descriptor().ctor?.name ?? 'TComponent'
	const literal = toTemplateValue(value) ?? 'true'

	return [
		'<script setup lang="ts">',
		`import { ${entry.label} } from '@soldy/ui-vue'`,
		`import { ${ctor} } from '@soldy/core'`,
		'',
		`const instance = new ${ctor}()`,
		'',
		`instance.${prop} = ${literal}`,
		'</script>',
		'',
		'<template>',
		`\t<${entry.label} :ctrl="instance" />`,
		'</template>',
	].join('\n')
}

/** Значение так, как его пишут в шаблоне. `null` — проп без значения. */
function toTemplateValue(value: unknown): string | null {
	if (value === undefined || value === '') return null
	if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)

	return JSON.stringify(value)
}
