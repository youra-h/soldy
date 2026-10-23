/**
 * Вычисленные стили частей soldy под двумя листами темы — прогон
 * `npm run compare:styles` (`styles-diff/cli.ts`), а не тест репозитория:
 * `test:layout` его не берёт, CI не гоняет.
 *
 * Стенд монтируется целиком (`renderStand`) и проходит по странице каждого
 * компонента каждого фреймворка из `--frameworks`: в шапке, меню и превью —
 * части soldy. Страница — с `browser/page.css` и без стилей стенда: как
 * приложение, у которого своя только типографика. На каждой странице в обеих
 * схемах лист «до» и лист «после» сменяют друг друга в одном и том же
 * `<style>`, и после каждой смены страница встаёт (`settle`): переходы
 * доиграны, анимации на паузе в начале. Узлы — одни и те же, поэтому
 * различие — это лист, а не новая отрисовка.
 *
 * Различия у узлов без класса — внутренних (поле Input, рисунок иконки) и
 * содержимого слотов — только в отчёте: какие из них внутренние, а какие —
 * разметка приложения, решает человек. Различие у узла `so-*` роняет
 * страницу, и сверяется оно при узлах без класса, приколотых к их стилю «до»
 * (`pin`): иначе содержимое слота, которому лист «до» давал другой шрифт
 * (`<code>` в подписи `Field` стенда), меняло бы ширину части, и страница
 * падала бы не на теме. Своё различие такого узла в отчёте остаётся.
 */

import { afterAll, describe, expect, inject, it } from 'vitest'
import { commands } from 'vitest/browser'
import { availableOf } from '../src/catalog'
import { isFramework, loadHost } from '../src/hosts'
import { router } from '../src/router'
import { renderStand } from '../browser/stand'
import { formatReport, formatSummary, type TPinNote, type TStyleDifference } from './report'
import {
	compareSnapshots,
	isLibraryNode,
	partNodes,
	pathOf,
	pin,
	settle,
	snapshotOf,
	type TNodeSnapshot,
} from './snapshot'

import '../browser/page.css'

const BEFORE = inject('stylesBefore')
const AFTER = inject('stylesAfter')
const FRAMEWORKS = inject('stylesFrameworks')
const OUT = inject('stylesOut')

/** Схемы темы — значение атрибута схемы на корне документа. */
const SCHEMES = [
	{ id: 'light', attribute: 'oren' },
	{ id: 'dark', attribute: 'oren-dark' },
] as const

/** Лист темы: «до» и «после» сменяют друг друга в нём. */
const sheet = document.createElement('style')

document.head.append(sheet)

/** Все различия прогона — для итога. */
const all: TStyleDifference[] = []

/** Снимки узлов под текущим листом. */
function snapshotAll(nodes: readonly Element[]): Map<Element, TNodeSnapshot> {
	return new Map(nodes.map((node) => [node, snapshotOf(node)]))
}

/** Сменить лист и дождаться, пока страница встанет. */
async function useSheet(css: string): Promise<void> {
	sheet.textContent = css

	await settle()
}

/** Различия страницы в схеме и сколько узлов без класса пришлось приколоть. */
async function compareScheme(
	page: string,
	scheme: string,
): Promise<{ found: TStyleDifference[]; pinned: number }> {
	await useSheet(BEFORE)

	const beforeNodes = partNodes()
	const before = snapshotAll(beforeNodes)

	await useSheet(AFTER)

	const afterNodes = partNodes()
	const after = snapshotAll(afterNodes)
	const found: TStyleDifference[] = []
	const record = (node: Element, pseudo: string, property: string, a: string, b: string) => {
		found.push({
			page,
			scheme,
			library: isLibraryNode(node),
			path: pathOf(node),
			pseudo,
			property,
			before: a,
			after: b,
		})
	}

	/**
	 * Сверить узлы одной группы: «до» против снимков `current`. Отдаёт узлы,
	 * у которых разошёлся свой стиль, — с их снимком «до».
	 */
	const compareGroup = (
		library: boolean,
		current: ReadonlyMap<Element, TNodeSnapshot>,
	): Map<Element, TNodeSnapshot> => {
		const changed = new Map<Element, TNodeSnapshot>()

		for (const [node, a] of before) {
			if (isLibraryNode(node) !== library) continue

			const b = current.get(node)

			if (!b) {
				record(node, '', '(узел)', 'есть', 'нет')
				continue
			}

			for (const { pseudo, difference } of compareSnapshots(a, b)) {
				record(node, pseudo, ...difference)

				if (pseudo === '') changed.set(node, a)
			}
		}

		for (const node of current.keys()) {
			if (isLibraryNode(node) === library && !before.has(node)) {
				record(node, '', '(узел)', 'нет', 'есть')
			}
		}

		return changed
	}

	const changed = compareGroup(false, after)

	if (changed.size === 0) {
		compareGroup(true, after)

		return { found, pinned: 0 }
	}

	const pinned = pin(changed)

	try {
		await settle()

		compareGroup(true, snapshotAll(partNodes().filter(isLibraryNode)))
	} finally {
		pinned.release()
	}

	return { found, pinned: pinned.count }
}

for (const framework of FRAMEWORKS) {
	if (!isFramework(framework)) throw new Error(`у стенда нет фреймворка «${framework}»`)

	const host = await loadHost(framework)

	describe(framework, () => {
		for (const entry of availableOf(host)) {
			const page = `${framework}/${entry.id}`

			it(page, async () => {
				sheet.textContent = BEFORE
				document.documentElement.dataset.soTheme = SCHEMES[0].attribute

				await router.push(`/${page}`)

				renderStand()

				await settle()

				const found: TStyleDifference[] = []
				const pins: TPinNote[] = []

				for (const scheme of SCHEMES) {
					document.documentElement.dataset.soTheme = scheme.attribute

					const result = await compareScheme(page, scheme.id)

					found.push(...result.found)
					pins.push({ page, scheme: scheme.id, count: result.pinned })
				}

				all.push(...found)
				await commands.stylesReport(formatReport(found, pins), OUT)

				const library = found.filter((difference) => difference.library)

				expect(library.length, `${page}: различия у узлов so-* — в отчёте выше`).toBe(0)
			})
		}
	})
}

afterAll(async () => {
	await commands.stylesReport(formatSummary(all), OUT)
})
