import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src', import.meta.url))
const SETUP = fileURLToPath(new URL('../setup', import.meta.url))

/**
 * Комментарии выкусываются ДО разбора, иначе объяснения в шапках файлов
 * (в них встречаются примеры объявлений) прочитались бы как токены.
 */
function stripComments(css: string): string {
	return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Тело блока по селектору — со счётчиком скобок, чтобы не поймать соседний. */
function block(css: string, selector: string): string {
	const start = css.indexOf(selector)
	expect(start, `селектор ${selector} не найден`).toBeGreaterThanOrEqual(0)

	const open = css.indexOf('{', start)
	let depth = 0

	for (let i = open; i < css.length; i++) {
		if (css[i] === '{') depth++
		if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
	}

	throw new Error(`не закрыт блок ${selector}`)
}

function declarations(body: string): Map<string, string> {
	const map = new Map<string, string>()

	for (const [, name, value] of body.matchAll(/(--s-[\w-]+)\s*:\s*([^;]+);/g)) {
		map.set(name, value.trim())
	}

	return map
}

/**
 * Значения обычного свойства в теле блока — все, сколько объявлено. Имя не
 * должно быть хвостом другого: `--x-color-scheme` — не `color-scheme`.
 */
function propertyValues(body: string, name: string): string[] {
	return [...body.matchAll(new RegExp(`(?<![\\w-])${name}\\s*:\\s*([^;]+);`, 'g'))].map(
		([, value]) => value.trim(),
	)
}

/** Значение токена; без токена мерить нечего — падаем с его именем. */
function tokenOf(tokens: Map<string, string>, name: string): string {
	const value = tokens.get(name)

	if (value === undefined) throw new Error(`нет ${name}`)

	return value
}

/** Светлота из oklch(L C H) — первое число. */
function lightness(value: string): number {
	const match = value.match(/oklch\(\s*([\d.]+)/)

	if (!match) throw new Error(`не oklch: ${value}`)

	return Number(match[1])
}

function scaleOf(tokens: Map<string, string>, family: string): number[] {
	return [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) =>
		lightness(tokenOf(tokens, `--s-${family}-${step}`)),
	)
}

/** Файлы с расширением из `extension`, рекурсивно. */
function filesOf(dir: string, extension: RegExp): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry)

		if (statSync(path).isDirectory()) return filesOf(path, extension)

		return extension.test(path) ? [path] : []
	})
}

/**
 * Все стили темы кодом без комментариев — общий вход для запретов на уровне
 * исходников. Весь `src`, а не только компоненты: токены и утилиты в `.css`
 * попадают в ту же сборку.
 *
 * Комментарии выкусываются не для скорости: в них лежат объяснения этих самых
 * запретов, и сканер поймал бы их как нарушения. Ровно та же ловушка, что и у
 * сканера Tailwind, который читает комментарии и генерирует утилиты по
 * упомянутым в них именам.
 */
const sources = filesOf(SRC, /\.s?css$/).map((file) => ({
	name: relative(SRC, file),
	code: readFileSync(file, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, ''),
}))

function scan(pattern: RegExp): string[] {
	return sources.flatMap(({ name, code }) =>
		[...code.matchAll(pattern)].map(([match]) => `${name}: ${match}`),
	)
}

const FAMILIES = ['accent', 'positive', 'negative', 'caution', 'neutral']

const lightBlock = block(stripComments(readFileSync(join(SRC, 'tokens.css'), 'utf8')), ':root,')
const darkBlock = block(
	stripComments(readFileSync(join(SRC, 'tokens-dark.css'), 'utf8')),
	"[data-theme='oren-dark']",
)

const light = declarations(lightBlock)
const dark = declarations(darkBlock)

describe('токены цветовых схем', () => {
	it('тёмная схема покрывает все ступени светлой', () => {
		const scaleTokens = (tokens: Map<string, string>) =>
			[...tokens.keys()].filter((name) => /^--s-\w+-\d+$/.test(name)).sort()

		expect(scaleTokens(dark)).toEqual(scaleTokens(light))
	})

	/**
	 * Опечатка в имени семантического токена не ломает сборку — он просто
	 * молча ни на что не влияет, и схема остаётся наполовину светлой.
	 */
	it('семантические токены тёмной схемы существуют в светлой', () => {
		const semantic = (tokens: Map<string, string>) =>
			[...tokens.keys()].filter((name) => name.startsWith('--s-component-'))

		for (const name of semantic(dark)) {
			expect(semantic(light), `${name} не объявлен в светлой схеме`).toContain(name)
		}
	})

	/**
	 * Главный инвариант всей затеи: номер ступени — это роль (расстояние от
	 * поверхности), а не светлота. В светлой схеме шкала идёт вниз по
	 * светлоте, в тёмной — вверх. Сломай это — и вся арифметика
	 * «hover = ступень + 100» в миксинах поедет в обратную сторону.
	 */
	it.each(FAMILIES)('светлая схема: шкала %s темнеет от 50 к 950', (family) => {
		const scale = scaleOf(light, family)

		for (let i = 1; i < scale.length; i++) {
			expect(scale[i], `ступень ${i} светлее предыдущей`).toBeLessThan(scale[i - 1])
		}
	})

	it.each(FAMILIES)('тёмная схема: шкала %s светлеет от 50 к 950', (family) => {
		const scale = scaleOf(dark, family)

		for (let i = 1; i < scale.length; i++) {
			expect(scale[i], `ступень ${i} темнее предыдущей`).toBeGreaterThan(scale[i - 1])
		}
	})

	/** Поверхность обязана быть тёмной, текст — светлым, иначе схема не тёмная. */
	it('в тёмной схеме поверхность темнее текста', () => {
		expect(lightness(tokenOf(dark, '--s-neutral-50'))).toBeLessThan(0.3)
		expect(lightness(tokenOf(dark, '--s-neutral-800'))).toBeGreaterThan(0.7)
	})

	/**
	 * Токены красят только то, что рисует тема. Полосы прокрутки, нативные поля
	 * и системные цвета браузер рисует сам и схему берёт из `color-scheme`, а не
	 * из токенов: без него в тёмной схеме полосы у списка Select и содержимого
	 * Popover оставались светлыми. Объявление — в блоке самой схемы, рядом с её
	 * токенами: вложенная область другой схемы переключает и то и другое.
	 */
	it.each([
		['светлая', 'light', lightBlock],
		['тёмная', 'dark', darkBlock],
	])('%s схема сообщает браузеру свою схему: color-scheme %s', (_, value, body) => {
		expect(propertyValues(body, 'color-scheme')).toEqual([value])
	})
})

describe('компоненты не берут цвет мимо темы', () => {
	const TAILWIND_PALETTE =
		'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone'

	/**
	 * Палитра Tailwind живёт мимо `--s-*`, значит пакет темы её не видит:
	 * такой цвет одинаков во всех темах и во всех цветовых схемах.
	 */
	it('не используют палитру Tailwind вместо шкалы темы', () => {
		expect(
			scan(
				new RegExp(
					`\\b(?:bg|text|border|border-[trbl]|fill|stroke|ring|outline|divide|from|via|to)-(?:${TAILWIND_PALETTE})-\\d{2,3}\\b`,
					'g',
				),
			),
		).toEqual([])
	})

	/**
	 * `border-s` у Tailwind — это `border-inline-start`, поэтому утилита
	 * вида border-s-<семейство>-<ступень> разбирается им как «левая граница
	 * цветом из ПАЛИТРЫ TAILWIND» и лишней строкой перекрывает наш цвет
	 * слева. Ловится плохо: в светлой схеме два серых почти совпадают.
	 *
	 * Проверяем и интерполяцию в миксинах, и литерал в стилях.
	 */
	it('не пишут цвет границы через border-s-, который Tailwind понимает как inline-start', () => {
		// Цифра после дефиса — это ширина (border-s-2), она законна.
		// Всё остальное на этом месте — цвет, а значит коллизия.
		expect(scan(/border-[se]-(?!\d)\S*/g)).toEqual([])
	})

	/**
	 * Белый фон не инвертируется вместе со шкалой и в тёмной схеме остался бы
	 * белым. Для этого есть `--s-component-surface` / `--s-component-knob`.
	 *
	 * `text-white` при этом законен: он лежит на насыщенной заливке
	 * (вид `filled` у Button), а середина хроматических шкал в обеих схемах
	 * остаётся насыщенной.
	 */
	it('не заливают фон белым или чёрным в обход токена', () => {
		expect(scan(/\bbg-(?:white|black)\b/g)).toEqual([])
	})
})

/**
 * ARIA — контракт со скринридером, `data-*` — с темой (корневой `AGENTS.md`,
 * «CSS не стилизуется по `aria-*`»). Селектор по ARIA-атрибуту молча
 * перестаёт срабатывать, как только атрибут переезжает на другой элемент или
 * уступает место нативному: так однажды перестали раскрываться панели
 * Accordion. Состояние тема читает из `data-*` — `data-selected`,
 * `data-disabled` и соседей.
 */
describe('тема не стилизуется по aria-*', () => {
	/** Пробелы после скобки селектору не мешают, поэтому ловятся и они. */
	it('нет селекторов по атрибуту aria-*', () => {
		expect(scan(/\[\s*aria-[^\]]*\]?/g)).toEqual([])
	})

	/**
	 * Вариант Tailwind компилируется в тот же селектор по атрибуту. Две формы:
	 * вариант в цепочке утилиты внутри `@apply` — в том числе составной (с
	 * `group-`, `peer-`, `not-` впереди) и с произвольным значением в скобках —
	 * и директива `@variant`.
	 */
	it('нет вариантов Tailwind aria-*', () => {
		expect(scan(/(?<![\w$.#%-])(?:[a-z][\w-]*-)?aria-[^\s:;{}]*:/g)).toEqual([])
		expect(scan(/@variant\s+(?:[a-z][\w-]*-)?aria-/g)).toEqual([])
	})
})

/**
 * Та же граница с другой стороны: нативный атрибут `disabled` есть не у
 * каждого тега, ядро ставит его только тегам из своего списка, а остальным
 * пишет ARIA-дубль. Обе половины решает тег и переезжают вместе с ним —
 * селектор по ним перестал бы срабатывать так же молча. Строку таба, например,
 * рисует Button, и достаточно сменить ему тег, чтобы исключение из hover
 * отвалилось. Поэтому то же состояние ядро дублирует в `data-disabled` на
 * любом теге, и тема читает только его.
 *
 * Запрет — на селектор по атрибуту. Псевдокласс им не задет и остаётся
 * законным: у вложенного поля Input, CheckBox и Switch тег фиксирован, у
 * фиксированного тега условия «есть ли атрибут» нет (корневой `AGENTS.md`,
 * «Третий набор: `attrs`»).
 */
describe('тема не стилизуется по нативному disabled', () => {
	/** Пробелы после скобки селектору не мешают, поэтому ловятся и они. */
	it('нет селекторов по атрибуту disabled', () => {
		expect(scan(/\[\s*disabled[^\]]*\]?/g)).toEqual([])
	})
})

/**
 * Направление письма тема читает знаком строки — переменной `--s-dir-sign`,
 * которую задают правила `direction.css`, а наследование доносит до блока от
 * ближайшего `dir` (`AGENTS.md` пакета, «Ловушка сборки»). Селектор по атрибуту
 * у предка ближайшего `dir` не видит: блок с `direction="ltr"` в RTL-предке
 * получал зеркало RTL — так было у стрелок Scroller и Calendar, бега
 * ProgressLinear, выезда Drawer и маски ряда тегов. `:dir()` ближайший видит,
 * но сборка переписывает его в список языков, и правило перестаёт зависеть от
 * `dir` вовсе.
 */
describe('направление письма — знаком строки, а не селектором', () => {
	/** Пробелы после скобки селектору не мешают, поэтому ловятся и они. */
	it('селектор по атрибуту dir — только в правилах знака', () => {
		expect(
			scan(/\[\s*dir\b[^\]]*\]?/g).filter((hit) => !hit.startsWith('direction.css: ')),
		).toEqual([])
	})

	it('нет :dir()', () => {
		expect(scan(/:dir\(/g)).toEqual([])
	})

	/** Без правил знака переменная пуста, и каждое зеркало темы — тоже. */
	it('знак задан странице без dir и обоим направлениям', () => {
		const rules = stripComments(readFileSync(join(SRC, 'direction.css'), 'utf8'))
		const sign = (selector: string) => propertyValues(block(rules, selector), '--s-dir-sign')

		expect(sign(':root')).toEqual(['1'])
		expect(sign("[dir='ltr']")).toEqual(['1'])
		expect(sign("[dir='rtl']")).toEqual(['-1'])
	})
})

/**
 * Свои переменные тема называет одной схемой — `--s-*` (`AGENTS.md` пакета,
 * «Тесты»). Переменная наследуется по DOM, и одноимённая переменная
 * приложения у предка подменяет ту, которую тема на узле ещё не объявила.
 * Так было у геометрии Tabs: её пишет поведение темы, и только после замера,
 * а до него — в серверной разметке, в первом кадре, без `useTheme` — список
 * брал `--gap-size` и `--active-tab-size` приложения: линия `outline` рвалась
 * у начала списка, а под табами вставала полоса. Префикс поэтому у всей
 * категории, а не у имён, которые уже протекли.
 *
 * Кроме своих, в стилях стоят имена библиотеки `--so-*` — их пишут ядро и
 * плагины, а тема читает, это контракт с ней, — и Tailwind: шаг `--spacing`,
 * скругления `--radius-*`, кегли `--text-*` и цвета `--color-*`, в которых
 * `@theme inline` регистрирует токены темы. Новое пространство имён Tailwind
 * вносится в список явно.
 */
const TAILWIND_NAMES = /^--(?:spacing$|radius-|text-|color-)/

/** Имя своей схемы, схемы библиотеки или из пространства имён Tailwind. */
function inScheme(name: string): boolean {
	return name.startsWith('--s-') || name.startsWith('--so-') || TAILWIND_NAMES.test(name)
}

/** Где стоит имя: три места в стилях и строка в поведении темы. */
type TPlace = 'чтение' | 'объявление' | 'регистрация' | 'поведение'

type TVariable = { readonly file: string; readonly place: TPlace; readonly name: string }

/**
 * Имя переменной в стилях — вместе с интерполяцией Sass: у
 * `--s-#{$block}-height` схему видно по началу, а имя, которое начинается
 * интерполяцией, схемы не показывает, и сторож его не пропустит.
 */
const NAME = String.raw`--(?:[\w-]|#\{[^}]*\})+`

/**
 * Места имени переменной в стилях. Модификатор класса пишется так же
 * (`.so-drawer--placement-bottom:has(…)`, `&--size-#{$size}`), но стоит в
 * селекторе, а не в этих местах, и переменной сторож его не считает.
 */
const STYLE_PLACES: ReadonlyArray<{ readonly place: TPlace; readonly pattern: RegExp }> = [
	// `var(--x)` и запись Tailwind в `@apply`: `ring-(--x)`, `ring-(length:--x)`
	{
		place: 'чтение',
		pattern: new RegExp(String.raw`(?:\bvar\(\s*|-\((?:[a-z-]+:)?)(${NAME})`, 'g'),
	},
	// Начало инструкции — с новой строки или после `;` и скобки блока, а не
	// интерполяции Sass: за `#{$this}` в `#{$this}--shape-rect` идёт
	// модификатор, — и произвольное свойство Tailwind в `@apply`: `[--x:…]`
	{
		place: 'объявление',
		pattern: new RegExp(String.raw`(?:^|[;[]|(?<!#)\{|(?<!#\{[^{}]*)\})\s*(${NAME})`, 'gm'),
	},
	{ place: 'регистрация', pattern: new RegExp(String.raw`@property\s+(${NAME})`, 'g') },
]

/**
 * Поведение темы (`setup/`) пишет переменные строкой — константой имени или
 * аргументом `setProperty`. Код — без комментариев; `//` после `:` — адрес в
 * строке, а не комментарий.
 */
const behaviour = filesOf(SETUP, /\.ts$/).map((file) => ({
	name: relative(SETUP, file),
	code: readFileSync(file, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/(^|[^:])\/\/.*$/gm, '$1'),
}))

/** Строка, которая начинается с `--` и буквы: переменная или модификатор класса. */
const QUOTED = /['"`](--[a-zA-Z][\w-]*)/g

/**
 * Место модификатора класса — сразу перед строкой: первый аргумент метода
 * `TClasses` (`classes.add('--ready-animation')`) или значение ключа его
 * `swap` и `swapClass`. Так же различает их сторож переменных библиотеки
 * (`packages/setup/__tests__/css-variable-prefix.spec.ts`).
 */
const CLASS_MODIFIER_PLACE =
	/(?:\b_?classes\.(?:add|remove|toggle|has|get|resolve)\(|\b(?:prefix|oldClass|newClass)\s*:)\s*$/

const variables: TVariable[] = [
	...sources.flatMap(({ name: file, code }) =>
		STYLE_PLACES.flatMap(({ place, pattern }) =>
			[...code.matchAll(pattern)].map(
				(match): TVariable => ({ file, place, name: match[1] }),
			),
		),
	),
	...behaviour.flatMap(({ name, code }) =>
		[...code.matchAll(QUOTED)]
			.filter((match) => !CLASS_MODIFIER_PLACE.test(code.slice(0, match.index)))
			.map(
				(match): TVariable => ({
					file: join('setup', name),
					place: 'поведение',
					name: match[1],
				}),
			),
	),
]

describe('переменные темы — своей схемой', () => {
	const namesAt = (place: TPlace) =>
		new Set(variables.filter((variable) => variable.place === place).map(({ name }) => name))

	it('сканер видит стили и поведение темы и имя в каждом месте', () => {
		// Пустой список прошёл бы проверку ниже на любом коде
		expect(sources.length).toBeGreaterThan(50)
		expect(behaviour.length).toBeGreaterThan(3)

		// Чтение — `var()` и запись Tailwind в `@apply`
		expect(namesAt('чтение')).toContain('--spacing')
		expect(namesAt('чтение')).toContain('--s-slider-halo-color')
		// Объявление — в `.css` и в Sass, а имя с интерполяцией — целиком:
		// обрывай его регулярка на `#{`, имя, которое интерполяцией начинается,
		// сторож не увидел бы вовсе
		expect(namesAt('объявление')).toContain('--s-dir-sign')
		expect(namesAt('объявление')).toContain('--s-#{$block}-height')
		expect(namesAt('регистрация')).toContain('--so-swipe-offset')
		// Константа имени и аргумент `setProperty`: место модификатора, которое
		// их глотает, стерегло бы пустоту
		expect(namesAt('поведение')).toContain('--s-table-head-height')
		expect(namesAt('поведение')).toContain('--s-tabs-active-pos')
	})

	it('модификатор класса — не переменная: ни в селекторе, ни у метода TClasses', () => {
		const names = new Set(variables.map(({ name }) => name))

		// `.so-drawer--placement-bottom:has(…)` в стилях
		expect(names).not.toContain('--placement-bottom')
		// `#{$this}--shape-rect &` в стилях: скобка интерполяции — не конец блока
		expect(names).not.toContain('--shape-rect')
		// `.so-tabs--ready-animation` в стилях, `classes.add('--ready-animation')` в поведении
		expect(names).not.toContain('--ready-animation')
	})

	it('имя каждой переменной — своё --s-*, библиотеки --so-* или Tailwind', () => {
		const violations = variables
			.filter(({ name }) => !inScheme(name))
			.map(({ file, place, name }) => `${file} (${place}): ${name}`)

		expect(
			violations,
			'Своя переменная темы начинается с --s- (AGENTS.md пакета, «Тесты»): одноимённая ' +
				'переменная приложения у предка подменила бы её. Чужие — библиотеки --so- и ' +
				'Tailwind из списка TAILWIND_NAMES',
		).toEqual([])
	})
})
