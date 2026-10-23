import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

/**
 * Движение в теме oren — только надстройкой (`src/mixins/_motion.scss`).
 *
 * Режим движения у библиотеки один (корневой `AGENTS.md`, «Движение: один
 * режим на библиотеку»): по умолчанию — настройка системы
 * `prefers-reduced-motion`, а приложение задаёт свой атрибутом `data-so-motion`
 * на корне документа. Тема исполняет его воротами — парой селекторов, и oren
 * пишет их одним миксином `motion.allowed`: покой — база, движение —
 * надстройка.
 *
 * Сторожей двое. Что движение в собранном CSS стоит только в надстройке и
 * условие режима — только в её форме, проверяет общий слой у каждой темы
 * (`packages/themes/base/__tests__/motion.spec.ts`). Здесь — решение oren:
 * медиазапрос движения и атрибут режима есть в исходниках только в самом
 * миксине, копия условия в файле компонента разошлась бы с ним.
 */

const ROOT = resolve(import.meta.dirname, '..')
const SRC = join(ROOT, 'src')

/** Файл надстройки — единственное место условия движения в исходниках. */
const MOTION_MIXIN = 'mixins/_motion.scss'

/** Источники стилей без комментариев. */
function styleFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry)

		if (statSync(path).isDirectory()) return styleFiles(path)

		return /\.s?css$/.test(path) ? [path] : []
	})
}

const sources = styleFiles(SRC).map((file) => ({
	name: relative(SRC, file).split('\\').join('/'),
	code: readFileSync(file, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/.*$/gm, ''),
}))

describe('движение — исходники', () => {
	it.each(['prefers-reduced-motion', 'data-so-motion'])(
		'%s — только в миксине надстройки',
		(word) => {
			const found = sources.filter(({ code }) => code.includes(word)).map(({ name }) => name)

			expect(found).toEqual([MOTION_MIXIN])
		},
	)
})
