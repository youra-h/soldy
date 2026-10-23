/**
 * Собирает `src/index.ts` из SVG-файлов рядом.
 *
 * SVG остаются исходником — их удобно править и смотреть глазами, — а
 * потребителю уходит обычный TS-модуль с данными, как у пакета Material.
 *
 * Lucide рисует обводкой (`stroke`), а тема красит глиф заливкой (`fill`):
 * отметку CheckBox — цветом варианта в `fill`, звезду Rating — `fill` двух
 * слоёв. Обводка от такой покраски уходила бы мимо — галка цвета текста, а не
 * варианта. Поэтому обводка здесь переводится в контур: иконка становится
 * одним залитым `path`, как у Material, и тема красит её тем же правилом.
 * Толщина обводки при этом запекается в контур — она едина для пакета
 * (`STROKE_WIDTH`), и файл с другой генератор не примет.
 *
 * Результат закоммичен, дрейф ловится проверкой в CI (`npm run generate` не
 * должен менять файл). Поэтому `paper` и `paperjs-offset` в корневом манифесте
 * стоят точной версией: другая версия может посчитать контур иначе.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Генератору от `paper` нужна только геометрия. Окружение paper берёт из
// глобального `self`, а без него в Node ищет jsdom — в репозитории он есть — и
// тогда требует пакет `canvas` для рисования, которого здесь нет. Поэтому
// окружение без DOM задаётся до загрузки, и импорт — динамический
globalThis.self = { navigator: { userAgent: `Node.js (${process.platform})` } }

const { default: paper } = await import('paper')
const { PaperOffset } = await import('paperjs-offset')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'src')

/** Толщина обводки пакета, в единицах `viewBox` 24×24. */
const STROKE_WIDTH = '1.5'

/** Знаков после запятой в координатах контура. */
const PRECISION = 3

paper.setup(new paper.Size(24, 24))

/** `check_indeterminate.svg` → `checkIndeterminate`. */
const toName = (file) =>
	file.replace(/\.svg$/, '').replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

const attributes = (text) =>
	Object.fromEntries(
		[...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]),
	)

/** Фигура элемента SVG — путём `paper`. Других элементов в Lucide нет. */
function toShape(tag, attrs, file) {
	const n = (name) => Number(attrs[name] ?? 0)

	switch (tag) {
		case 'path':
			return new paper.CompoundPath({ pathData: attrs.d, insert: false })
		case 'circle':
			return new paper.Path.Circle({
				center: [n('cx'), n('cy')],
				radius: n('r'),
				insert: false,
			})
		case 'rect':
			return new paper.Path.Rectangle({
				rectangle: [n('x'), n('y'), n('width'), n('height')],
				radius: n('rx'),
				insert: false,
			})
		case 'line':
			return new paper.Path.Line({
				from: [n('x1'), n('y1')],
				to: [n('x2'), n('y2')],
				insert: false,
			})
		default:
			throw new Error(`${file}: элемент <${tag}> генератор не умеет`)
	}
}

/**
 * Вытаскивает `viewBox` и переводит рисунок в один залитый контур.
 *
 * Корень с `fill="none"` — обычная иконка Lucide, контур — только обводка.
 * Корень с заливкой — глиф, залитый целиком (звезда Rating): к обводке
 * добавляется внутренность фигуры, и силуэт остаётся тем же, что у контурной.
 */
function parse(svg, file) {
	const rootTag = svg.match(/<svg\b([^>]*)>/)?.[1]

	if (rootTag === undefined) throw new Error(`${file}: не найден корневой <svg>`)

	const root = attributes(rootTag)

	if (!root.viewBox) throw new Error(`${file}: нет атрибута viewBox`)
	if (root['stroke-width'] !== STROKE_WIDTH) {
		throw new Error(
			`${file}: толщина обводки пакета — ${STROKE_WIDTH}, а не ${root['stroke-width']}`,
		)
	}
	if (root['stroke-linecap'] !== 'round' || root['stroke-linejoin'] !== 'round') {
		throw new Error(`${file}: концы и стыки обводки Lucide — round`)
	}

	const filled = root.fill !== 'none'
	const body = svg.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1]
	let outline = null
	const add = (shape) => (outline = outline ? outline.unite(shape, { insert: false }) : shape)

	for (const [, tag, rest] of body.matchAll(/<(\w+)\b([^>]*)>/g)) {
		const shape = toShape(tag, attributes(rest), file)
		const parts = shape instanceof paper.CompoundPath ? shape.children.slice() : [shape]

		for (const part of parts) {
			add(
				PaperOffset.offsetStroke(part, Number(STROKE_WIDTH) / 2, {
					cap: 'round',
					join: 'round',
					insert: false,
				}),
			)
		}

		if (filled) add(shape)
	}

	if (!outline) throw new Error(`${file}: пустой рисунок`)

	return { viewBox: root.viewBox, body: `<path d="${outline.getPathData(null, PRECISION)}"/>` }
}

const files = readdirSync(source)
	.filter((file) => file.endsWith('.svg'))
	.sort()

const entries = files.map((file) => {
	const { viewBox, body } = parse(readFileSync(join(source, file), 'utf8'), file)

	return `export const ${toName(file)}: TIconSource = {\n\tviewBox: '${viewBox}',\n\tbody: '${body}',\n}`
})

/**
 * Происхождение иконок. SVG рядом — Lucide под ISC, часть глифов Lucide взяла
 * из Feather под MIT; обе требуют сохранить уведомление об авторских правах.
 * Шапка уезжает и в `dist/index.js`: комментарий с пометкой `@license` сборка
 * пакета и минификаторы потребителя по умолчанию сохраняют. Текст английский:
 * его читает потребитель пакета, как README.
 */
const origin = `/**
 * @license
 * The icons are Lucide (https://lucide.dev), © Lucide Icons and Contributors,
 * licensed under the ISC License; the icons Lucide derives from Feather are
 * © Cole Bemis, licensed under the MIT License. The license texts ship with
 * this package as LICENSE-ISC.
 *
 * Changes to the source SVG files: the stroke width is ${STROKE_WIDTH} instead of 2, and
 * the stroke is converted to a filled outline — an icon is kept as its
 * \`viewBox\` and a single path that takes the color of the text
 * (\`currentColor\`); the star is filled.
 */`

const output = `${origin}

/**
 * СГЕНЕРИРОВАНО. Не править руками — правьте SVG рядом и запускайте
 * \`npm run generate --workspace=@soldy-ui/icons-lucide\`.
 */

import type { TIconSource } from '@soldy-ui/setup'

${entries.join('\n\n')}
`

writeFileSync(join(source, 'index.ts'), output)

console.log(`Собрано иконок: ${files.length}`)
