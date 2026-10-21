/**
 * Запись компонентов в разметке: `so-…` — всегда атрибут, своих тегов у
 * адаптера нет. Записей две, и выбирает её то, есть ли у компонента узел,
 * которому положено написанное на нём:
 *
 * - есть — корень: компонент Angular, атрибутом на обычном теге
 *   (`<button so-button>`, `<div so-input>`). Менеджер тостов своей коробки не
 *   имеет, а пишется так же (`<div so-toasts>`): написанное на нём положено
 *   его региону;
 * - нет — компонент без корня (`so-component`, `so-virtual`,
 *   `so-drag-and-drop`): директива, атрибутом на `<ng-container>`, как
 *   провайдер локали (`<ng-container so-virtual>`).
 *
 * Схема одна на весь адаптер: строку таблицы (`tr`) и заголовок колонки
 * (`th`) элементом не написать — внутри `table` чужой тег браузер выкинет, —
 * а кнопка-ссылка — это `<a so-button href>`. Атрибутный селектор компонента
 * начинается с тега ядра: по первому селектору Angular строит хост сам
 * (`createComponent`), — а за ним идёт голый атрибут: тег выбирает
 * потребитель. Директиве тег не нужен: голый атрибут Angular находит и на
 * `<ng-container>`.
 */

import { describe, it, expect } from 'vitest'
import { exportedDeclarations } from './declarations'

/** Компоненты soldy без корня — директивы. */
const ROOTLESS = ['TComponentComponent', 'TDragAndDropComponent', 'TVirtualComponent']

/** Части селектора через запятую. */
const partsOf = (selector: string) => selector.split(',').map((part) => part.trim())

/** Элементный селектор — один тег, без атрибута. */
const isElement = (part: string) => /^[a-z][a-z0-9-]*$/.test(part)

describe('селекторы компонентов и директив', () => {
	const declarations = exportedDeclarations()
	const components = declarations.filter(({ kind }) => kind === 'component')
	const directives = declarations.filter(({ kind }) => kind === 'directive')

	/**
	 * Сверка не впустую: описание директивы берётся закрытым API Angular
	 * (`declarations.ts`), и без него директивы выпали бы из проверок молча.
	 */
	it('найдены компоненты и директивы экспорта', () => {
		expect(components.map(({ name }) => name)).toEqual(
			expect.arrayContaining(['TButtonComponent', 'TTableComponent', 'TToastsComponent']),
		)
		expect(directives.map(({ name }) => name)).toEqual(
			expect.arrayContaining([...ROOTLESS, 'LocaleProviderDirective', 'AttributesDirective']),
		)
	})

	it('элементных селекторов нет: so-… — всегда атрибут', () => {
		const elements = declarations
			.filter(({ selector }) => partsOf(selector).some(isElement))
			.map(({ name, selector }) => `${name}: ${selector}`)

		expect(elements).toEqual([])
	})

	/**
	 * Корня нет — нет и узла, которому положено написанное на компоненте:
	 * компонент — директива, и пишут её на `<ng-container>`. Селектор — голый
	 * атрибут: тег в нём не дал бы поставить директиву на контейнер.
	 */
	it('компонент без корня — директива с голым атрибутом', () => {
		const rootless = directives.filter(({ soldy }) => soldy)

		expect(rootless.map(({ name }) => name).sort()).toEqual(ROOTLESS)

		for (const { name, selector } of rootless) {
			expect(partsOf(selector), name).toEqual([expect.stringMatching(/^\[so-[a-z-]+\]$/)])
		}
	})

	/**
	 * Менеджер тостов своей коробки не имеет (`display: contents`), а пишется
	 * всё равно атрибутом на элементе: у него есть узел, которому положено
	 * написанное на нём, — регион, — и класс, стиль, привязки и слушатели с
	 * элемента потребителя доходят до него. На `<ng-container>` они пропали бы.
	 */
	it('менеджер тостов — компонент на элементе, а не директива на контейнере', () => {
		expect(components.map(({ selector }) => partsOf(selector))).toContainEqual([
			'div[so-toasts]',
			'[so-toasts]',
		])
	})

	/**
	 * `tag[so-x], [so-x]`: тег первым — его Angular берёт, когда строит хост
	 * сам, а голый атрибут даёт потребителю писать компонент на любом теге.
	 */
	it('у компонента с тегом в селекторе — и голый атрибут того же имени', () => {
		for (const { selector } of components) {
			const parts = partsOf(selector)
			const tagged = /^[a-z]+\[(so-[a-z-]+)\]$/.exec(parts[0])

			if (!tagged) continue

			expect(parts, selector).toEqual([parts[0], `[${tagged[1]}]`])
		}
	})
})
