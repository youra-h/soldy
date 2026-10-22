/**
 * Часть, которую браузер нарисовал сам, и чужое окно гидратации.
 *
 * Набор внутреннего узла помощник части (`createPartProps`) держит только у
 * части, собранной во время гидратации. Часть, которую браузер нарисовал сам,
 * — панель слоя: портал рисует её после основной гидратации, — читает
 * состояние напрямую, без мемо. В окне гидратации Solid не пишет ни в один
 * подключённый узел, и смену её набора в чужом окне — поздней гидратации
 * границы `Suspense` или острова — спред запомнил бы как записанную, а до
 * узла она не дошла бы. Библиотека такой смены не порождает: набор части
 * пишут её компонент и то, что входит в него самого, а наборы частей элемента
 * от входа соседа по коллекции не зависят — что коллекция пишет элементу на
 * вход соседа, лежит в наборах корня, и их мемо держит в любом окне
 * (`src/adapter/common/root.ts`, шапка, «Гидратация»).
 *
 * Сторож — вход соседа по коллекции: так вход в чужом окне дотягивается до
 * элемента, который нарисовал браузер. Секция Accordion — в панели Dialog,
 * выбранная соседняя — за границей `Suspense`, и её вход в позднем окне
 * забирает выбор у первой. Корень и заголовок первой сменились — после окна
 * это в их узлах, а узел её панели совпадает с её набором. Начни коллекция
 * писать выбор в набор панели — узел отстанет от состояния, и сторож
 * покраснеет.
 *
 * Поток сервера рисует перед прогоном его `globalSetup` (`server.tsx`);
 * страница — та же (`pages.tsx`). Поток в документ кладёт, досылает и
 * разрешает `serveStreamed` из `serve.ts`.
 */

import { describe, it, expect } from 'vitest'
import { sharedConfig } from 'solid-js'
import {
	createEngineAccordion,
	type IAccordionItem,
	type TAccordionCollection,
	type TAttributesMap,
} from '@soldy-ui/core'
import { AccordionLayerStreamed } from './pages'
import { hydrateServed, markupOf, serveStreamed } from './serve'

/**
 * Открыто ли окно гидратации — условие `isHydrating` из `solid-js/web` без
 * узла, как у адаптера (`hydrating` в `src/adapter/common/hydration.ts`).
 */
const hydrating = () => Boolean(sharedConfig.context) && !sharedConfig.done

/** Узлы секции: корень, заголовок и панель. */
type TSectionNodes = {
	readonly root: HTMLElement
	readonly header: Element
	readonly panel: Element
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении атрибута. */
function nodeOf(scope: ParentNode | null, selector: string): HTMLElement {
	const node = scope?.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`нет узла ${selector}`)

	return node
}

/** Единственная секция в `scope`. */
function sectionIn(scope: ParentNode): TSectionNodes {
	const root = nodeOf(scope, '.so-accordion-item')

	return {
		root,
		header: nodeOf(root, '.so-accordion-item__header'),
		panel: nodeOf(root, '.so-accordion-item__content'),
	}
}

/** Секция коллекции по значению; нет её — тест падает здесь. */
function itemOf(engine: TAccordionCollection, value: string): IAccordionItem {
	const item = engine.extensions.batch.items.find((candidate) => candidate.value === value)

	if (!item) throw new Error(`в коллекции нет секции ${value}`)

	return item
}

/** Атрибуты узла, кроме класса: класс кладёт разметка, а не набор. */
function attributesOf(node: Element): Record<string, string> {
	return Object.fromEntries(
		[...node.attributes]
			.filter((attribute) => attribute.name !== 'class')
			.map((attribute) => [attribute.name, attribute.value]),
	)
}

/** Набор так, как его кладёт в узел спред: `null` — атрибута нет. */
function inNode(set: TAttributesMap): Record<string, string> {
	return Object.fromEntries(
		Object.entries(set).filter((entry): entry is [string, string] => entry[1] !== null),
	)
}

describe('часть, нарисованная браузером · чужое окно гидратации', () => {
	it('сосед по коллекции вошёл в позднем окне: выбор ушёл из секции в панели слоя, узел панели — её набор', async () => {
		const engine = createEngineAccordion()
		const streamed = serveStreamed(markupOf('accordion-layer-streamed'))

		hydrateServed(
			streamed.container,
			() => <AccordionLayerStreamed engine={engine} />,
			streamed.options,
		)

		// Панель слоя браузер нарисовал сам, после основной гидратации, и
		// секцию A — вместе с ней: в разметке сервера их нет
		const layer = nodeOf(document, '.so-dialog')
		const drawn = sectionIn(layer)
		const a = itemOf(engine, 'a')

		expect(streamed.container.contains(layer)).toBe(false)
		expect(drawn.root.dataset.selected).toBe('true')

		/** Окна, в которых сменился выбор секции A. */
		const windows: boolean[] = []

		engine.extensions.selection.events.on('change:selection', (_, changed) => {
			if (changed.has(a)) windows.push(hydrating())
		})

		streamed.deliver()
		await streamed.resolve()

		const b = itemOf(engine, 'b')
		const served = sectionIn(streamed.container)

		// Выбор у секции A забрал вход соседа — в окне поздней гидратации
		expect(windows).toEqual([true])

		// Узлы секции A — те же, что браузер нарисовал до окна
		const after = sectionIn(layer)

		expect(after.root).toBe(drawn.root)
		expect(after.header).toBe(drawn.header)
		expect(after.panel).toBe(drawn.panel)

		// Смена выбора — в наборах корня: после окна она в узлах
		expect(drawn.root.dataset.selected).toBe('false')
		expect(drawn.header.getAttribute('aria-expanded')).toBe('false')
		expect(served.root.dataset.selected).toBe('true')
		expect(served.header.getAttribute('aria-expanded')).toBe('true')

		// Узел панели — её набор: смены в чужом окне у него не было
		expect(attributesOf(drawn.panel)).toEqual(inNode(a.contentAria.toObject()))
		expect(attributesOf(served.panel)).toEqual(inNode(b.contentAria.toObject()))
	})
})
