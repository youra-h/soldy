import {
	buildAttributeMap,
	coerceAttribute,
	isHostProp,
	toAttributeName,
	type IAttributeBinding,
} from '@soldy-ui/webc'
import {
	isEmptyField,
	snippetLiteral,
	type TComponentEntry,
	type TPluginPropAddress,
	type TPropControl,
} from '@soldy-ui/playground-shared'
import { PREVIEWS, type TPreview } from './previews'

/**
 * Код колонок страницы свойств — в Web Components.
 *
 * Тот же код, что пишут хосты Vue, React, Svelte и Solid, и устроен так же:
 * импорт один и настоящий, ничего от стенда. Синтаксис — страница HTML:
 * модуль `<script type="module">` регистрирует элементы (`import
 * '@soldy-ui/webc'`), а компонент — элемент своего тега с `is`.
 *
 * Колонка пропа — разметка: значение уходит атрибутом. Чего атрибут не
 * передаст — `false` у флага (у флага значимо наличие атрибута), строку, которую
 * тип пропа прочёл бы числом, — модуль пишет свойством элемента. Колонка
 * экземпляра — элемент строит код, как его строит хост, и `ctrl` ставится до
 * вставки: инстанс, присвоенный подключённому элементу, дошёл бы до ядра лишь
 * при следующем подключении.
 *
 * Пропов, которых у элемента нет (`tag`: тег — сам элемент), в коде нет, как
 * их не получает и превью. Свои атрибуты элемента из описания превью (роль
 * иконки) код пишет всегда — без них элемент рисует не то, что превью: в
 * колонке пропа — атрибутом в разметке, в колонке экземпляра — свойством
 * элемента.
 */

/** Импорт, который регистрирует элементы пакета. */
const REGISTER = "import '@soldy-ui/webc'"

/** Элемент компонента — из карты превью хоста: тег и имя элемента soldy. */
function elementOf(entry: TComponentEntry): TPreview {
	const preview = PREVIEWS[entry.id]

	if (!preview) throw new Error(`[playground] у хоста Web Components нет элемента «${entry.id}»`)

	return preview
}

/**
 * Сниппет для колонки «Component»: значение приходит пропом — атрибутом.
 *
 * `preset` — соседние пропы, без которых этот не виден (см. `presetForProp`):
 * превью строки их получает, значит и код. Пустое поле — проп не задан
 * (`isEmptyField`): превью его не получает, и в коде его нет. Пресет
 * остаётся.
 */
export function propSnippet(
	entry: TComponentEntry,
	prop: string,
	value: unknown,
	preset: Record<string, unknown> = {},
): string {
	const element = elementOf(entry)
	const bindings = bindingsOf(entry)
	// Свои атрибуты элемента — первыми, перед пропами, как в описании превью
	const attributes = Object.entries(element.attributes ?? {}).map(
		([name, raw]) => ` ${attribute(name, raw)}`,
	)
	const properties: string[] = []

	for (const [name, given] of Object.entries(
		isEmptyField(value) ? preset : { ...preset, [prop]: value },
	)) {
		if (isHostProp(name)) continue

		const raw = attributeOf(bindings.get(name), given)

		if (raw === undefined) {
			properties.push(`element.${name} = ${snippetLiteral(given)}`)
		} else {
			attributes.push(` ${attribute(name, raw)}`)
		}
	}

	const body = properties.length
		? [`const element = document.querySelector('${selectorOf(element)}')`, '', ...properties]
		: []

	return [
		...moduleScript([REGISTER], body),
		'',
		`<${element.tag}${isOf(element)}${attributes.join('')}></${element.tag}>`,
	].join('\n')
}

/** Атрибут `is` в разметке — у встроенного элемента; автономный — один тег (`<so-virtual>`). */
function isOf(element: TPreview): string {
	return element.is === undefined ? '' : ` is="${element.is}"`
}

/**
 * Сниппет для колонки «Component Instance»: элемент получает готовый
 * экземпляр ядра, а свойство меняется на нём.
 *
 * Ветвится по `control.scope`, как у остальных хостов: свойство компонента
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

	return instanceExample(
		entry,
		[`import { ${ctor} } from '@soldy-ui/core'`],
		[`const instance = new ${ctor}()`, ...assignment(`instance.${prop}`, value)],
		preset,
	)
}

/**
 * Коллекционный проп — в движок, который элемент получает свойством `engine`
 * до вставки, как `ctrl`: движок сборка берёт при подключении. Движок —
 * сборщиком самого компонента (`createEngineAccordion` и соседи), как у хостов
 * Vue и React.
 */
function collectionInstanceSnippet(
	entry: TComponentEntry,
	prop: string,
	value: unknown,
	preset?: Record<string, unknown>,
): string {
	const create = `createEngine${entry.label}`

	return instanceExample(
		entry,
		[`import { ${create} } from '@soldy-ui/core'`],
		[`const engine = ${create}()`, ...assignment(`engine.extensions.selection.${prop}`, value)],
		preset,
		'element.engine = engine',
	)
}

/**
 * Плагинный проп — в плагин из bundle: bundle собирает элемент при
 * подключении, и до него дотягивается только подписка на `bundle:create` на
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

	return instanceExample(
		entry,
		[`import { ${ctor} } from '@soldy-ui/core'`, ...imports],
		[`const instance = new ${ctor}()`, ...lines],
		preset,
	)
}

/**
 * Колонка экземпляра целиком: модуль с импортами, экземпляр и элемент,
 * который строит код. Экземпляр — до вставки (`given`: `ctrl` или движок
 * коллекции `engine`), рядом с ним — свои атрибуты элемента и пропы пресета
 * свойствами: так их передаёт и сам стенд.
 */
function instanceExample(
	entry: TComponentEntry,
	imports: readonly string[],
	instance: readonly string[],
	preset: Record<string, unknown> = {},
	given = 'element.ctrl = instance',
): string {
	const element = elementOf(entry)
	const own = Object.entries(element.attributes ?? {}).map(
		([name, value]) => `element.${name} = ${snippetLiteral(value)}`,
	)
	const props = Object.entries(preset)
		.filter(([name]) => !isHostProp(name))
		.map(([name, value]) => `element.${name} = ${snippetLiteral(value)}`)

	const options = element.is === undefined ? '' : `, { is: '${element.is}' }`

	return moduleScript(
		[REGISTER, ...imports],
		[
			...instance,
			'',
			`const element = document.createElement('${element.tag}'${options})`,
			'',
			given,
			...own,
			...props,
			'document.body.append(element)',
		],
	).join('\n')
}

/**
 * Модуль страницы: импорты, под ними тело — внутри `<script type="module">`,
 * с отступом. Модуль выполняется после разбора страницы, и разметка под ним
 * к этому времени уже есть.
 */
function moduleScript(imports: readonly string[], body: readonly string[]): string[] {
	const lines = body.length ? [...imports, '', ...body] : imports

	return ['<script type="module">', ...lines.map(indent), '</script>']
}

/** Присваивание с отбивкой сверху. Пустое поле — проп не задан, строк нет. */
function assignment(target: string, value: unknown): string[] {
	return isEmptyField(value) ? [] : ['', `${target} = ${snippetLiteral(value)}`]
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
			"instance.events.on('bundle:create', (bundle) => {",
			'\tif (!(bundle instanceof TPluginBundle)) return',
			'',
			`\tconst plugin = bundle.get(${pluginCtor})`,
			'',
			`\tif (plugin) plugin.${address.name} = ${snippetLiteral(value)}`,
			'})',
		],
	}
}

/**
 * Как атрибуты элемента пишут пропы: проп → правило приведения строки
 * атрибута. У коллекции — и пропы фасада (`mode` у Accordion): они тоже
 * атрибуты-входы элемента.
 */
function bindingsOf(entry: TComponentEntry): Map<string, IAttributeBinding> {
	// Фасад первым: одноимённый проп компонента главнее, как у элемента
	const descriptors = [
		...(entry.collectionDescriptor ? [entry.collectionDescriptor()] : []),
		entry.descriptor(),
	]

	return new Map(
		descriptors.flatMap((descriptor) =>
			[...buildAttributeMap(descriptor).values()].map(
				(binding) => [binding.prop, binding] as const,
			),
		),
	)
}

/**
 * Строка атрибута, из которой элемент прочтёт ровно это значение, или
 * `undefined` — атрибутом его не передать. Проверка — тем же приведением, что у
 * элемента (`coerceAttribute`): `true` флага — атрибут без значения, число —
 * его запись, если тип пропа прочтёт её числом, строка — как есть, если тип не
 * прочтёт её иначе. У `false` флага атрибута нет вовсе: снять флаг можно только
 * удалением атрибута, а не задать.
 */
function attributeOf(binding: IAttributeBinding | undefined, value: unknown): string | undefined {
	if (!binding) return undefined

	const raw =
		value === true
			? ''
			: typeof value === 'string' || typeof value === 'number'
				? String(value)
				: undefined

	return raw !== undefined && Object.is(coerceAttribute(raw, binding), value) ? raw : undefined
}

/**
 * Атрибут пропа в разметке: имя — как у элемента (`toAttributeName`), пустая
 * строка — атрибут без значения. В значении экранируются `&` и кавычка: первый
 * HTML прочёл бы началом сущности, вторая оборвала бы значение.
 */
function attribute(name: string, raw: string): string {
	const html = toAttributeName(name)

	return raw === '' ? html : `${html}="${raw.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`
}

/** Селектор элемента примера — для модуля, который пишет ему свойства. */
function selectorOf(element: TPreview): string {
	return element.is === undefined ? element.tag : `${element.tag}[is="${element.is}"]`
}

/** Строка на уровень глубже. Пустая остаётся пустой — без хвостового отступа. */
function indent(line: string): string {
	return line ? `\t${line}` : line
}
