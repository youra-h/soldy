// @vitest-environment jsdom

/**
 * Поверхность компонента и связка на монтирование.
 *
 * Поверхность — имена, умолчания и типы публичного API в именах одного
 * фреймворка — свойство типа: считается один раз на пару «дескриптор ×
 * профиль». Связка соединяет её с аксессором монтирования и делает то, что
 * раньше каждый из шести адаптеров писал сам.
 */

import { describe, it, expect, vi } from 'vitest'
import { TName } from '@soldy/accessor'
import { TButton, TFrame, TIcon, TTabsItem } from '@soldy/core'
import { TAnchorPlugin, TAriaPlugin, TIconLayoutPlugin } from '@soldy/plugins'
import {
	ButtonDescriptor,
	FrameDescriptor,
	IconDescriptor,
	TabsItemDescriptor,
	bindComponent,
	createAdapterContext,
	defineComponent,
	surfaceOf,
} from '@soldy/setup'
import type { IAdapterProfile, TEventEmitter, TOutputWriter } from '@soldy/setup'
import { CallbackProfile, installResizeObserverStub, required } from './helpers'

/** Дескриптор с одним пропом — чтобы проверить конфиг статического слоя. */
const single = (prop: Record<string, unknown>) =>
	defineComponent({ ctor: class {}, contribution: { props: { [prop.name as string]: prop } } })

describe('поверхность', () => {
	it('одна на пару «дескриптор × профиль»', () => {
		const other: IAdapterProfile = { naming: CallbackProfile.naming }

		expect(surfaceOf(ButtonDescriptor(), CallbackProfile)).toBe(
			surfaceOf(ButtonDescriptor(), CallbackProfile),
		)
		expect(surfaceOf(ButtonDescriptor(), other)).not.toBe(
			surfaceOf(ButtonDescriptor(), CallbackProfile),
		)
	})

	it('имена — по стратегии профиля', () => {
		const surface = surfaceOf(ButtonDescriptor(), CallbackProfile)
		const label = required(
			surface.props.find((prop) => prop.key === 'aria:label'),
			'проп aria:label',
		)

		expect(label.exportName).toBe('aria_label')
		expect(surface.events.map((event) => event.exportName)).toContain('onElementReady')
	})
})

describe('поверхность · умолчание пропа из декларации', () => {
	it('без ключа в декларации default нет ни в конфиге, ни в свойстве поверхности', () => {
		const surface = surfaceOf(single({ name: 'text', type: String }), CallbackProfile)
		const config = surface.exportProps.text

		expect(config).toEqual({ type: String })
		expect(Object.hasOwn(config, 'default')).toBe(false)
		expect(Object.hasOwn(required(surface.props[0], 'проп text'), 'default')).toBe(false)
	})

	it('ключ со значением undefined сохраняется', () => {
		// Умолчание пропа собирает defineComponent из статики класса ядра
		class TWithUndefined {
			static defaultValues = { closable: undefined }
		}

		const descriptor = defineComponent({
			ctor: TWithUndefined,
			contribution: { props: { closable: { type: Boolean } } },
		})
		const config = surfaceOf(descriptor, CallbackProfile).exportProps.closable

		expect(Object.hasOwn(config, 'default')).toBe(true)
		expect(config.default).toBeUndefined()
	})

	it('свойство поверхности несёт то же умолчание — к нему связка сбрасывает снятый проп', () => {
		const surface = surfaceOf(TabsItemDescriptor(), CallbackProfile)
		const find = (key: string) =>
			required(
				surface.props.find((prop) => prop.key === key),
				`проп ${key}`,
			)

		expect(find('text').default).toBe('')
		expect(Object.hasOwn(find('closable'), 'default')).toBe(true)
		expect(find('closable').default).toBeUndefined()
		// Проп плагина — так же: «имени нет» объявлено ключом без значения
		expect(Object.hasOwn(find('aria:label'), 'default')).toBe(true)
		expect(find('aria:label').default).toBeUndefined()
	})

	it('protected-проп наружу не уходит', () => {
		const surface = surfaceOf(
			single({ name: 'present', type: Boolean, protected: true }),
			CallbackProfile,
		)

		expect(surface.exportProps).toEqual({})
		expect(surface.inputs).toEqual([])
		expect(surface.props).toHaveLength(1)
	})

	it('события — явные и триггеры свойств, без повторов', () => {
		const descriptor = defineComponent({
			ctor: class {},
			contribution: {
				props: {
					rendered: { triggers: ['change:rendered'] },
					present: { protected: true, triggers: ['change:rendered'] },
				},
				events: ['show'],
			},
		})

		expect(surfaceOf(descriptor, CallbackProfile).exportEvents).toEqual([
			'onShow',
			'onChangeRendered',
		])
	})
})

describe('связка · проброс пропсов в корень', () => {
	function forward(props: object): object {
		const context = createAdapterContext(ButtonDescriptor(), { props })

		try {
			return bindComponent(context, CallbackProfile).forward(props)
		} finally {
			context.destroy()
		}
	}

	it('слоты дескриптора не уходят в атрибуты', () => {
		expect(forward({ leading: 'L', trailing: 'T', children: 'C' })).toEqual({})
	})

	it('пропы, события и пропы адаптера съедаются', () => {
		expect(forward({ text: 'x', onReady: () => {}, ctrl: undefined, embedded: 'x' })).toEqual(
			{},
		)
	})

	it('всё остальное уходит как есть', () => {
		expect(forward({ id: 'b', title: 'подсказка', leading: 'L' })).toEqual({
			id: 'b',
			title: 'подсказка',
		})
	})
})

describe('связка · ядро ↔ фреймворк', () => {
	it('состояние — свойства с триггерами', () => {
		const context = createAdapterContext(ButtonDescriptor(), { props: { text: 'hi' } })
		const state = bindComponent(context, CallbackProfile).getSnapshot()

		expect(state.text).toBe('hi')
		expect('ctrl' in state).toBe(false)
	})

	it('изменение в ядре приходит подписчику под именем фреймворка', () => {
		const ctrl = new TButton()
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const write = vi.fn()
		const off = bindComponent(context, CallbackProfile).subscribe(write)

		write.mockClear()
		ctrl.text = 'новый'

		expect(write).toHaveBeenCalledWith(expect.objectContaining({ exportName: 'text' }), 'новый')

		off()
		write.mockClear()
		ctrl.text = 'после отписки'

		expect(write).not.toHaveBeenCalled()
	})

	it('запись из фреймворка: то же значение не пишется', () => {
		const ctrl = new TButton({ text: 'a' })
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const binding = bindComponent(context, CallbackProfile)
		const changes = vi.fn()

		ctrl.events.on('change:text', changes)

		binding.writeAll({ text: 'a' })
		binding.writeAll({ text: 'b' })
		binding.writeAll({ text: 'b' })

		expect(ctrl.text).toBe('b')
		expect(changes).toHaveBeenCalledTimes(1)
	})

	it('одно событие ядра — один проброс, даже если триггер у двух свойств', () => {
		// `present` повторяет триггеры `rendered` и `visible`
		const ctrl = new TButton()
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const emit = vi.fn()

		bindComponent(context, CallbackProfile).bindEvents(emit)
		ctrl.rendered = false

		expect(emit.mock.calls.filter(([name]) => name === 'onChangeRendered')).toHaveLength(1)
	})

	it('проп читается по имени фреймворка и по сырому имени', () => {
		const context = createAdapterContext(ButtonDescriptor(), {})
		const binding = bindComponent(context, CallbackProfile)
		const label = required(
			binding.surface.inputs.find(
				(prop) => prop.name.getName() === new TName('label', 'aria').getName(),
			),
			'проп aria:label',
		)

		expect(binding.read(label, { aria_label: 'Закрыть' })).toBe('Закрыть')
		expect(binding.read(label, { label: 'Закрыть' })).toBe('Закрыть')
	})
})

/**
 * Состояние для фреймворка — хранилище: `subscribe` и `getSnapshot`. Путь у
 * значения из ядра один — перечитать свойство и отдать подписчику: на
 * срабатывание триггера и при монтировании, для каждого свойства. Порядок —
 * сначала подписка на триггеры, потом чтение — держит связка. Раньше адаптер
 * брал снимок и подписывался сам, и React со Svelte подписывались в эффекте:
 * изменение ядра между рендером и эффектом до них не доходило.
 */
describe('связка · состояние для фреймворка', () => {
	it('подписка отдаёт каждое свойство тем же вызовом, что и триггер', () => {
		const binding = bindComponent(
			createAdapterContext(ButtonDescriptor(), { props: { text: 'a' } }),
			CallbackProfile,
		)
		const write = vi.fn<TOutputWriter>()

		binding.subscribe(write)

		const names = write.mock.calls.map(([prop]) => prop.exportName)

		expect(names.sort()).toEqual(Object.keys(binding.getSnapshot()).sort())
		expect(write).toHaveBeenCalledWith(expect.objectContaining({ exportName: 'text' }), 'a')
	})

	it('изменение между созданием связки и подпиской не теряется', () => {
		// Так у React: рендер по снимку, подписка — при коммите
		const ctrl = new TButton({ text: 'a' })
		const binding = bindComponent(
			createAdapterContext(ButtonDescriptor(), { ctrl }),
			CallbackProfile,
		)
		const rendered = binding.getSnapshot()
		const write = vi.fn()

		ctrl.text = 'b'

		expect(binding.getSnapshot()).toBe(rendered)

		binding.subscribe(write)

		expect(write).toHaveBeenCalledWith(expect.objectContaining({ exportName: 'text' }), 'b')
		expect(binding.getSnapshot()).not.toBe(rendered)
		expect(binding.getSnapshot().text).toBe('b')
	})

	it('снимок тот же, пока ничего не сменилось: составные свойства сверяются по содержимому', () => {
		// `classes`, `aria`, `attrs`, `dataset` отдают новый объект на каждое
		// чтение — по ссылке каждое монтирование выглядело бы изменением
		const binding = bindComponent(createAdapterContext(ButtonDescriptor(), {}), CallbackProfile)
		const rendered = binding.getSnapshot()

		binding.subscribe(() => {})

		expect(binding.getSnapshot()).toBe(rendered)
	})

	it('второй подписчик получает всё состояние, первый — только изменения', () => {
		const ctrl = new TButton()
		const binding = bindComponent(
			createAdapterContext(ButtonDescriptor(), { ctrl }),
			CallbackProfile,
		)
		const first = vi.fn()
		const second = vi.fn()

		binding.subscribe(first)
		first.mockClear()
		binding.subscribe(second)

		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledWith(expect.objectContaining({ exportName: 'text' }), '')
	})

	it('после отписки всех — новая подписка снова перечитывает ядро', () => {
		// StrictMode: подписка, отписка и снова подписка
		const ctrl = new TButton()
		const binding = bindComponent(
			createAdapterContext(ButtonDescriptor(), { ctrl }),
			CallbackProfile,
		)
		const write = vi.fn()

		binding.subscribe(() => {})()
		ctrl.text = 'пока без подписчиков'
		binding.subscribe(write)

		expect(write).toHaveBeenCalledWith(
			expect.objectContaining({ exportName: 'text' }),
			'пока без подписчиков',
		)
	})

	it('модель: `update:<prop>` после события ядра и только на изменение', () => {
		const profile: IAdapterProfile = {
			naming: CallbackProfile.naming,
			model: (name) => `update:${name}`,
		}
		const ctrl = new TButton()
		const binding = bindComponent(createAdapterContext(ButtonDescriptor(), { ctrl }), profile)
		const emit = vi.fn<TEventEmitter>()

		expect(binding.surface.exportEvents).toContain('update:text')
		// Защищённое свойство снаружи не пишут — модели у него нет
		expect(binding.surface.exportEvents).not.toContain('update:present')

		binding.subscribe(() => {})
		binding.bindEvents(emit)

		expect(emit).not.toHaveBeenCalled()

		ctrl.text = 'b'

		const names = emit.mock.calls.map(([name]) => name)

		expect(names).toEqual(['onChangeText', 'update:text'])
		expect(emit).toHaveBeenLastCalledWith('update:text', ['b'])
	})
})

/** Связка над внешним инстансом: снаружи видно, что она в него пишет. */
function bindButton(ctrl = new TButton()) {
	const context = createAdapterContext(ButtonDescriptor(), { ctrl })

	return { ctrl, context, binding: bindComponent(context, CallbackProfile) }
}

/**
 * `undefined` из фреймворка значит «проп не задан». Проп, который фреймворк
 * задавал, а потом снял, возвращается к умолчанию декларации; ни разу не
 * заданный связка не пишет вовсе. Раньше `undefined` пропускался всегда, и
 * трёхзначный проп (`closable` элемента Tabs) нельзя было вернуть к «как у
 * владельца».
 */
describe('связка · снятый проп', () => {
	it('ни разу не заданный проп не трогает внешний ctrl', () => {
		const { ctrl, binding } = bindButton(new TButton({ text: 'своё', tag: 'a' }))
		const changes = vi.fn()

		ctrl.events.on('change:text', changes)

		binding.writeAll({})
		binding.writeAll({ text: undefined, tag: undefined })

		// Умолчания деклараций — '' и 'button': сброса не было
		expect(ctrl.text).toBe('своё')
		expect(ctrl.tag).toBe('a')
		expect(changes).not.toHaveBeenCalled()
	})

	it('снятый проп возвращается к умолчанию декларации: text — пустая строка', () => {
		const { ctrl, binding } = bindButton()

		binding.writeAll({ text: 'a' })

		expect(ctrl.text).toBe('a')

		binding.writeAll({ text: undefined })

		expect(ctrl.text).toBe('')
	})

	it('заданным проп считается и тогда, когда значение уже лежало в инстансе', () => {
		// Ядро уже держит то же значение, и запись пропускается — но проп задан
		const { ctrl, binding } = bindButton(new TButton({ text: 'a' }))

		binding.writeAll({ text: 'a' })
		binding.writeAll({})

		expect(ctrl.text).toBe('')
	})

	it('проп, с которым собран контекст, тоже задан: снятый, он сбрасывается', () => {
		const context = createAdapterContext(ButtonDescriptor(), { props: { text: 'a' } })
		const binding = bindComponent(context, CallbackProfile)

		binding.writeAll({})

		expect(context.instance.text).toBe('')
	})

	it('трёхзначный проп возвращается к «как у владельца»: closable элемента Tabs', () => {
		const ctrl = new TTabsItem()
		const binding = bindComponent(
			createAdapterContext(TabsItemDescriptor(), { ctrl }),
			CallbackProfile,
		)

		binding.writeAll({ closable: true })

		expect(ctrl.closable).toBe(true)

		binding.writeAll({ closable: undefined })

		expect(ctrl.closable).toBeUndefined()
	})

	/*
	 * «Не задано» — тоже умолчание, и объявлено ключом. Пока у пропсов ниже
	 * ключа не было, снятый проп оставался с прежним значением во всех адаптерах.
	 */

	it('снятое имя убирает aria-label: у плагина имени по умолчанию нет', () => {
		const { ctrl, binding } = bindButton()

		binding.writeAll({ aria_label: 'Закрыть' })

		expect(ctrl.aria.get('aria-label')).toBe('Закрыть')

		binding.writeAll({})

		expect(ctrl.aria.has('aria-label')).toBe(false)
	})

	it('снятые width и height иконки уходят из стилей: размер снова даёт size', () => {
		const ctrl = new TIcon()
		const context = createAdapterContext(IconDescriptor(), { ctrl })
		const binding = bindComponent(context, CallbackProfile)
		const layout = required(context.bundle?.get(TIconLayoutPlugin), 'плагин layout')

		binding.writeAll({ width: 24, height: '2em' })

		expect(layout.styles).toEqual({ width: '24px', height: '2em' })

		binding.writeAll({})

		expect(ctrl.width).toBeUndefined()
		expect(ctrl.height).toBeUndefined()
		// Пустое значение снимает инлайновый стиль, остаётся класс `--size-*`
		expect(layout.styles).toEqual({ width: '', height: '' })
	})

	it('снятый якорь отвязывает панель Frame', () => {
		// Привязка следит за размером якоря, а jsdom `ResizeObserver` не знает
		installResizeObserverStub()

		const ctrl = new TFrame()
		const context = createAdapterContext(FrameDescriptor(), { ctrl })
		const binding = bindComponent(context, CallbackProfile)
		const anchor = required(context.bundle?.get(TAnchorPlugin), 'плагин anchor')
		const element = document.createElement('button')

		binding.writeAll({ anchor_anchor: element })

		expect(anchor.anchor).toBe(element)

		binding.writeAll({})

		expect(anchor.anchor).toBeNull()
	})

	it('после сброса проп снова не задан: повторное снятие ничего не пишет', () => {
		const { ctrl, binding } = bindButton()
		const changes = vi.fn()

		binding.writeAll({ text: 'a' })
		ctrl.events.on('change:text', changes)

		binding.writeAll({})
		// Ядро поменяло значение само — повторное снятие его не трогает
		ctrl.text = 'из ядра'
		binding.writeAll({})

		expect(ctrl.text).toBe('из ядра')
		expect(changes).toHaveBeenCalledTimes(2)
	})

	it('без умолчания в декларации сбрасывать не к чему — значение остаётся', () => {
		class TSample {
			static defaultValues = { declared: 'умолчание' }
			declared = 'умолчание'
			free = 'старт'
		}

		const ctrl = new TSample()
		const descriptor = defineComponent({
			ctor: TSample,
			contribution: { props: { declared: { type: String }, free: { type: String } } },
		})
		const binding = bindComponent(createAdapterContext(descriptor, { ctrl }), CallbackProfile)

		binding.writeAll({ declared: 'задано', free: 'задано' })
		binding.writeAll({})

		expect(ctrl.declared).toBe('умолчание')
		expect(ctrl.free).toBe('задано')
	})

	it('дельта пишет только свои ключи: остальные пропсы не сбрасываются', () => {
		const { ctrl, binding } = bindButton()

		binding.writeChanged({ text: 'a', tag: 'span' })
		binding.writeChanged({ tag: 'a' })

		expect(ctrl.text).toBe('a')
		expect(ctrl.tag).toBe('a')

		// Ключ есть, значение `undefined` — проп сняли
		binding.writeChanged({ text: undefined })

		expect(ctrl.text).toBe('')
		expect(ctrl.tag).toBe('a')
	})

	it('дельта узнаёт проп по обоим именам, как read', () => {
		const { context, binding } = bindButton()
		const aria = required(context.bundle?.get(TAriaPlugin), 'плагин aria')

		binding.writeChanged({ aria_label: 'Закрыть' })

		expect(aria.label).toBe('Закрыть')

		binding.writeChanged({ label: 'Открыть' })

		expect(aria.label).toBe('Открыть')
	})
})

/**
 * React, Solid и Svelte отдают связке полный набор пропсов на каждом проходе,
 * а не только изменившиеся. Раньше связка писала в ядро каждый заданный проп,
 * и смена любого другого откатывала к разметке то, что поменяли ядро или код
 * через инстанс. Теперь `writeAll` пишет лишь то, что сменилось с прошлого
 * набора, — как Vue, Angular и Web Components, которые сообщают только об
 * изменении.
 */
describe('связка · повторённый проп', () => {
	it('повторённый набор не откатывает то, что поменяло ядро', () => {
		const { ctrl, binding } = bindButton()

		binding.writeAll({ text: 'a', tag: 'span' })
		ctrl.text = 'из ядра'
		// Родитель перерисовался: сменился другой проп
		binding.writeAll({ text: 'a', tag: 'a' })

		expect(ctrl.text).toBe('из ядра')
		expect(ctrl.tag).toBe('a')
	})

	it('сменившееся в наборе значение пишется поверх ядра', () => {
		const { ctrl, binding } = bindButton()

		binding.writeAll({ text: 'a' })
		ctrl.text = 'из ядра'
		binding.writeAll({ text: 'b' })

		expect(ctrl.text).toBe('b')
	})

	it('снятый проп сбрасывается к умолчанию, даже если ядро его меняло', () => {
		const { ctrl, binding } = bindButton()

		binding.writeAll({ text: 'a' })
		ctrl.text = 'из ядра'
		binding.writeAll({})

		expect(ctrl.text).toBe('')
	})

	it('дельта с прошлым значением не сверяется: ключ в ней — уже изменение', () => {
		const { ctrl, binding } = bindButton()

		binding.writeChanged({ text: 'a' })
		ctrl.text = 'из ядра'
		// Web Components: `el.text = 'a'` ещё раз — запись, а не повтор набора
		binding.writeChanged({ text: 'a' })

		expect(ctrl.text).toBe('a')
	})
})

/**
 * Начальные значения пропсов применяет сборка контекста — одна точка для всех
 * шести адаптеров. Раньше их дописывал первый проход каждого адаптера, и у
 * каждого своим способом: Vue отдельной записью перед `watch`, React, Solid и
 * Svelte первым `writeAll`, Angular и Web Components первой дельтой.
 */
describe('сборка · начальные значения пропсов', () => {
	it('внешний ctrl получает то, что отличается от умолчания', () => {
		const ctrl = new TButton({ text: 'своё', tag: 'a' })

		// `tag: 'button'` — умолчание декларации: ничего не задаёт
		createAdapterContext(ButtonDescriptor(), {
			ctrl,
			props: { text: 'из разметки', tag: 'button' },
		})

		expect(ctrl.text).toBe('из разметки')
		expect(ctrl.tag).toBe('a')
	})

	it('запись идёт сеттером: ядро эмитит триггер', () => {
		const ctrl = new TButton()
		const changes = vi.fn()

		ctrl.events.on('change:text', changes)
		createAdapterContext(ButtonDescriptor(), { ctrl, props: { text: 'a' } })

		expect(changes).toHaveBeenCalledTimes(1)
	})

	it('непереданный проп внешний ctrl не трогает', () => {
		const ctrl = new TButton({ text: 'своё' })

		createAdapterContext(ButtonDescriptor(), { ctrl, props: { text: undefined } })

		expect(ctrl.text).toBe('своё')
	})

	it('проп плагина доходит и до плагина внешнего ctrl', () => {
		const ctrl = new TButton()

		createAdapterContext(ButtonDescriptor(), { ctrl, props: { aria_label: 'Закрыть' } })

		expect(ctrl.aria.get('aria-label')).toBe('Закрыть')
	})

	it('свой инстанс получил пропсы ядра конструктором — второй раз их не пишут', () => {
		// Геттер отдаёт копию, как `items` фасада коллекции: сверка «то же
		// значение» не узнала бы его, и сеттер пересоздал бы элементы
		class TSample {
			static defaultValues = { items: [] }
			sets = 0
			private _items: string[]

			constructor(props: { items?: string[] } = {}) {
				this._items = [...(props.items ?? [])]
			}

			get items(): string[] {
				return [...this._items]
			}

			set items(value: string[]) {
				this.sets++
				this._items = [...value]
			}
		}

		const descriptor = defineComponent({
			ctor: TSample,
			contribution: { props: { items: { type: Array } } },
		})
		const context = createAdapterContext(descriptor, { props: { items: ['a'] } })

		expect(context.instance.items).toEqual(['a'])
		expect(context.instance.sets).toBe(0)
	})

	it('память связки начинается с тех же пропсов: повтор не откатывает код', () => {
		const ctrl = new TButton()
		const context = createAdapterContext(ButtonDescriptor(), {
			ctrl,
			props: { text: 'из разметки' },
		})
		const binding = bindComponent(context, CallbackProfile)

		ctrl.text = 'из кода'
		binding.writeAll({ text: 'из разметки' })

		expect(ctrl.text).toBe('из кода')
	})

	it('пересборка на том же ctrl — снова инициализация', () => {
		// React пересобирает контекст, заново устанавливая эффекты
		// (StrictMode, `<Activity>`): это такое же монтирование
		const ctrl = new TButton()
		const props = { text: 'из разметки' }

		createAdapterContext(ButtonDescriptor(), { ctrl, props }).destroy()
		ctrl.text = 'из кода'
		createAdapterContext(ButtonDescriptor(), { ctrl, props })

		expect(ctrl.text).toBe('из разметки')
	})
})
