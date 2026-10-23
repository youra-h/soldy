/**
 * Собирает `src/index.ts` из SVG-файлов рядом.
 *
 * SVG остаются исходником — их удобно править и смотреть глазами, — а
 * потребителю уходит обычный TS-модуль с данными. Прежний вариант
 * (`import './close.svg?raw'`) понимал только Vite: опубликуй пакет, и любой
 * потребитель на webpack или в Node получил бы ошибку разрешения модуля.
 *
 * Цвет иконки — лестница (`docs/agents/theming.md`, «Пакеты иконок»): правило
 * темы для места сильнее цвета темы по умолчанию, а тот — цвета, с которым
 * иконка загружена. Загруженный цвет — `fill` корня исходника (`#1f1f1f`), а
 * корень снимается: его строит адаптер. Поэтому покраска корня переезжает на
 * группу вокруг рисунка, и цвет в ней — ссылка на цвет иконки темы с цветом
 * исходника запасным значением: `fill="var(--so-icon-color, #1f1f1f)"`. Без
 * темы иконка цвета исходника, а тема задаёт цвет переменной и не знает,
 * рисует пакет заливкой или линией.
 *
 * Ссылка — атрибутом представления, а не `style`. Атрибут слабее любого
 * правила CSS: тема, которой нужно сменить способ рисования (контур звезды
 * Rating в режиме принудительных цветов), пишет правило фигурам, а `style` в
 * разметке перебил бы его. И `style` в разметке блокирует политика
 * безопасности без `'unsafe-inline'` для стилей — иконка осталась бы чёрной.
 *
 * Результат закоммичен, как сгенерированные метаданные Angular: так монорепа
 * работает без предварительной сборки, а дрейф ловится проверкой в CI
 * (`npm run generate` не должен менять файл).
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'src')

/** Переменная цвета иконки: её пишет тема, а читает рисунок. */
const ICON_COLOR = '--so-icon-color'

/** `check_indeterminate.svg` → `checkIndeterminate`. */
const toName = (file) =>
	file.replace(/\.svg$/, '').replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

const attributes = (text) =>
	Object.fromEntries(
		[...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]),
	)

/** Покраска: цвет — ссылкой на цвет иконки темы, `none` — как есть. */
const paint = (value) => (value === 'none' ? value : `var(${ICON_COLOR}, ${value})`)

/**
 * Вытаскивает `viewBox`, а покраску корня переносит на группу вокруг его
 * содержимого — ссылкой на цвет иконки темы.
 */
function parse(svg, file) {
	const rootTag = svg.match(/<svg\b([^>]*)>/)?.[1]

	if (rootTag === undefined) throw new Error(`${file}: не найден корневой <svg>`)

	const { viewBox, fill, stroke } = attributes(rootTag)

	if (!viewBox) throw new Error(`${file}: нет атрибута viewBox`)

	const painted = Object.entries({ fill, stroke }).filter(([, value]) => value !== undefined)

	// Без цвета у корня иконке нечего назвать загруженным цветом: она взяла бы
	// умолчание SVG
	if (!painted.some(([, value]) => value !== 'none')) {
		throw new Error(`${file}: у корня нет цвета — ни fill, ни stroke`)
	}

	const inner = svg.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)?.[1]

	if (inner === undefined) throw new Error(`${file}: не найден корневой <svg>`)

	// Своя покраска внутри — тоже ссылкой: иначе она прошла бы мимо темы
	const body = inner
		.trim()
		.replace(/\s(fill|stroke)="([^"]*)"/g, (_, name, value) => ` ${name}="${paint(value)}"`)
	const group = painted.map(([name, value]) => ` ${name}="${paint(value)}"`).join('')

	return { viewBox, body: `<g${group}>${body}</g>` }
}

const files = readdirSync(source)
	.filter((file) => file.endsWith('.svg'))
	.sort()

const entries = files.map((file) => {
	const { viewBox, body } = parse(readFileSync(join(source, file), 'utf8'), file)

	return `export const ${toName(file)}: TIconSource = {\n\tviewBox: '${viewBox}',\n\tbody: '${body.replace(/'/g, "\\'")}',\n}`
})

/**
 * Происхождение иконок. SVG рядом — Material Symbols от Google под Apache-2.0,
 * а она требует от изменённого файла сказать, что его изменили. Шапка уезжает
 * и в `dist/index.js`: комментарий с пометкой `@license` сборка пакета и
 * минификаторы потребителя по умолчанию сохраняют, а комментарий без неё — как
 * пометка «СГЕНЕРИРОВАНО» ниже — до `dist` не доезжает. Текст английский: его
 * читает потребитель пакета, как README.
 */
const origin = `/**
 * @license
 * The icons are Material Symbols by Google (https://fonts.google.com/icons),
 * © Google, licensed under the Apache License, Version 2.0. The license text
 * ships with this package as LICENSE-Apache-2.0.
 *
 * Changes to the source SVG files: the root \`<svg>\` element is dropped together
 * with its size, and its \`fill\` moves to a group around the inner markup as a
 * reference to the icon color of the theme with the source color as the
 * fallback (\`var(${ICON_COLOR}, #1f1f1f)\`); the inner markup may rotate the
 * source glyph with a \`transform\`.
 */`

const output = `${origin}

/**
 * СГЕНЕРИРОВАНО. Не править руками — правьте SVG рядом и запускайте
 * \`npm run generate --workspace=@soldy-ui/icons-material\`.
 */

import type { TIconSource } from '@soldy-ui/setup'

${entries.join('\n\n')}
`

writeFileSync(join(source, 'index.ts'), output)

console.log(`Собрано иконок: ${files.length}`)
