import type { TComponentEntry, TPropControl } from '@soldy/playground-shared'

/**
 * Сниппет для колонки «Component»: значение приходит пропом.
 *
 * Импорт один и настоящий — код можно вставить в проект и он заработает. Ради
 * этого же в сниппете нет ничего от стенда: ни реактивных обёрток, ни хелперов.
 *
 * `preset` — соседние пропы, без которых этот не виден (см. `presetForProp`).
 * Превью строки их получает, значит и код обязан: без них вставленный пример
 * показал бы переключатель, который ни на что не влияет.
 */
export function propSnippet(
	entry: TComponentEntry,
	prop: string,
	value: unknown,
	preset: Record<string, unknown> = {},
): string {
	return [
		'<script setup lang="ts">',
		`import { ${entry.label} } from '@soldy/ui-vue'`,
		'</script>',
		'',
		'<template>',
		`\t<${entry.label}${presetAttrs(preset)} ${attr(prop, value)} />`,
		'</template>',
	].join('\n')
}

/**
 * Сниппет для колонки «Component Instance»: компонент получает готовый
 * экземпляр ядра, а свойство меняется на нём.
 *
 * Это второй законный способ управления, и стенд показывает его рядом
 * намеренно: расхождение колонок означает, что проп и инстанс разошлись.
 *
 * Ветвится по `control.scope`, а не пишет `instance.${prop}` вслепую:
 * коллекционные пропы (`mode`) не существуют на самом компоненте — только на
 * коллекции. `new TAccordion().mode = …` в реальном проекте упал бы или
 * молча ничего не сделал.
 */
export function instanceSnippet(
	entry: TComponentEntry,
	control: TPropControl,
	value: unknown,
): string {
	return control.scope === 'collection'
		? collectionInstanceSnippet(entry, control.name, value, control.preset)
		: componentInstanceSnippet(entry, control.name, value, control.preset)
}

function componentInstanceSnippet(
	entry: TComponentEntry,
	prop: string,
	value: unknown,
	preset?: Record<string, unknown>,
): string {
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
		`\t<${entry.label}${presetAttrs(preset)} :ctrl="instance" />`,
		'</template>',
	].join('\n')
}

/**
 * Второй способ для коллекционных пропов — не `instance.${prop}`, а движок.
 *
 * `createEngineSelection` — не догадка, а точное отражение того, чем сейчас
 * управляет стенд: единственный редактируемый коллекционный проп — `mode`, и
 * он живёт на расширении `selection` (`TSelectionCollectionFacade.mode`
 * делегирует туда же). Тот же уровень и по той же причине выбран в
 * `PropRow.vue` для собственного фасада стенда — появись когда-нибудь другой
 * коллекционный проп вне `selection`, оба места придётся поправить вместе.
 */
function collectionInstanceSnippet(
	entry: TComponentEntry,
	prop: string,
	value: unknown,
	preset?: Record<string, unknown>,
): string {
	const literal = toTemplateValue(value) ?? 'true'

	return [
		'<script setup lang="ts">',
		`import { ${entry.label} } from '@soldy/ui-vue'`,
		"import { createEngineSelection } from '@soldy/core'",
		'',
		'const engine = createEngineSelection()',
		'',
		`engine.extensions.selection.${prop} = ${literal}`,
		'</script>',
		'',
		'<template>',
		`\t<${entry.label}${presetAttrs(preset)} :engine="engine" />`,
		'</template>',
	].join('\n')
}

/**
 * Пропы пресета разметкой, каждый с ведущим пробелом. Во второй колонке тоже
 * разметкой, а не записью в инстанс: так их передаёт и сам стенд, а `mode`
 * у компонентной строки в инстанс и не записать — он живёт на коллекции.
 */
function presetAttrs(preset: Record<string, unknown> = {}): string {
	return Object.entries(preset)
		.map(([name, value]) => ` ${attr(name, value)}`)
		.join('')
}

/** Один проп в шаблоне: без значения — голым именем, иначе через `:`. */
function attr(name: string, value: unknown): string {
	const literal = toTemplateValue(value)

	return literal === null ? name : `:${name}="${literal}"`
}

/** Значение так, как его пишут в шаблоне. `null` — проп без значения. */
function toTemplateValue(value: unknown): string | null {
	if (value === undefined || value === '') return null
	if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)

	return JSON.stringify(value)
}
