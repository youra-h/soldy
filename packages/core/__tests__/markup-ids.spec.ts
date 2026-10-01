/**
 * `id` в разметке ядро не строит.
 *
 * `id`, ссылки на них (`aria-controls`, `aria-labelledby`, `aria-describedby`)
 * и общий `name` радио нужны только документу, и на сервере и в браузере они
 * обязаны совпасть. Поэтому строят их плагины — от id монтирования, который
 * адаптер берёт у `useId` фреймворка (`IPluginContext.createId`). Ядро пишет,
 * что элемент такое — роль и состояние, — и держит наборы частей без
 * экземпляра, в которые пишут плагины.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import * as ts from 'typescript'
import {
	TAccordion,
	TAccordionCollectionFacade,
	TAccordionItem,
	TCalendar,
	TCalendarCollectionFacade,
	TDialog,
	TDrawer,
	TInput,
	TPopover,
	TRadioGroup,
	TRadioGroupCollectionFacade,
	TRadioGroupItem,
	TSelect,
	TSelectCollectionFacade,
	TSelectItem,
	TTabs,
	TTabsCollectionFacade,
	TTabsItem,
	TTooltip,
} from '../src'
import type { IAccordionItem, IRadioGroupItem, ISelectItem, ITabsItem } from '../src'

/** Ссылки на `id`, которые ядро могло бы написать. */
const REFERENCES = ['id', 'aria-controls', 'aria-labelledby', 'aria-describedby']

/** Какие из `id` и ссылок на них стоят в наборе. */
const idAttributes = (attributes: object) =>
	REFERENCES.filter((name) => Object.prototype.hasOwnProperty.call(attributes, name))

describe('ядро id в разметку не пишет', () => {
	it('оверлеи: панели и части без экземпляра', () => {
		const popover = new TPopover()
		const tooltip = new TTooltip()
		const dialog = new TDialog({ alert: true })
		const drawer = new TDrawer()

		for (const attributes of [
			popover.aria.toObject(),
			popover.triggerAria.toObject(),
			tooltip.aria.toObject(),
			tooltip.triggerAria.toObject(),
			dialog.aria.toObject(),
			dialog.titleAria.toObject(),
			dialog.bodyAria.toObject(),
			drawer.aria.toObject(),
			drawer.titleAria.toObject(),
		]) {
			expect(idAttributes(attributes)).toEqual([])
		}
	})

	it('поле: id — только заданный потребителем', () => {
		expect(new TInput().id).toBeUndefined()
	})

	it('Select: поле, список и опции', () => {
		const owner = new TSelect()
		const collection = new TSelectCollectionFacade({}, { owner })

		collection.items = [new TSelectItem({ value: 'a', text: 'A' })] as ISelectItem[]

		expect(idAttributes(owner.field.aria.toObject())).toEqual([])
		expect(idAttributes(owner.listAria.toObject())).toEqual([])
		expect(idAttributes(collection.items[0].aria.toObject())).toEqual([])
	})

	it('Tabs и Accordion: элементы из данных', () => {
		const tabs = new TTabsCollectionFacade({}, { owner: new TTabs() })
		const accordion = new TAccordionCollectionFacade({}, { owner: new TAccordion() })

		tabs.items = [new TTabsItem({ value: 'a' })] as ITabsItem[]
		accordion.items = [new TAccordionItem({ value: 'a' })] as IAccordionItem[]

		expect(idAttributes(tabs.items[0].aria.toObject())).toEqual([])
		expect(idAttributes(accordion.items[0].aria.toObject())).toEqual([])
		expect(idAttributes(accordion.items[0].contentAria.toObject())).toEqual([])
	})

	it('Calendar: заголовки и сетки', () => {
		const owner = new TCalendar({ months: ['2026-01-01', '2026-02-01'] })
		const collection = new TCalendarCollectionFacade({}, { owner })

		for (const { titleAria, gridAria } of collection.grids) {
			expect(idAttributes(titleAria)).toEqual([])
			expect(idAttributes(gridAria)).toEqual([])
		}
	})

	it('RadioGroup: общий name радио раздаёт не ядро', () => {
		const collection = new TRadioGroupCollectionFacade({}, { owner: new TRadioGroup() })

		collection.items = [new TRadioGroupItem({ value: 'a' })] as IRadioGroupItem[]

		expect(collection.items[0].name).toBe('')
	})
})

/**
 * Сторож: строки, которые уходят в разметку, `uid` не читают.
 *
 * `uid` — счётчик экземпляров процесса: на сервере он общий для всех
 * запросов, в браузере начинается заново, и `id` от него расходились бы при
 * гидратации. Он остаётся идентичностью экземпляра внутри процесса — реестр
 * наборов, `unique`, поиск элемента, — и там он на месте. Ловится то, из чего
 * строится строка: подстановка в шаблонной строке и `String(…)`. Обходится
 * код, а не текст, поэтому комментарии не в счёт.
 */
describe('сторож: строки из uid', () => {
	const ROOT = resolve(__dirname, '../../..')
	const SOURCES = ['packages/core/src', 'packages/plugins/src'].map((dir) => resolve(ROOT, dir))

	function collect(dir: string, files: string[] = []): string[] {
		for (const name of readdirSync(dir)) {
			const path = join(dir, name)

			if (statSync(path).isDirectory()) collect(path, files)
			else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) files.push(path)
		}

		return files
	}

	/** Читает ли выражение `uid` — полем (`x.uid`), именем или `Reflect.get(x, 'uid')`. */
	function readsUid(node: ts.Node): boolean {
		if (ts.isPropertyAccessExpression(node) && node.name.text === 'uid') return true
		if (ts.isIdentifier(node) && node.text === 'uid') return true
		if (ts.isStringLiteral(node) && node.text === 'uid') return true

		return ts.forEachChild(node, readsUid) ?? false
	}

	function offences(file: string): string[] {
		const source = ts.createSourceFile(
			file,
			readFileSync(file, 'utf-8'),
			ts.ScriptTarget.Latest,
		)
		const found: string[] = []

		const visit = (node: ts.Node): void => {
			const stringified =
				(ts.isTemplateSpan(node) && readsUid(node.expression)) ||
				(ts.isCallExpression(node) &&
					ts.isIdentifier(node.expression) &&
					node.expression.text === 'String' &&
					node.arguments.some(readsUid))

			if (stringified) found.push(relative(ROOT, file).split(sep).join('/'))

			ts.forEachChild(node, visit)
		}

		visit(source)

		return found
	}

	it('в core и plugins строки из uid нет', () => {
		expect(SOURCES.flatMap((dir) => collect(dir)).flatMap(offences)).toEqual([])
	})
})
