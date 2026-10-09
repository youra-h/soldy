/**
 * Virtual в React — окно над ListBox на настоящей разметке.
 *
 * Обёртка своего узла не рисует: её окно подхватывает коллекция внутри
 * (`TVirtualCollectionExtension`), и список рисует только видимые элементы, а
 * на месте остальных — распорки под `aria-hidden`. Что попадает в окно,
 * решает ядро (`core/__tests__/collection.draw.spec.ts`), замер — плагин
 * (`plugins/__tests__/virtual.plugin.spec.ts`); раскладки в jsdom нет, и
 * замер здесь подаётся рисованию движка снаружи руками. Сценарии Vue —
 * `ui/vue/__tests__/virtual.spec.ts`; в настоящем браузере —
 * `playground/vue/browser/list-box-virtual.spec.ts`.
 *
 * Своё у React — сборка на рендере и приём при коммите. Подписка коллекции
 * на выключатель обёртки ждёт приёма, пересобранная обёртка (StrictMode)
 * опускает новое подключение, и список пересобирается вслед за ней, а
 * элемент, который окно дорисовало, входит в коллекцию при коммите. Что
 * выброшенный рендер ничего не оставляет на `ctrl` обёртки и движке, сторожит
 * `external-lifetime.spec.tsx`.
 */

import { describe, it, expect, vi } from 'vitest'
import { StrictMode, act, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { createEngineListBox } from '@soldy-ui/core'
import type { IListBoxItem, TListBoxCollection } from '@soldy-ui/core'
import { ListBox, Virtual } from '@soldy-ui/react'
import { mount, nextFrame, track } from './mount'

/** `count` элементов: значение `v1`… и текст. */
function items(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		value: `v${index + 1}`,
		text: `Пункт ${index + 1}`,
	}))
}

/** Движок списка снаружи — тест подаёт ему замер. */
function engineOf(count: number): TListBoxCollection {
	return createEngineListBox({ items: items(count) })
}

/** Замер, как его подаёт плагин окна: полоса от верха списка и шаг элементов. */
function measure(engine: TListBoxCollection, top: number, bottom: number, step = 30): void {
	act(() => engine.extensions.draw.notifyViewport({ top, bottom, step }))
}

const options = (root: ParentNode = document) => [...root.querySelectorAll('.s-list-box-item')]

const fillers = (root: ParentNode = document) => [
	...root.querySelectorAll<HTMLElement>('.s-list-box__filler'),
]

/** Элемент по тексту, если он в документе. */
function optionOf(text: string): HTMLElement | undefined {
	return options().find(
		(node): node is HTMLElement =>
			node instanceof HTMLElement && node.textContent?.trim() === text,
	)
}

/** Строка элемента: на ней набор `aria` элемента и его `dataset`. */
function optionRow(text: string): HTMLElement {
	const row = optionOf(text)?.querySelector(':scope > .s-button')

	if (!(row instanceof HTMLElement)) throw new Error(`${text}: строки нет`)

	return row
}

function listRoot(): HTMLElement {
	const root = document.querySelector('.s-list-box')

	if (!(root instanceof HTMLElement)) throw new Error('списка нет')

	return root
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(target: Element, key: string): void {
	act(() => {
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	})
}

describe('ListBox в окне', () => {
	it('без обёртки — все элементы, распорок нет', () => {
		mount(<ListBox items={items(80)} />)

		expect(options()).toHaveLength(80)
		expect(fillers()).toEqual([])
	})

	it('в обёртке — до замера первые 50, без распорок', () => {
		mount(
			<Virtual>
				<ListBox items={items(80)} />
			</Virtual>,
		)

		expect(options()).toHaveLength(50)
		expect(fillers()).toEqual([])
	})

	it('по замеру — распорки на месте пропущенных: скрыты, высотой в элементы, на своём месте', () => {
		const engine = engineOf(200)

		mount(
			<Virtual>
				<ListBox engine={engine} />
			</Virtual>,
		)

		// Видны места 100–109: с запасом — 90–119
		measure(engine, 3000, 3300)

		const root = listRoot()

		expect(fillers(root).map((filler) => filler.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
		])
		expect(
			fillers(root).map((filler) => filler.style.getPropertyValue('--s-filler-height')),
		).toEqual(['2700px', '2400px'])
		// Место в составе — перед элементом 91 и за последним
		expect(fillers(root).map((filler) => filler.style.order)).toEqual(['90', '200'])
		expect(root.firstElementChild).toBe(fillers(root)[0])
		expect(root.lastElementChild).toBe(fillers(root)[1])
		expect(options(root)).toHaveLength(30)
	})

	it('нарисованным — размер набора и место в нём', () => {
		const engine = engineOf(200)

		mount(
			<Virtual>
				<ListBox engine={engine} />
			</Virtual>,
		)

		measure(engine, 3000, 3300)

		const row = optionRow('Пункт 91')

		expect(row.getAttribute('aria-setsize')).toBe('200')
		expect(row.getAttribute('aria-posinset')).toBe('91')
	})

	it('`enabled` выключает и включает окно на лету', () => {
		const view = (enabled: boolean) => (
			<Virtual enabled={enabled}>
				<ListBox items={items(80)} />
			</Virtual>
		)
		const { render } = mount(view(false))

		expect(options()).toHaveLength(80)
		expect(optionRow('Пункт 1').hasAttribute('aria-posinset')).toBe(false)

		render(view(true))

		expect(options()).toHaveLength(50)
		expect(optionRow('Пункт 1').getAttribute('aria-posinset')).toBe('1')

		render(view(false))

		expect(options()).toHaveLength(80)
	})

	it('список в слоте элемента окна не наследует', () => {
		mount(
			<Virtual>
				<ListBox
					className="outer"
					items={items(60)}
					item={({ item }: { item: IListBoxItem }) =>
						item.value === 'v1' ? (
							<ListBox className="inner" items={items(55)} />
						) : (
							item.text
						)
					}
				/>
			</Virtual>,
		)

		const inner = document.querySelector('.inner')

		if (!inner) throw new Error('вложенного списка нет')

		expect(options(inner)).toHaveLength(55)
		// У внешнего — окно: 50 своих элементов и 55 вложенного внутри первого
		expect(options(document.querySelector('.outer') ?? document)).toHaveLength(50 + 55)
	})
})

describe('ListBox в окне — цикл React', () => {
	/**
	 * Элементы и распорки — одной петлёй с ключом записи: элемент, который
	 * остался в окне, React не перемонтирует, хотя распорка перед ним сменилась.
	 */
	it('сдвиг окна не перемонтирует оставшийся элемент — тот же узел', () => {
		const engine = engineOf(200)

		mount(
			<Virtual>
				<ListBox engine={engine} />
			</Virtual>,
		)

		measure(engine, 3000, 3300)

		const kept = optionOf('Пункт 101')

		// Окно ушло на десять мест вниз: места 100–129
		measure(engine, 3300, 3600)

		expect(optionOf('Пункт 91')).toBeUndefined()
		expect(optionOf('Пункт 130')).toBeDefined()
		expect(kept).toBeDefined()
		expect(optionOf('Пункт 101')).toBe(kept)
	})

	/**
	 * StrictMode уничтожает контексты и собирает их заново. Пересобранная
	 * обёртка — это новое подключение: список видит, что прочитанное из лифта
	 * сменилось, пересобирается и подписывается на живую обёртку, а не на
	 * уничтоженную. Размонтирование снимает окно с движка снаружи.
	 */
	it('StrictMode: окно живое — `enabled` переключается на лету, размонтирование его снимает', () => {
		const engine = engineOf(80)
		const view = (enabled: boolean) => (
			<StrictMode>
				<Virtual enabled={enabled}>
					<ListBox engine={engine} />
				</Virtual>
			</StrictMode>
		)
		const { render } = mount(view(true))

		expect(options()).toHaveLength(50)

		render(view(false))

		expect(options()).toHaveLength(80)
		expect(engine.extensions.draw.virtual).toBe(false)

		render(view(true))

		expect(options()).toHaveLength(50)
		expect(engine.extensions.draw.virtual).toBe(true)

		render(<></>)

		expect(engine.extensions.draw.virtual).toBe(false)
		expect(engine.extensions.draw.drawn).toHaveLength(80)
	})

	/**
	 * Сервер рисует окно: подхват — при сборке, а сборка у React — на рендере.
	 * Браузер собирает тот же список тем же окном, и гидратация сходится.
	 */
	it('сервер отдаёт окно, гидратация сходится', () => {
		const element: ReactElement = (
			<Virtual>
				<ListBox items={items(80)} />
			</Virtual>
		)
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)

		expect(options(container)).toHaveLength(50)
		expect(fillers(container)).toEqual([])

		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(options(container)).toHaveLength(50)
		expect(optionRow('Пункт 50').getAttribute('aria-posinset')).toBe('50')
	})

	/**
	 * Стрелка уводит подсветку к элементу, которого не было в документе:
	 * навигация закрепляет его в окне, окно его дорисовывает, а отметку
	 * навигация возвращает ему, когда его набор регистрируется в коллекции, — у
	 * React это коммит, а не рендер.
	 */
	it('↑ с первого элемента — последний нарисован и отмечен подсветкой', async () => {
		const engine = engineOf(200)

		mount(
			<Virtual>
				<ListBox engine={engine} />
			</Virtual>,
		)

		// Клавиатура списка слушает корень с `element:ready` — через кадр
		await nextFrame()

		// Видны места 0–9: с запасом — 0–19, последнего элемента в документе нет
		measure(engine, 0, 300)

		expect(optionOf('Пункт 200')).toBeUndefined()

		press(listRoot(), 'ArrowDown')

		expect(optionRow('Пункт 1').getAttribute('data-highlighted')).toBe('true')

		press(listRoot(), 'ArrowUp')

		expect(optionRow('Пункт 200').getAttribute('data-highlighted')).toBe('true')
		expect(optionRow('Пункт 1').getAttribute('data-highlighted')).toBe('false')
		// Между окном и последним — распорка на пропущенные
		expect(
			fillers().map((filler) => filler.style.getPropertyValue('--s-filler-height')),
		).toEqual([`${179 * 30}px`])
	})
})
