/**
 * Основа `id` в DOM — `idBase` экземпляра, а не `uid`.
 *
 * `uid` — счётчик экземпляров процесса: на сервере он общий для всех
 * запросов, в браузере начинается заново, и `id` от него расходились при
 * гидратации. Основу экземпляру даёт опция конструктора `idBase` — адаптер
 * берёт её у `useId` фреймворка. Без опции основа — `uid`, как раньше.
 *
 * Элементы из данных строит фабрика движка, и `useId` до них не доходит:
 * их основа — основа владельца и номер по порядку создания.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import * as ts from 'typescript'
import {
	TButton,
	TDialog,
	TInput,
	TPopover,
	TRadioGroup,
	TRadioGroupCollectionFacade,
	TSelect,
	TSelectCollectionFacade,
	TTabs,
	TTabsCollectionFacade,
	TTabsItem,
	TTooltip,
} from '../src'
import type { ITabsItem } from '../src'

describe('основа id экземпляра', () => {
	it('без опции — uid', () => {
		const button = new TButton()

		expect(button.idBase).toBe(String(button.uid))
	})

	it('опция — как есть; пустая строка — как не заданная', () => {
		expect(new TButton({}, { idBase: 'r1' }).idBase).toBe('r1')

		const empty = new TButton({}, { idBase: '' })

		expect(empty.idBase).toBe(String(empty.uid))
	})
})

describe('id в DOM — от основы', () => {
	it('поле: незаданный id — основа, заданный — свой', () => {
		expect(new TInput({}, { idBase: 'r1' }).id).toBe('r1')
		expect(new TInput({ id: 'field' }, { idBase: 'r1' }).id).toBe('field')
	})

	it('панели Popover и Tooltip, заголовок и тело Dialog', () => {
		expect(new TPopover({}, { idBase: 'r1' }).aria.get('id')).toBe('s-popover-panel-r1')
		expect(new TTooltip({}, { idBase: 'r2' }).aria.get('id')).toBe('s-tooltip-panel-r2')

		const dialog = new TDialog({}, { idBase: 'r3' })

		expect(dialog.titleAria.id).toBe('s-dialog-title-r3')
	})

	it('Select: поле — основа Select, список — от неё', () => {
		const owner = new TSelect({}, { idBase: 'r1' })
		const collection = new TSelectCollectionFacade({}, { owner })

		expect(owner.field.id).toBe('r1')
		expect(collection.engine.extensions.select.listId).toBe('s-select-list-r1')
	})

	it('группа радио без своего имени: name — от основы', () => {
		const owner = new TRadioGroup({}, { idBase: 'r1' })
		const collection = new TRadioGroupCollectionFacade({}, { owner })

		expect(collection.engine.extensions.radioGroup.groupName).toBe('s-radio-group-r1')
	})
})

describe('элементы коллекции', () => {
	const tabIds = (items: readonly ITabsItem[]) => items.map((item) => item.aria.get('id'))

	it('из данных — основа владельца и номер по порядку создания', () => {
		const owner = new TTabs({}, { idBase: 'r1' })
		const collection = new TTabsCollectionFacade(
			{
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B' },
				],
			},
			{ owner },
		)

		expect(collection.items.map((item) => item.idBase)).toEqual(['r1-item-1', 'r1-item-2'])
		expect(tabIds(collection.items)).toEqual(['s-tab-r1-item-1', 's-tab-r1-item-2'])
	})

	it('одинаковые данные у двух владельцев с одной основой дают одни id — как сервер и браузер', () => {
		const build = () =>
			new TTabsCollectionFacade(
				{ items: [{ value: 'a', text: 'A' }] },
				{ owner: new TTabs({}, { idBase: 'r1' }) },
			)
		const server = build()
		const client = build()

		expect(server.items[0].uid).not.toBe(client.items[0].uid)
		expect(tabIds(client.items)).toEqual(tabIds(server.items))
	})

	it('готовый элемент (из разметки) остаётся со своей основой', () => {
		const owner = new TTabs({}, { idBase: 'r1' })
		const collection = new TTabsCollectionFacade({}, { owner })
		const item = new TTabsItem({ value: 'a', text: 'A' }, { idBase: 'r7' })

		collection.extensions.plain.push(item)

		expect(item.aria.get('id')).toBe('s-tab-r7')
	})
})

/**
 * Сторож: строки, которые уходят в разметку, `uid` не читают.
 *
 * `uid` остаётся идентичностью экземпляра внутри процесса — реестр наборов,
 * `unique`, поиск элемента, — и там он на месте. Ловится то, из чего строится
 * строка: подстановка в шаблонной строке и `String(…)`. Обходится код, а не
 * текст, поэтому комментарии не в счёт.
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

	it('в core и plugins строку из uid строит только основа по умолчанию', () => {
		const found = SOURCES.flatMap((dir) => collect(dir)).flatMap(offences)

		// Единственное место: `idBase` без опции (`TComponentView`)
		expect(found).toEqual([
			'packages/core/src/components/base/component-view/component-view.class.ts',
		])
	})
})
