import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src', import.meta.url))

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

	for (const [, name, value] of body.matchAll(/(--so-[\w-]+)\s*:\s*([^;]+);/g)) {
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
		lightness(tokenOf(tokens, `--so-${family}-${step}`)),
	)
}

/** Значение токена со ссылками `var(--so-…)`, раскрытыми до цвета. */
function resolved(tokens: Map<string, string>, name: string): string {
	const value = tokenOf(tokens, name)
	const link = value.match(/^var\(\s*(--so-[\w-]+)\s*\)$/)

	return link?.[1] ? resolved(tokens, link[1]) : value
}

/**
 * Относительная яркость цвета `#rgb` или `#rrggbb` по WCAG: канал байтом — в
 * линейный свет, как у sRGB. Такие литералы у темы — поверхность контрола и
 * ручка Switch светлой схемы, `#fff`.
 */
function luminanceOfHex(hex: string): number {
	const full = hex.length === 3 ? hex.replace(/./g, '$&$&') : hex
	const channel = (index: number) => {
		const unit = parseInt(full.slice(index * 2, index * 2 + 2), 16) / 255

		return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
	}

	return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}

/**
 * Относительная яркость цвета по WCAG. `oklch(L C H)` — тем путём, каким его
 * кладёт браузер: OKLab → линейный sRGB, доли за пределами охвата обрезаются.
 */
function luminanceOf(value: string): number {
	const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)

	if (hex?.[1]) return luminanceOfHex(hex[1])

	const match = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/)

	if (!match) throw new Error(`не oklch и не #rgb: ${value}`)

	const [L, C, H] = [Number(match[1]), Number(match[2]), Number(match[3])]
	const a = C * Math.cos((H * Math.PI) / 180)
	const b = C * Math.sin((H * Math.PI) / 180)
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
	const clip = (channel: number) => Math.min(1, Math.max(0, channel))
	const red = clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
	const green = clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
	const blue = clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)

	return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** Отношение контраста двух цветов по WCAG — от 1 до 21, порядок не важен. */
function contrast(first: string, second: string): number {
	const [a, b] = [luminanceOf(first), luminanceOf(second)]

	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Исходники стилей — `.scss` и `.css`, рекурсивно. */
function styleFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry)

		if (statSync(path).isDirectory()) return styleFiles(path)

		return /\.s?css$/.test(path) ? [path] : []
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
const sources = styleFiles(SRC).map((file) => ({
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
	"[data-so-theme='oren-dark']",
)

const light = declarations(lightBlock)
const dark = declarations(darkBlock)

describe('токены цветовых схем', () => {
	it('тёмная схема покрывает все ступени светлой', () => {
		const scaleTokens = (tokens: Map<string, string>) =>
			[...tokens.keys()].filter((name) => /^--so-\w+-\d+$/.test(name)).sort()

		expect(scaleTokens(dark)).toEqual(scaleTokens(light))
	})

	/**
	 * Опечатка в имени семантического токена не ломает сборку — он просто
	 * молча ни на что не влияет, и схема остаётся наполовину светлой.
	 */
	it('семантические токены тёмной схемы существуют в светлой', () => {
		const semantic = (tokens: Map<string, string>) =>
			[...tokens.keys()].filter((name) => name.startsWith('--so-component-'))

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
		expect(lightness(tokenOf(dark, '--so-neutral-50'))).toBeLessThan(0.3)
		expect(lightness(tokenOf(dark, '--so-neutral-800'))).toBeGreaterThan(0.7)
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

	/**
	 * Насыщенная заливка под белым текстом (`--so-component-solid-*`) заведена
	 * ради отношения: белый текст кегля `text-sm` на ней обязан держать 4,5:1
	 * (WCAG 1.4.3) в обеих схемах — на ней стоят подпись `filled` с вариантом
	 * у Button и пилюли тега, номер текущей страницы Pagination и выбранного
	 * дня Calendar, заголовок и описание тоста с видом. Середина хроматической
	 * шкалы этого не держит, и токен, переставленный на неё, молча сделал бы
	 * всё это нечитаемым. Состояния заливки темнее покоя (тень,
	 * `mixins/_solid.scss`), и белый на них держит не меньше — это сторожит
	 * браузер (`playground/vue/browser/solid-fill.spec.ts`). Чего тёмная схема
	 * не объявила, она берёт у светлой — как в браузере, где её блок лежит
	 * поверх `:root`: у нейтрали ступень одна на обе схемы.
	 */
	it.each(
		['светлая', 'тёмная'].flatMap((scheme) =>
			['accent', 'positive', 'caution', 'negative', 'neutral'].map((family) => [
				scheme,
				family,
			]),
		),
	)('%s схема: белый на насыщенной заливке %s — не ниже 4,5:1', (scheme, family) => {
		const tokens = scheme === 'светлая' ? light : new Map([...light, ...dark])
		const fill = resolved(tokens, `--so-component-solid-${family}`)

		expect(contrast(fill, '#fff')).toBeGreaterThanOrEqual(4.5)
	})

	/**
	 * Цвет семейства графикой на поверхности (`--so-component-graphic-*`)
	 * заведён ради отношения: отметка CheckBox и радио, заливка Slider и
	 * индикаторов выполнения, полоса под активным табом обязаны держать 3:1
	 * (WCAG 1.4.11) к тому, на чём стоят, — к странице и к поверхности
	 * контрола, в обеих схемах. Середина хроматической шкалы в светлой схеме
	 * этого не держит, и токен, переставленный на неё, молча сделал бы графику
	 * неразличимой. Вуаль поверх поверхностей — рельс Slider, дорожки
	 * индикаторов — и то, что каждое место берёт цвет из токена, сторожит
	 * браузер (`playground/vue/browser/graphic.spec.ts`). Поверхность контрола
	 * светлой схемы — литерал `#fff`, тёмной — ступень.
	 */
	it.each(
		['светлая', 'тёмная'].flatMap((scheme) =>
			['accent', 'positive', 'caution', 'negative', 'neutral'].flatMap((family) =>
				['--so-neutral-50', '--so-component-surface'].map((surface) => [
					scheme,
					family,
					surface,
				]),
			),
		),
	)('%s схема: графика %s к %s — не ниже 3:1', (scheme, family, surface) => {
		const tokens = scheme === 'светлая' ? light : new Map([...light, ...dark])
		const graphic = resolved(tokens, `--so-component-graphic-${family}`)

		expect(contrast(graphic, resolved(tokens, surface))).toBeGreaterThanOrEqual(3)
	})

	/**
	 * Включённая дорожка под ручкой (`--so-component-knob-track-*`) заведена
	 * ради отношения: ручка Switch (`--so-component-knob`) — графика, и на
	 * включённой дорожке ей нужно 3:1 (WCAG 1.4.11) в обеих схемах. Ручка у
	 * схем разная — белый литерал в светлой, светлая ступень в тёмной, — и
	 * ступень под ней тоже: середина шкалы под белой ручкой этого не держит, а
	 * цвет графики тёмной схемы под светлой ручкой — тем более. То, что
	 * дорожка в каждом варианте берёт цвет из токена, сторожит браузер
	 * (`playground/vue/browser/solid-fill.spec.ts`).
	 */
	it.each(
		['светлая', 'тёмная'].flatMap((scheme) =>
			['accent', 'positive', 'caution', 'negative', 'neutral'].map((family) => [
				scheme,
				family,
			]),
		),
	)('%s схема: ручка на включённой дорожке %s — не ниже 3:1', (scheme, family) => {
		const tokens = scheme === 'светлая' ? light : new Map([...light, ...dark])
		const track = resolved(tokens, `--so-component-knob-track-${family}`)

		expect(contrast(resolved(tokens, '--so-component-knob'), track)).toBeGreaterThanOrEqual(3)
	})
})

/**
 * Схему включает атрибут на корне документа или у области — его ставит
 * приложение: `<html data-so-theme="oren-dark">`. Корень документа общий с
 * приложением и другими библиотеками, и атрибут темы без префикса там часто
 * занят, поэтому он с префиксом `so-`, как атрибут режима движения (корневой
 * `AGENTS.md`, «Префикс — только в глобальном пространстве имён»).
 *
 * Объявляют схемы только файлы токенов: блок схемы в файле компонента — то,
 * что запрещает правило «В компонентных стилях не бывает блоков схемы»
 * (`AGENTS.md` пакета, «Номер ступени — это роль»).
 */
describe('схема — атрибутом с префиксом so-', () => {
	const TOKEN_FILES = ['tokens-dark.css', 'tokens.css']

	/** Селекторы блоков схем — тех, что объявляют браузеру `color-scheme`. */
	const schemeSelectors = sources
		.filter(({ name }) => TOKEN_FILES.includes(name))
		.flatMap(({ code }) =>
			[...code.matchAll(/([^{};]+)\{[^{}]*?(?<![\w-])color-scheme\s*:/g)].map(
				([, selector]) => selector.trim(),
			),
		)

	it('атрибут каждой схемы — с префиксом so-', () => {
		const attributes = schemeSelectors.flatMap((selector) =>
			[...selector.matchAll(/\[\s*([\w-]+)/g)].map(([, name]) => name),
		)

		// Схем две, и каждую включает атрибут: на пустом списке проверка ниже
		// прошла бы на любых стилях
		expect(schemeSelectors).toHaveLength(2)
		expect(attributes).toHaveLength(2)
		expect(attributes.filter((name) => !name.startsWith('data-so-'))).toEqual([])
	})

	it('атрибут схемы — только в файлах токенов', () => {
		const found = sources
			.filter(({ code }) => code.includes('data-so-theme'))
			.map(({ name }) => name)
			.sort()

		expect(found).toEqual(TOKEN_FILES)
	})
})

describe('компоненты не берут цвет мимо темы', () => {
	const TAILWIND_PALETTE =
		'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone'

	/**
	 * Палитра Tailwind живёт мимо `--so-*`, значит пакет темы её не видит:
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
	 * белым. Для этого есть `--so-component-surface` / `--so-component-knob`.
	 *
	 * `text-white` при этом законен: он лежит на насыщенной заливке под белым
	 * текстом (`--so-component-solid-*`, вид `filled` с вариантом у Button), а
	 * она в обеих схемах остаётся насыщенной.
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
 * Направление письма тема читает знаком строки — переменной `--so-dir-sign`,
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
		const sign = (selector: string) => propertyValues(block(rules, selector), '--so-dir-sign')

		expect(sign(':root')).toEqual(['1'])
		expect(sign("[dir='ltr']")).toEqual(['1'])
		expect(sign("[dir='rtl']")).toEqual(['-1'])
	})
})
