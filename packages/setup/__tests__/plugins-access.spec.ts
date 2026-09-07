/**
 * Доступ к плагинам снаружи.
 *
 * В soldy компонентом управляют с двух сторон — декларативно (шаблон) и
 * императивно (инстанс). Для props и событий ядра обе стороны равнозначны;
 * эти тесты сторожат ту же равнозначность для плагинов.
 */

import { describe, it, expect, vi } from 'vitest'
import { TButton } from '@soldy/core'
import { TElementPlugin, TReadyPlugin } from '@soldy/plugins'
import {
	createAdapterContext,
	collectEventBindings,
	createInspectorFactory,
	ButtonDescriptor,
	ComponentDescriptor,
	callbackEventNaming,
	underscorePropNaming,
} from '@soldy/setup'

const createInspector = createInspectorFactory({
	prop: underscorePropNaming,
	event: callbackEventNaming,
})

/**
 * createBundle откладывает эмит на микрозадачу — иначе адаптер, который
 * получает bundle из createAdapterContext, не успел бы подписаться.
 */
const created = () => Promise.resolve()

describe('bundle:create — сторона инстанса', () => {
	it('отдаёт bundle тому, у кого на руках только ctrl', async () => {
		const ctrl = new TButton()
		const seen: unknown[] = []

		// Подписка ДО монтирования: инстанс уже существует, плагинов ещё нет
		ctrl.events.on('bundle:create', (bundle: unknown) => seen.push(bundle))

		const context = createAdapterContext(ButtonDescriptor(), { ctrl })

		await created()

		expect(seen).toHaveLength(1)
		expect(seen[0]).toBe(context.bundle)
	})

	it('через bundle можно подписаться на события конкретного плагина', async () => {
		const ctrl = new TButton()
		// Тесты setup идут в node-окружении: элемент — заглушка с тем минимумом,
		// который дёргают плагины. Поведение на настоящем DOM проверяют
		// адаптерные пакеты.
		const node = { tagName: 'BUTTON', addEventListener() {}, removeEventListener() {} }
		let element: unknown = null

		// Ровно тот сценарий, ради которого всё затевалось: на руках только
		// ctrl, а нужен DOM-элемент, который знает только плагин
		ctrl.events.on('bundle:create', (bundle: any) => {
			bundle.get(TElementPlugin).events.on('ready', (el: unknown) => (element = el))
		})

		const context = createAdapterContext(ButtonDescriptor(), { ctrl })

		await created()

		// TElementPlugin отдаёт `ready` через rAF, поэтому проверяем синхронный путь
		context.bundle.get(TElementPlugin).events.emit('ready', node)

		expect(element).toBe(node)
	})

	it('на каждое монтирование приходит свой bundle', async () => {
		const ctrl = new TButton()
		const seen: unknown[] = []

		ctrl.events.on('bundle:create', (bundle: unknown) => seen.push(bundle))

		const first = createAdapterContext(ButtonDescriptor(), { ctrl })
		const second = createAdapterContext(ButtonDescriptor(), { ctrl })

		await created()

		expect(seen).toEqual([first.bundle, second.bundle])
		expect(seen[0]).not.toBe(seen[1])
	})

	it('не эмитится, если у дескриптора нет плагинов', async () => {
		const context = createAdapterContext(ComponentDescriptor(), {})
		const handler = vi.fn()

		context.instance.events.on('bundle:create', handler)

		await created()

		expect(context.bundle).toBeNull()
		expect(handler).not.toHaveBeenCalled()
	})
})

describe('<ns>:create — сторона шаблона', () => {
	it('каждый плагин объявляет своё create с namespace', () => {
		const descriptor = ButtonDescriptor()
		const names = descriptor.getEvents().map((name) => name.getName())

		expect(names).toContain('element:create')
		expect(names).toContain('ready:create')
		expect(names).toContain('action:create')
	})

	it('create доходит до потребителя как обычное событие плагина', async () => {
		const context = createAdapterContext(ButtonDescriptor(), {})
		const inspector = createInspector(context.accessor)
		const emitted: Array<[string, unknown]> = []

		// Подписка после createAdapterContext — как в настоящем адаптере
		for (const { source, rawName, exportName } of collectEventBindings(
			context.accessor,
			inspector,
		)) {
			source.on(rawName, (...args: unknown[]) => emitted.push([exportName, args[0]]))
		}

		await created()

		const elementCreate = emitted.find(([name]) => name === 'onElementCreate')
		const bundleCreate = emitted.find(([name]) => name === 'onBundleCreate')

		// Плагин отдаёт сам себя — как engine:create отдаёт сам движок
		expect(elementCreate?.[1]).toBe(context.bundle.get(TElementPlugin))
		expect(bundleCreate?.[1]).toBe(context.bundle)
	})

	it('bundle:create приходит раньше плагинных create', async () => {
		const context = createAdapterContext(ButtonDescriptor(), {})
		const order: string[] = []

		context.instance.events.on('bundle:create', () => order.push('bundle'))
		context.bundle.get(TElementPlugin).events.on('create', () => order.push('element'))
		context.bundle.get(TReadyPlugin).events.on('create', () => order.push('ready'))

		await created()

		// Иначе обработчик bundle:create не успел бы подписаться на плагинный create
		expect(order[0]).toBe('bundle')
		expect(order).toContain('element')
		expect(order).toContain('ready')
	})
})
