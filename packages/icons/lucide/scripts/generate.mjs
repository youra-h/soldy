/**
 * Собирает `src/index.ts` из SVG-файлов рядом.
 *
 * SVG остаются исходником — их удобно править и смотреть глазами, — а
 * потребителю уходит обычный TS-модуль с данными, как у пакета Material.
 *
 * Lucide рисует обводкой, и пакет остаётся линиями. Цвет иконки — лестница
 * (`docs/agents/theming.md`, «Пакеты иконок»): правило темы для места сильнее
 * цвета темы по умолчанию, а тот — цвета, с которым иконка загружена.
 * Загруженный цвет — покраска корня исходника (`stroke="currentColor"`, у
 * звезды ещё и `fill`), а корень снимается: его строит адаптер. Поэтому
 * покраска и обводка корня переезжают на группу вокруг рисунка, и каждый цвет
 * в ней — ссылка на цвет иконки темы с цветом исходника запасным значением:
 * `stroke="var(--so-icon-color, currentColor)"`. Тема задаёт цвет переменной
 * и не знает, что пакет рисует линией, а не заливкой, как Material.
 *
 * Ссылка — атрибутом представления, а не `style`: атрибут слабее любого
 * правила CSS, и тема, которой нужно сменить способ рисования (контур звезды
 * Rating в режиме принудительных цветов), пишет правило фигурам; `style` в
 * разметке ещё и блокирует политика безопасности без `'unsafe-inline'` для
 * стилей.
 *
 * Толщина обводки едина для пакета (`STROKE_WIDTH`): она стоит в каждом SVG, и
 * файл с другой генератор не примет.
 *
 * Результат закоммичен, дрейф ловится проверкой в CI (`npm run generate` не
 * должен менять файл).
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'src')

/** Переменная цвета иконки: её пишет тема, а читает рисунок. */
const ICON_COLOR = '--so-icon-color'

/** Толщина обводки пакета, в единицах `viewBox` 24×24. */
const STROKE_WIDTH = '1.5'

/** Атрибуты корня, которые рисуют: покраска и обводка. Порядок — порядок в группе. */
const DRAWING = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']

/** `check_indeterminate.svg` → `checkIndeterminate`. */
const toName = (file) =>
	file.replace(/\.svg$/, '').replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

const attributes = (text) =>
	Object.fromEntries(
		[...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]),
	)

/** Покраска: цвет — ссылкой на цвет иконки темы, `none` — как есть. */
const paint = (value) => (value === 'none' ? value : `var(${ICON_COLOR}, ${value})`)

/** Значение атрибута группы: покраска — ссылкой, остальное — как есть. */
const drawn = (name, value) => (name === 'fill' || name === 'stroke' ? paint(value) : value)

/**
 * Вытаскивает `viewBox`, а покраску и обводку корня переносит на группу вокруг
 * его содержимого — цвета ссылкой на цвет иконки темы.
 *
 * Корень с `fill="none"` — обычная иконка Lucide, рисунок — одна обводка.
 * Корень с заливкой — глиф, залитый целиком (звезда Rating): заливка под той же
 * обводкой, и силуэт тот же, что у контурной.
 */
function parse(svg, file) {
	const rootTag = svg.match(/<svg\b([^>]*)>/)?.[1]

	if (rootTag === undefined) throw new Error(`${file}: не найден корневой <svg>`)

	const rootAttributes = attributes(rootTag)

	if (!rootAttributes.viewBox) throw new Error(`${file}: нет атрибута viewBox`)
	if (rootAttributes['stroke-width'] !== STROKE_WIDTH) {
		throw new Error(
			`${file}: толщина обводки пакета — ${STROKE_WIDTH}, а не ${rootAttributes['stroke-width']}`,
		)
	}
	if (
		rootAttributes['stroke-linecap'] !== 'round' ||
		rootAttributes['stroke-linejoin'] !== 'round'
	) {
		throw new Error(`${file}: концы и стыки обводки Lucide — round`)
	}
	if (!rootAttributes.stroke || rootAttributes.stroke === 'none') {
		throw new Error(`${file}: у корня нет цвета обводки`)
	}

	const inner = svg.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)?.[1]

	if (inner === undefined) throw new Error(`${file}: не найден корневой <svg>`)

	// Разметка Lucide — элемент на строку: между тегами только отступы. Своя
	// покраска внутри — тоже ссылкой, иначе она прошла бы мимо темы
	const body = inner
		.trim()
		.replace(/>\s+</g, '><')
		.replace(/\s*\/>/g, '/>')
		.replace(/\s(fill|stroke)="([^"]*)"/g, (_, name, value) => ` ${name}="${paint(value)}"`)

	if (!body) throw new Error(`${file}: пустой рисунок`)

	const group = DRAWING.filter((name) => rootAttributes[name] !== undefined)
		.map((name) => ` ${name}="${drawn(name, rootAttributes[name])}"`)
		.join('')

	return { viewBox: rootAttributes.viewBox, body: `<g${group}>${body}</g>` }
}

const files = readdirSync(source)
	.filter((file) => file.endsWith('.svg'))
	.sort()

const entries = files.map((file) => {
	const { viewBox, body } = parse(readFileSync(join(source, file), 'utf8'), file)

	return `export const ${toName(file)}: TIconSource = {\n\tviewBox: '${viewBox}',\n\tbody: '${body.replace(/'/g, "\\'")}',\n}`
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
 * the star is filled. The root \`<svg>\` element is dropped together with its
 * size and class; its paint and stroke move to a group around the inner
 * markup, each color as a reference to the icon color of the theme with the
 * source color as the fallback (\`var(${ICON_COLOR}, currentColor)\`).
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
