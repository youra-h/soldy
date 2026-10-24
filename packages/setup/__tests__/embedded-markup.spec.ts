import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative, sep } from 'node:path'
import { TButton, TListBoxItem, TMenuItem, TSelectItem, TTagsItem } from '@soldy-ui/core'

/**
 * Сторож признака `embedded`: компонент soldy, который разметка библиотеки
 * использует как деталь другого компонента (строка и крестик тега, поле и
 * список Select), несёт имя места.
 *
 * По признаку `usePlugins` со `scope: 'own'` отличает кнопку пользователя от
 * крестика тега. Забытый признак ничего не роняет — плагин приложения молча
 * встанет в чужую разметку, поэтому и нужен сторож.
 *
 * Признак не нужен элементам своей коллекции: `ListBoxItem`, нарисованный
 * `ListBox`, — это элемент списка, а не деталь. Их узнаёт префикс: имя тега
 * начинается с имени компонента, в папке которого лежит разметка.
 *
 * Второй сторож — `type` детали-кнопки. Button, которого разметка ставит
 * деталью с корнем `<button>`, несёт `type="button"`: у `<button>` без `type`
 * тип `submit`, и в форме клик по кнопке очистки отправлял форму, а Enter в
 * поле — неявная отправка — нажимал первую такую кнопку, и поле очищалось
 * вместо отправки. Корень детали — `tag` разметки, без него — тег Button по
 * умолчанию (`TButton.defaultValues`), в Angular — сам элемент с атрибутом
 * `so-button`. У детали над экземпляром владельца (`ctrl` без `tag`) тег
 * задаёт экземпляр, а не разметка: строку элемента создаёт элемент — тег
 * (`TTagsItem.row`), элемент ListBox, опция Select и пункт меню, — и сторож
 * берёт тег у экземпляра (`ROW_DETAILS`). Деталь другого тега (строка
 * элемента списка, тега и пункта на `div`, опции на `span`,
 * `<div so-button>`) `type` не несёт: у её тега такого атрибута нет. Сторож
 * читает только статические `tag` и `type`, поэтому тег, заданный
 * выражением, — тоже нарушение: нужен ли `type`, по нему не узнать. Button
 * потребителя не деталь и остаётся кнопкой отправки, как нативная `<button>`.
 * Шаблон Web Components — код, и `type` своей детали он ставит помощником
 * `createDetail` (`attributes`).
 *
 * Компонентом soldy считается тег с именем папки компонента (`Button`,
 * `so-button`) или с её префиксом (`TagsItem`), а в Angular — ещё и атрибут
 * `so-<имя>` на обычном теге: корень там — сам элемент потребителя
 * (`<button so-button>`), и по имени тега его не узнать. Сканируется
 * `packages/ui/*\/src/components/**` без комментариев.
 */

const ROOT = resolve(__dirname, '../../..')
const UI = join(ROOT, 'packages/ui')

const EXTENSIONS = /\.(vue|svelte|tsx|html)$/

const pascal = (kebab: string) =>
	kebab
		.split('-')
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join('')

function adapters(): { adapter: string; dir: string }[] {
	return readdirSync(UI)
		.map((adapter) => ({ adapter, dir: join(UI, adapter, 'src/components') }))
		.filter(({ dir }) => {
			try {
				return statSync(dir).isDirectory()
			} catch {
				return false
			}
		})
}

/** Имена компонентов soldy — папки компонентов всех адаптеров. */
function componentNames(): string[] {
	const names = new Set<string>()

	for (const { dir } of adapters()) {
		for (const name of readdirSync(dir)) {
			if (statSync(join(dir, name)).isDirectory()) names.add(pascal(name))
		}
	}

	return [...names]
}

function collectFiles(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) collectFiles(full, files)
		else if (EXTENSIONS.test(name)) files.push(full)
	}

	return files
}

/** Разметка компонентов адаптеров: файл и компонент, в папке которого он лежит. */
function markupFiles(): { file: string; owner: string }[] {
	return adapters().flatMap(({ dir }) =>
		collectFiles(dir).map((file) => ({
			file,
			owner: pascal(relative(dir, file).split(sep)[0]),
		})),
	)
}

/** Путь файла от корня репозитория — для отчёта. */
const shown = (file: string) => relative(ROOT, file).split(sep).join('/')

function stripComments(source: string): string {
	return source
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Открывающий тег целиком — до `>` вне кавычек и фигурных скобок. */
function readTag(source: string, start: number): string {
	let quote: string | null = null
	let depth = 0

	for (let i = start; i < source.length; i++) {
		const char = source[i]

		if (quote) {
			if (char === quote) quote = null
		} else if (char === '"' || char === "'" || char === '`') {
			quote = char
		} else if (char === '{') {
			depth++
		} else if (char === '}') {
			depth--
		} else if (char === '>' && depth === 0 && source[i - 1] !== '=') {
			return source.slice(start, i + 1)
		}
	}

	return source.slice(start)
}

/**
 * Чем открывающий тег называет компонент: тегом (`Button`, `so-icon`) или,
 * у обычного тега, атрибутом Angular (`<button so-button>` — `so-button`).
 * Значения атрибутов не в счёт: `class="so-button"` — не селектор.
 */
function componentOf(name: string, opening: string): string | null {
	if (name.startsWith('so-') || /^[A-Z]/.test(name)) return name

	const attributes = opening.replace(/(["'`])[\s\S]*?\1/g, '""')

	return /\s(so-[a-z-]+)(?=[\s=/>])/.exec(attributes)?.[1] ?? null
}

/** Компонент soldy в разметке. */
type TMarkupComponent = {
	/** Как его назвала разметка: `Button`, `so-icon`, `so-button` (атрибут Angular). */
	readonly raw: string
	/** Имя компонента: `Button` и у `so-button`. */
	readonly name: string
	/** Тег элемента в разметке: `Button` или, у атрибута Angular, `button`. */
	readonly element: string
	/** Открывающий тег целиком. */
	readonly opening: string
}

/** Компоненты soldy в разметке, без комментариев. */
function* componentsOf(source: string): Generator<TMarkupComponent> {
	const code = stripComments(source)

	for (const match of code.matchAll(/<([A-Za-z][\w-]*)(?=[\s/>])/g)) {
		const opening = readTag(code, match.index)
		const raw = componentOf(match[1], opening)

		if (raw === null) continue

		const name = raw.startsWith('so-') ? pascal(raw.slice('so-'.length)) : raw

		yield { raw, name, element: match[1], opening }
	}
}

/** Вложенные компоненты soldy без признака: `тег` для отчёта. */
function findUnmarked(source: string, owner: string, names: readonly string[]): string[] {
	const found: string[] = []

	for (const { raw, name, opening } of componentsOf(source)) {
		if (!names.some((known) => name === known || name.startsWith(known))) continue
		if (name.startsWith(owner)) continue

		if (!/[\s[:]embedded\]?\s*=/.test(opening)) found.push(raw)
	}

	return found
}

/**
 * Открывающий тег с пустыми выражениями `{…}`: разметка JSX в пропе
 * (`trailing={<Icon tag={…} />}`) — атрибуты вложенного тега, а не этого.
 * Значения в кавычках остаются как есть.
 */
function withoutExpressions(opening: string): string {
	let result = ''
	let quote: string | null = null
	let depth = 0

	for (const char of opening) {
		if (quote) {
			if (char === quote) quote = null
		} else if (char === '"' || char === "'" || char === '`') {
			quote = char
		} else if (char === '{') {
			depth++
			if (depth === 1) result += char

			continue
		} else if (char === '}') {
			depth--
		}

		if (depth === 0) result += char
	}

	return result
}

/**
 * Атрибут открывающего тега: значение статического (`tag="div"`), `true` —
 * если он задан выражением (`:tag`, `tag={…}`, `[tag]`, `[attr.tag]`), `null`
 * — если его нет.
 */
function attributeOf(opening: string, attribute: string): string | true | null {
	const literal = new RegExp(`\\s${attribute}="([^"]*)"`).exec(opening)

	if (literal) return literal[1]

	return new RegExp(`[\\s:[](?:attr\\.)?${attribute}\\]?\\s*=`).test(opening) ? true : null
}

/**
 * Детали над экземпляром владельца — по имени места: экземпляр, как его
 * создаёт владелец. Тег корня у такой детали задаёт он, а не разметка
 * (`ctrl` без `tag`), и сменись он на `button` — деталь обязана нести
 * `type="button"`.
 */
const ROW_DETAILS: Readonly<Record<string, () => { readonly tag: string | object }>> = {
	// Строки элементов коллекций — `TItemRow`, которыми владеют элементы
	'tags.row': () => new TTagsItem().row,
	'list-box.row': () => new TListBoxItem().row,
	'select.row': () => new TSelectItem().row,
	// Одна у пунктов всех видов: строку создаёт база пункта
	'menu.row': () => new TMenuItem().row,
}

/** Деталь-кнопка разметки. */
type TButtonDetail = {
	/** Имя места (`input.clear`), без него — как деталь назвала разметка. */
	readonly label: string
	/**
	 * Тег корня; `true` — задан выражением, `null` — его задаёт экземпляр, а
	 * места нет в `ROW_DETAILS`.
	 */
	readonly tag: string | object | true | null
	/** `type`: статический — строкой, `true` — выражение, `null` — нет. */
	readonly type: string | true | null
}

/** Тег корня детали над экземпляром — у экземпляра места; места нет в таблице — `null`. */
function rowTagOf(place: string | true | null): string | object | null {
	const create = typeof place === 'string' ? ROW_DETAILS[place] : undefined

	return create ? create().tag : null
}

/** Детали-кнопки разметки: вложенные Button. */
function* buttonDetails(source: string, owner: string): Generator<TButtonDetail> {
	for (const { raw, name, element, opening } of componentsOf(source)) {
		if (name !== 'Button' || owner === 'Button') continue

		const own = withoutExpressions(opening)
		const place = attributeOf(own, 'embedded')
		// Корень Angular — сам элемент разметки, у остальных — `tag` Button, а без
		// него над экземпляром (`ctrl`) — тег экземпляра
		const tag = raw === element ? attributeOf(own, 'tag') : element
		const rowDetail = tag === null && attributeOf(own, 'ctrl') !== null

		yield {
			label: typeof place === 'string' ? place : `<${raw}>`,
			tag: rowDetail ? rowTagOf(place) : (tag ?? TButton.defaultValues.tag),
			type: attributeOf(own, 'type'),
		}
	}
}

/** Что не так с `type` детали — для отчёта; всё верно — `null`. */
function problemOf({ label, tag, type }: TButtonDetail): string | null {
	if (tag === true) return `${label}: тег задан выражением`
	if (tag === null) return `${label}: тег задаёт экземпляр, а места нет в ROW_DETAILS`
	if (tag === 'button') return type === 'button' ? null : `${label}: нет type="button"`

	return type === null ? null : `${label}: type у тега ${tag}`
}

/** Детали-кнопки с неверным `type`: имя места и что не так. */
const findUntyped = (source: string, owner: string): string[] =>
	[...buttonDetails(source, owner)].flatMap((detail) => problemOf(detail) ?? [])

describe('вложенные компоненты разметки несут признак embedded', () => {
	const names = componentNames()

	it.each([
		['<Button :size="size" />', 'Tags', ['Button']],
		['<Button\n\t@click="() => a > b"\n>', 'Tags', ['Button']],
		['<so-icon [size]="size"></so-icon>', 'Tags', ['so-icon']],
		['<button so-button [size]="size"></button>', 'Tags', ['so-button']],
		['<Button embedded="tags.close" />', 'Tags', []],
		['<Icon embedded={name} />', 'Tags', []],
		['<so-icon [embedded]="name"></so-icon>', 'Tags', []],
		['<button so-button embedded="tags.close"></button>', 'Tags', []],
		['<span class="so-button"></span>', 'Tags', []],
		['<TagsItem :ctrl="item" />', 'Tags', []],
		['<!-- <Button /> -->', 'Tags', []],
	])('%s в %s', (source, owner, expected) => {
		expect(findUnmarked(source, owner, ['Button', 'Icon', 'Tags'])).toEqual(expected)
	})

	it('в src/components/** адаптеров вложенный компонент без признака не встречается', () => {
		expect(adapters().length, 'не найдено ни одного src/components адаптера').toBeGreaterThan(0)
		expect(names).toContain('Button')

		const violations = markupFiles().flatMap(({ file, owner }) =>
			findUnmarked(readFileSync(file, 'utf-8'), owner, names).map(
				(tag) => `${shown(file)}: <${tag}>`,
			),
		)

		expect(
			violations,
			`Вложенный компонент без embedded (см. AGENTS.md, «Плагины и расширения снаружи»):\n${violations.join('\n')}`,
		).toEqual([])
	})
})

describe('деталь-кнопка разметки — type="button", деталь другого тега — без type', () => {
	it.each([
		['<Button embedded="input.clear" type="button" />', []],
		['<Button embedded="input.clear" />', ['input.clear: нет type="button"']],
		['<Button\n\tembedded="tabs.row"\n\t{...row}\n>', ['tabs.row: нет type="button"']],
		['<Button tag="button" embedded="x" type="button" />', []],
		['<Button tag="button" embedded="x" />', ['x: нет type="button"']],
		['<Button embedded="x" type="submit" />', ['x: нет type="button"']],
		['<Button embedded="x" :type="kind" />', ['x: нет type="button"']],
		['<Button embedded="x" data-type="button" />', ['x: нет type="button"']],
		['<Button tag="div" embedded="tags.row" />', []],
		['<Button tag="div" embedded="tags.row" type="button" />', ['tags.row: type у тега div']],
		['<Button embedded="tags.row" :ctrl="row" />', []],
		['<Button embedded="tags.row" ctrl={row} type="button" />', ['tags.row: type у тега div']],
		[
			'<Button embedded="x" :ctrl="part" />',
			['x: тег задаёт экземпляр, а места нет в ROW_DETAILS'],
		],
		['<Button tag="button" embedded="x" :ctrl="part" />', ['x: нет type="button"']],
		['<Button :tag="tag" embedded="x" type="button" />', ['x: тег задан выражением']],
		['<Button tag={tag} embedded="x" type="button" />', ['x: тег задан выражением']],
		['<Button embedded="table.sort" type="button" trailing={<Icon tag={Sort} />} />', []],
		[
			'<Button embedded="table.sort" trailing={<i type="button" />} />',
			['table.sort: нет type="button"'],
		],
		['<button so-button embedded="input.clear" type="button"></button>', []],
		['<button so-button embedded="input.clear"></button>', ['input.clear: нет type="button"']],
		['<div so-button embedded="list-box.row"></div>', []],
		[
			'<div so-button embedded="list-box.row" type="button"></div>',
			['list-box.row: type у тега div'],
		],
		['<Icon embedded="input.clear-icon" />', []],
		['<!-- <Button embedded="x" /> -->', []],
	])('%s', (source, expected) => {
		expect(findUntyped(source, 'Input')).toEqual(expected)
	})

	it('в src/components/** адаптеров деталь-кнопка без type="button" не встречается', () => {
		const details = markupFiles().flatMap(({ file, owner }) =>
			[...buttonDetails(readFileSync(file, 'utf-8'), owner)].map((detail) => ({
				file,
				detail,
			})),
		)

		// Разбор видит детали обоих видов: без них проверка ниже прошла бы вхолостую
		expect(details.some(({ detail }) => detail.tag === 'button')).toBe(true)
		expect(details.some(({ detail }) => detail.tag === 'div')).toBe(true)

		const violations = details.flatMap(({ file, detail }) => {
			const problem = problemOf(detail)

			return problem === null ? [] : [`${shown(file)}: ${problem}`]
		})

		expect(
			violations,
			`Деталь-кнопка без type="button" (см. docs/agents/a11y.md, «Третий набор: attrs…»):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
