// @vitest-environment jsdom

/**
 * TRadioGroupCheckedPlugin — отметка полей группы по модели после выбора
 * пользователя.
 *
 * Плагины собраны настоящими bundle, как в рантайме, но без адаптера: разметку
 * тест строит сам в том виде, в каком её рисует Vue, — корень группы и у
 * каждого радио корень-`label` (узел элемента) с полем внутри. Выбор
 * пользователя коллекции отдаёт разметка — здесь её заменяет обработчик
 * `change` на поле, как `@change` у Vue: он срабатывает раньше слушателя
 * плагина на корне. Отказ в выборе — подписчик `item:activate:before`.
 *
 * Клик — `click()` поля: jsdom, как браузер, отмечает радио и снимает отметку
 * с соседа ещё до клика, а `change` шлёт после.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TRadioGroup, TRadioGroupItem, createEngineRadioGroup } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TPluginBundle,
	TRadioGroupCheckedPlugin,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

/**
 * Группа радио `values`. Первым в коллекции стоит ещё одно радио — без узла:
 * его разметка не нарисована, и плагин обязан пройти мимо него к остальным.
 * Отказ в выборе включается по ходу теста (`refuse.on`).
 */
async function setup(values: string[]) {
	const engine = createEngineRadioGroup()

	engine.extensions.plain.push(new TRadioGroupItem({ value: 'unrendered' }))

	const items = values.map((value) =>
		engine.extensions.plain.push(new TRadioGroupItem({ value })),
	)
	const activation = engine.extensions.activation
	const refuse = { on: false }

	activation.events.on('item:activate:before', (event) => {
		if (refuse.on) event.preventDefault()
	})

	const root = document.createElement('div')

	document.body.appendChild(root)

	const bundle = new TPluginBundle(new TRadioGroup())
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TRadioGroupCheckedPlugin)

	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)

	for (const item of items) {
		const label = document.createElement('label')
		const input = document.createElement('input')

		input.type = 'radio'
		input.name = 'group'
		input.value = String(item.value)
		input.addEventListener('change', () => activation.activate(item))
		label.appendChild(input)
		root.appendChild(label)

		const itemBundle = new TPluginBundle(item).use(TElementPlugin)

		pluginOf(itemBundle, TElementPlugin).element = label
		bundles.register(itemBundle, item)
	}

	bundles.bindEngine(engine)

	const rootElement = pluginOf(bundle, TElementPlugin)

	rootElement.element = root
	await nextFrame()

	/** Поле радио по значению; нет его — тест падает здесь. */
	const inputOf = (value: string): HTMLInputElement => {
		const input = root.querySelector(`input[value="${value}"]`)

		if (!(input instanceof HTMLInputElement)) throw new Error(`радио «${value}» нет`)

		return input
	}

	/** Выбрать радио, как разметка: модель и поле. */
	const select = (value: string): void => {
		const item = items.find((candidate) => candidate.value === value)

		if (!item) throw new Error(`радио «${value}» нет`)

		activation.activate(item)
		inputOf(value).checked = true
	}

	/** Значения отмеченных полей. */
	const checked = () => values.filter((value) => inputOf(value).checked)

	const active = () => activation.activeItem?.value

	return { bundle, root, rootElement, refuse, inputOf, select, checked, active }
}

afterEach(() => {
	document.body.innerHTML = ''
	vi.restoreAllMocks()
})

describe('отказ в выборе', () => {
	it('пустая группа — нажатое радио не остаётся отмеченным', async () => {
		const { refuse, inputOf, checked, active } = await setup(['a', 'b'])

		refuse.on = true
		inputOf('a').click()

		expect(active()).toBeUndefined()
		expect(checked()).toEqual([])
	})

	it('отметка возвращается активному радио', async () => {
		const { refuse, inputOf, select, checked, active } = await setup(['a', 'b', 'c'])

		select('b')
		refuse.on = true
		inputOf('c').click()

		expect(active()).toBe('b')
		expect(checked()).toEqual(['b'])
	})
})

describe('принятый выбор', () => {
	it('поля — по новому выбору', async () => {
		const { inputOf, select, checked, active } = await setup(['a', 'b'])

		select('b')
		inputOf('a').click()

		expect(active()).toBe('a')
		expect(checked()).toEqual(['a'])
	})
})

describe('слушатель change', () => {
	it('снимается, когда узел корня ушёл', async () => {
		const { rootElement, refuse, inputOf, checked } = await setup(['a', 'b'])

		rootElement.element = null
		refuse.on = true
		inputOf('a').click()

		// Возвращать поле уже некому — отметка браузера осталась
		expect(checked()).toEqual(['a'])
	})

	it('снимается при уничтожении плагина', async () => {
		const { bundle, root, refuse, inputOf, checked } = await setup(['a', 'b'])
		const removeListener = vi.spyOn(root, 'removeEventListener')

		bundle.remove(TRadioGroupCheckedPlugin)
		refuse.on = true
		inputOf('a').click()

		expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function))
		expect(checked()).toEqual(['a'])
	})
})
