import {
	isEmptyField,
	type TComponentEntry,
	type TPluginPropAddress,
	type TPropControl,
} from '@soldy-ui/playground-shared'

/**
 * Сниппет для колонки «Component»: значение приходит пропом.
 *
 * Импорт один и настоящий — код можно вставить в проект и он заработает. Ради
 * этого же в сниппете нет ничего от стенда: ни реактивных обёрток, ни хелперов.
 *
 * `preset` — соседние пропы, без которых этот не виден (см. `presetForProp`).
 * Превью строки их получает, значит и код обязан: без них вставленный пример
 * показал бы переключатель, который ни на что не влияет.
 *
 * Пустое поле — проп не задан (`isEmptyField`): превью его не получает, и в
 * коде атрибута нет. Голое имя «не задан» не значит — у булева пропа Vue
 * прочтёт его как `true`. Пресет остаётся.
 */
export function propSnippet(
	entry: TComponentEntry,
	prop: string,
	value: unknown,
	preset: Record<string, unknown> = {},
): string {
	const own = isEmptyField(value) ? '' : ` ${attr(prop, value)}`

	return [
		'<script setup lang="ts">',
		`import { ${entry.label} } from '@soldy-ui/vue'`,
		'</script>',
		'',
		'<template>',
		`\t<${entry.label}${presetAttrs(preset)}${own} />`,
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
 * молча ничего не сделал. То же с плагинными: `instance.anchor_placement`
 * нет ни у инстанса, ни у плагина — у `TAnchorPlugin` свойство `placement`.
 *
 * Пустое поле — проп не задан, и записи в коде нет: свежий экземпляр уже стоит
 * на умолчании. Литерал умолчания не подставляется — у пропа без умолчания
 * (`mode` фасадов) подставлять нечего.
 */
export function instanceSnippet(
	entry: TComponentEntry,
	control: TPropControl,
	value: unknown,
): string {
	switch (control.scope) {
		case 'component':
			return componentInstanceSnippet(entry, control.name, value, control.preset)
		case 'collection':
			return collectionInstanceSnippet(entry, control.name, value, control.preset)
		case 'plugin':
			return pluginInstanceSnippet(entry, control.plugin, value, control.preset)
	}
}

function componentInstanceSnippet(
	entry: TComponentEntry,
	prop: string,
	value: unknown,
	preset?: Record<string, unknown>,
): string {
	const ctor = entry.descriptor().ctor?.name ?? 'TComponent'

	return [
		'<script setup lang="ts">',
		`import { ${entry.label} } from '@soldy-ui/vue'`,
		`import { ${ctor} } from '@soldy-ui/core'`,
		'',
		`const instance = new ${ctor}()`,
		...assignment(`instance.${prop}`, value),
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
	return [
		'<script setup lang="ts">',
		`import { ${entry.label} } from '@soldy-ui/vue'`,
		"import { createEngineSelection } from '@soldy-ui/core'",
		'',
		'const engine = createEngineSelection()',
		...assignment(`engine.extensions.selection.${prop}`, value),
		'</script>',
		'',
		'<template>',
		`\t<${entry.label}${presetAttrs(preset)} :engine="engine" />`,
		'</template>',
	].join('\n')
}

/**
 * Третий способ — для плагинных пропов: плагин из bundle.
 *
 * Bundle собирает компонент при монтировании, свойством инстанса до него не
 * дотянуться — только событием `bundle:create` на шине инстанса. Дальше
 * `bundle.get(<класс плагина>)` и запись под именем без неймспейса. Ровно так
 * правую колонку ведёт и сам стенд (`PropRow.vue`).
 */
function pluginInstanceSnippet(
	entry: TComponentEntry,
	address: TPluginPropAddress,
	value: unknown,
	preset?: Record<string, unknown>,
): string {
	const ctor = entry.descriptor().ctor?.name ?? 'TComponent'
	const { imports, lines } = pluginAssignment(address, value)

	return [
		'<script setup lang="ts">',
		`import { ${entry.label} } from '@soldy-ui/vue'`,
		`import { ${ctor} } from '@soldy-ui/core'`,
		...imports,
		'',
		`const instance = new ${ctor}()`,
		...lines,
		'</script>',
		'',
		'<template>',
		`\t<${entry.label}${presetAttrs(preset)} :ctrl="instance" />`,
		'</template>',
	].join('\n')
}

/** Присваивание с отбивкой сверху. Пустое поле — проп не задан, строк нет. */
function assignment(target: string, value: unknown): string[] {
	return isEmptyField(value) ? [] : ['', `${target} = ${toTemplateValue(value)}`]
}

/**
 * Запись в плагин: подписка на `bundle:create` и импорт того, что она берёт.
 * Пустое поле — писать в плагин нечего, и без записи не нужно ни то, ни другое.
 */
function pluginAssignment(
	address: TPluginPropAddress,
	value: unknown,
): { imports: string[]; lines: string[] } {
	if (isEmptyField(value)) return { imports: [], lines: [] }

	const pluginCtor = address.ctor.name

	return {
		imports: [`import { TPluginBundle, ${pluginCtor} } from '@soldy-ui/plugins'`],
		lines: [
			'',
			"instance.events.on('bundle:create', (bundle: unknown) => {",
			'\tif (!(bundle instanceof TPluginBundle)) return',
			'',
			`\tconst plugin = bundle.get(${pluginCtor})`,
			'',
			`\tif (plugin) plugin.${address.name} = ${toTemplateValue(value)}`,
			'})',
		],
	}
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

/** Один проп в шаблоне — всегда через `:` и со значением. */
function attr(name: string, value: unknown): string {
	return `:${name}="${toTemplateValue(value)}"`
}

/**
 * Значение так, как его пишут в коде. Пустое поле сюда не доходит: такой проп
 * не задан, и в коде его нет вовсе.
 */
function toTemplateValue(value: unknown): string {
	if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)

	return JSON.stringify(value)
}
