/**
 * Собирает `src/index.ts` из SVG-файлов рядом.
 *
 * SVG остаются исходником — их удобно править и смотреть глазами, — а
 * потребителю уходит обычный TS-модуль с данными. Прежний вариант
 * (`import './close.svg?raw'`) понимал только Vite: опубликуй пакет, и любой
 * потребитель на webpack или в Node получил бы ошибку разрешения модуля.
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

/** `check_indeterminate.svg` → `checkIndeterminate`. */
const toName = (file) =>
	file.replace(/\.svg$/, '').replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

/** Вытаскивает `viewBox` и содержимое корневого `<svg>`. */
function parse(svg, file) {
	const viewBox = svg.match(/\sviewBox="([^"]+)"/)?.[1]

	if (!viewBox) throw new Error(`${file}: нет атрибута viewBox`)

	const body = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1]

	if (body === undefined) throw new Error(`${file}: не найден корневой <svg>`)

	// `fill` из исходника убираем: цвет задаёт тема через currentColor,
	// иначе иконка не подхватит цвет текста
	return { viewBox, body: body.replace(/\sfill="#[0-9a-fA-F]{3,8}"/g, '').trim() }
}

const files = readdirSync(source)
	.filter((file) => file.endsWith('.svg'))
	.sort()

const entries = files.map((file) => {
	const { viewBox, body } = parse(readFileSync(join(source, file), 'utf8'), file)

	return `export const ${toName(file)}: TIconSource = {\n\tviewBox: '${viewBox}',\n\tbody: '${body.replace(/'/g, "\\'")}',\n}`
})

const output = `/**
 * СГЕНЕРИРОВАНО. Не править руками — правьте SVG рядом и запускайте
 * \`npm run generate --workspace=@soldy/icons-material\`.
 */

import type { TIconSource } from '@soldy/setup'

${entries.join('\n\n')}
`

writeFileSync(join(source, 'index.ts'), output)

console.log(`Собрано иконок: ${files.length}`)
