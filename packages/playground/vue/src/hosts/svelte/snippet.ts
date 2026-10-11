import {
	isEmptyField,
	type TComponentEntry,
	type TPluginPropAddress,
	type TPropControl,
} from '@soldy-ui/playground-shared'

/**
 * Код колонок страницы свойств — в Svelte.
 *
 * Тот же код, что пишут хосты Vue и React, и устроен так же: пример — компонент
 * `.svelte`, импорт один и настоящий, ничего от стенда. Синтаксис — Svelte:
 * строка — в кавычках, остальное — выражением в `{}`. Скрипт компонента
 * выполняется один раз на монтирование, поэтому экземпляр и движок — обычные
 * константы, и запись свойства — там же, до первой отрисовки.
 */

/**
 * Сниппет для колонки «Component»: значение приходит пропом.
 *
 * `preset` — соседние пропы, без которых этот не виден (см. `presetForProp`):
 * превью строки их получает, значит и код. Пустое поле — проп не задан
 * (`isEmptyField`): превью его не получает, и в коде атрибута нет. Пресет
 * остаётся.
 */
export function propSnippet(
	entry: TComponentEntry,
	prop: string,
	value: unknown,
	preset: Record<string, unknown> = {},
): string {
	const own = isEmptyField(value) ? '' : ` ${attr(prop, value)}`

	return example([importOf(entry)], [], `<${entry.label}${presetAttrs(preset)}${own} />`)
}

/**
 * Сниппет для колонки «Component Instance»: компонент получает готовый
 * экземпляр ядра, а свойство меняется на нём.
 *
 * Ветвится по `control.scope`, как у хостов Vue и React: свойство компонента
 * пишется в экземпляр, коллекции — в движок, плагина — в плагин из bundle.
 * Пустое поле — проп не задан, и записи в коде нет: свежий экземпляр уже стоит
 * на умолчании.
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

	return example(
		[importOf(entry), `import { ${ctor} } from '@soldy-ui/core'`],
		[`const instance = new ${ctor}()`, ...assignment(`instance.${prop}`, value)],
		`<${entry.label}${presetAttrs(preset)} ctrl={instance} />`,
	)
}

/**
 * Коллекционный проп — в движок, переданный пропом `engine`. Движок —
 * сборщиком самого компонента (`createEngineAccordion` и соседи): почему не
 * общим уровнем, см. тот же случай у хоста Vue.
 */
function collectionInstanceSnippet(
	entry: TComponentEntry,
	prop: string,
	value: unknown,
	preset?: Record<string, unknown>,
): string {
	const create = `createEngine${entry.label}`

	return example(
		[importOf(entry), `import { ${create} } from '@soldy-ui/core'`],
		[`const engine = ${create}()`, ...assignment(`engine.extensions.selection.${prop}`, value)],
		`<${entry.label}${presetAttrs(preset)} engine={engine} />`,
	)
}

/**
 * Плагинный проп — в плагин из bundle: bundle собирает компонент при
 * монтировании, и до него дотягивается только подписка на `bundle:create` на
 * шине экземпляра.
 */
function pluginInstanceSnippet(
	entry: TComponentEntry,
	address: TPluginPropAddress,
	value: unknown,
	preset?: Record<string, unknown>,
): string {
	const ctor = entry.descriptor().ctor?.name ?? 'TComponent'
	const { imports, lines } = pluginAssignment(address, value)

	return example(
		[importOf(entry), `import { ${ctor} } from '@soldy-ui/core'`, ...imports],
		[`const instance = new ${ctor}()`, ...lines],
		`<${entry.label}${presetAttrs(preset)} ctrl={instance} />`,
	)
}

/** Импорт компонента примера из адаптера. */
function importOf(entry: TComponentEntry): string {
	return `import { ${entry.label} } from '@soldy-ui/svelte'`
}

/**
 * Пример целиком — компонент `.svelte`: скрипт с импортами и телом, под ним
 * разметка. Тело отбито от импортов пустой строкой.
 */
function example(imports: readonly string[], body: readonly string[], markup: string): string {
	const script = body.length ? [...imports, '', ...body] : imports

	return ['<script lang="ts">', ...script.map(indent), '</script>', '', markup].join('\n')
}

/** Присваивание с отбивкой сверху. Пустое поле — проп не задан, строк нет. */
function assignment(target: string, value: unknown): string[] {
	return isEmptyField(value) ? [] : ['', `${target} = ${literal(value)}`]
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
			`\tif (plugin) plugin.${address.name} = ${literal(value)}`,
			'})',
		],
	}
}

/**
 * Пропы пресета разметкой, каждый с ведущим пробелом. Во второй колонке тоже
 * разметкой, рядом с `ctrl`: так их передаёт и сам стенд.
 */
function presetAttrs(preset: Record<string, unknown> = {}): string {
	return Object.entries(preset)
		.map(([name, value]) => ` ${attr(name, value)}`)
		.join('')
}

/**
 * Один проп в разметке: строка — в кавычках, остальное — выражением в `{}`.
 *
 * В кавычках Svelte читает `{…}` выражением, а `&` — началом сущности
 * (`&amp;` стал бы `&`), и кавычка оборвала бы строку. Такая строка уходит
 * выражением.
 */
function attr(name: string, value: unknown): string {
	return typeof value === 'string' && !/["&{}]/.test(value)
		? `${name}="${value}"`
		: `${name}={${literal(value)}}`
}

/**
 * Значение так, как его пишут в коде. Пустое поле сюда не доходит: такой проп
 * не задан, и в коде его нет вовсе.
 */
function literal(value: unknown): string {
	if (typeof value === 'string') return `'${value.replace(/[\\']/g, '\\$&')}'`
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)

	return JSON.stringify(value)
}

/** Строка на уровень глубже. Пустая остаётся пустой — без хвостового отступа. */
function indent(line: string): string {
	return line ? `\t${line}` : line
}
