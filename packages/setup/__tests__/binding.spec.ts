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
import { TButton, TFrame, TIcon, TSelect, TTabsItem } from '@soldy-ui/core'
import { TAnchorPlugin, TAriaPlugin, TIconLayoutPlugin } from '@soldy-ui/plugins'
import {
	ButtonDescriptor,
	FrameDescriptor,
	IconDescriptor,
	SelectDescriptor,
	TabsItemDescriptor,
	createAdapterContext,
	defineComponent,
	TName,
	TSurface,
} from '@soldy-ui/setup'
import type { IAdapterProfile, TEventSink, TStateListener } from '@soldy-ui/setup'
import { CallbackProfile, installResizeObserverStub, required } from './helpers'

/** Дескриптор с одним пропом — чтобы проверить конфиг статического слоя. */
const single = (prop: Record<string, unknown>) =>
	defineComponent({ ctor: class {}, contribution: { props: { [prop.name as string]: prop } } })

describe('поверхность', () => {
	it('одна на пару «дескриптор × профиль»', () => {
		const other: IAdapterProfile = { naming: CallbackProfile.naming }

		expect(TSurface.of(ButtonDescriptor(), CallbackProfile)).toBe(
			TSurface.of(ButtonDescriptor(), CallbackProfile),
		)
		expect(TSurface.of(ButtonDescriptor(), other)).not.toBe(
			TSurface.of(ButtonDescriptor(), CallbackProfile),
		)
	})

	it('имена — по стратегии профиля', () => {
		const surface = TSurface.of(ButtonDescriptor(), CallbackProfile)
		const label = required(
			surface.props.find((prop) => prop.spec.name.getName() === 'aria:label'),
			'проп aria:label',
		)

		expect(label.exportName).toBe('aria_label')
		expect(surface.events.map((event) => event.exportName)).toContain('onElementReady')
	})
})

describe('поверхность · умолчание пропа из декларации', () => {
	it('без ключа в декларации default нет и в конфиге статического слоя', () => {
		const surface = TSurface.of(single({ name: 'text', type: String }), CallbackProfile)
		const config = surface.exportProps.text

		expect(config).toEqual({ type: String })
		expect(Object.hasOwn(config, 'default')).toBe(false)
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
		const config = TSurface.of(descriptor, CallbackProfile).exportProps.closable

		expect(Object.hasOwn(config, 'default')).toBe(true)
		expect(config.default).toBeUndefined()
	})

	it('protected-проп наружу не уходит', () => {
		const surface = TSurface.of(
			single({ name: 'present', type: Boolean, protected: true }),
			CallbackProfile,
		)

		expect(surface.exportProps).toEqual({})
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

		expect(TSurface.of(descriptor, CallbackProfile).exportEvents).toEqual([
			'onShow',
			'onChangeRendered',
		])
	})
})

describe('связка · проброс пропсов в корень', () => {
	function forward(props: object): object {
		const context = createAdapterContext(ButtonDescriptor(), { props })

		try {
			return context.connect(CallbackProfile).forward(props)
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
		const state = context.connect(CallbackProfile).state.getSnapshot()

		expect(state.text).toBe('hi')
		expect('ctrl' in state).toBe(false)
	})

	it('изменение в ядре приходит подписчику под именем фреймворка', () => {
		const ctrl = new TButton()
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const write = vi.fn()
		const off = context.connect(CallbackProfile).state.subscribe(write)

		write.mockClear()
		ctrl.text = 'новый'

		expect(write).toHaveBeenCalledWith('text', 'новый')

		off()
		write.mockClear()
		ctrl.text = 'после отписки'

		expect(write).not.toHaveBeenCalled()
	})

	it('запись из фреймворка: то же значение не пишется', () => {
		const ctrl = new TButton({ text: 'a' })
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const binding = context.connect(CallbackProfile)
		const changes = vi.fn()

		ctrl.events.on('change:text', changes)

		binding.inputs.full({ text: 'a' })
		binding.inputs.full({ text: 'b' })
		binding.inputs.full({ text: 'b' })

		expect(ctrl.text).toBe('b')
		expect(changes).toHaveBeenCalledTimes(1)
	})

	it('одно событие ядра — один проброс, даже если триггер у двух свойств', () => {
		// `present` повторяет триггеры `rendered` и `visible`
		const ctrl = new TButton()
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const emit = vi.fn()

		context.connect(CallbackProfile).events.listen(emit)
		ctrl.rendered = false

		expect(emit.mock.calls.filter(([name]) => name === 'onChangeRendered')).toHaveLength(1)
	})

	it('проп читается по имени фреймворка и по сырому имени', () => {
		const context = createAdapterContext(ButtonDescriptor(), {})
		const binding = context.connect(CallbackProfile)
		const label = required(
			[...binding.inputs].find(
				(input) => input.line.spec.name.getName() === new TName('label', 'aria').getName(),
			),
			'проп aria:label',
		)

		expect(label.pick({ aria_label: 'Закрыть' })).toBe('Закрыть')
		expect(label.pick({ label: 'Закрыть' })).toBe('Закрыть')
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
		const binding = createAdapterContext(ButtonDescriptor(), { props: { text: 'a' } }).connect(
			CallbackProfile,
		)
		const write = vi.fn<TStateListener>()

		binding.state.subscribe(write)

		const names = write.mock.calls.map(([name]) => name)

		expect(names.sort()).toEqual(Object.keys(binding.state.getSnapshot()).sort())
		expect(write).toHaveBeenCalledWith('text', 'a')
	})

	it('изменение между созданием связки и подпиской не теряется', () => {
		// Так у React: рендер по снимку, подписка — при коммите
		const ctrl = new TButton({ text: 'a' })
		const binding = createAdapterContext(ButtonDescriptor(), { ctrl }).connect(CallbackProfile)
		const rendered = binding.state.getSnapshot()
		const write = vi.fn()

		ctrl.text = 'b'

		expect(binding.state.getSnapshot()).toBe(rendered)

		binding.state.subscribe(write)

		expect(write).toHaveBeenCalledWith('text', 'b')
		expect(binding.state.getSnapshot()).not.toBe(rendered)
		expect(binding.state.getSnapshot().text).toBe('b')
	})

	it('снимок тот же, пока ничего не сменилось: составные свойства сверяются по содержимому', () => {
		// `classes`, `aria`, `attrs`, `dataset` отдают новый объект на каждое
		// чтение — по ссылке каждое монтирование выглядело бы изменением
		const binding = createAdapterContext(ButtonDescriptor(), {}).connect(CallbackProfile)
		const rendered = binding.state.getSnapshot()

		binding.state.subscribe(() => {})

		expect(binding.state.getSnapshot()).toBe(rendered)
	})

	it('второй подписчик получает всё состояние, первый — только изменения', () => {
		const ctrl = new TButton()
		const binding = createAdapterContext(ButtonDescriptor(), { ctrl }).connect(CallbackProfile)
		const first = vi.fn()
		const second = vi.fn()

		binding.state.subscribe(first)
		first.mockClear()
		binding.state.subscribe(second)

		expect(first).not.toHaveBeenCalled()
		expect(second).toHaveBeenCalledWith('text', '')
	})

	it('после отписки всех — новая подписка снова перечитывает ядро', () => {
		// StrictMode: подписка, отписка и снова подписка
		const ctrl = new TButton()
		const binding = createAdapterContext(ButtonDescriptor(), { ctrl }).connect(CallbackProfile)
		const write = vi.fn()

		binding.state.subscribe(() => {})()
		ctrl.text = 'пока без подписчиков'
		binding.state.subscribe(write)

		expect(write).toHaveBeenCalledWith('text', 'пока без подписчиков')
	})

	it('модель: `update:<prop>` после события ядра и только на изменение', () => {
		const profile: IAdapterProfile = {
			naming: CallbackProfile.naming,
			model: (name) => `update:${name}`,
		}
		const ctrl = new TButton()
		const binding = createAdapterContext(ButtonDescriptor(), { ctrl }).connect(profile)
		const emit = vi.fn<TEventSink>()

		expect(binding.surface.exportEvents).toContain('update:text')
		// Защищённое свойство снаружи не пишут — модели у него нет
		expect(binding.surface.exportEvents).not.toContain('update:present')

		binding.state.subscribe(() => {})
		binding.events.listen(emit)

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

	return { ctrl, context, binding: context.connect(CallbackProfile) }
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

		binding.inputs.full({})
		binding.inputs.full({ text: undefined, tag: undefined })

		// Умолчания деклараций — '' и 'button': сброса не было
		expect(ctrl.text).toBe('своё')
		expect(ctrl.tag).toBe('a')
		expect(changes).not.toHaveBeenCalled()
	})

	it('снятый проп возвращается к умолчанию декларации: text — пустая строка', () => {
		const { ctrl, binding } = bindButton()

		binding.inputs.full({ text: 'a' })

		expect(ctrl.text).toBe('a')

		binding.inputs.full({ text: undefined })

		expect(ctrl.text).toBe('')
	})

	it('заданным проп считается и тогда, когда значение уже лежало в инстансе', () => {
		// Ядро уже держит то же значение, и запись пропускается — но проп задан
		const { ctrl, binding } = bindButton(new TButton({ text: 'a' }))

		binding.inputs.full({ text: 'a' })
		binding.inputs.full({})

		expect(ctrl.text).toBe('')
	})

	it('проп, с которым собран контекст, тоже задан: снятый, он сбрасывается', () => {
		const context = createAdapterContext(ButtonDescriptor(), { props: { text: 'a' } })
		const binding = context.connect(CallbackProfile)

		binding.inputs.full({})

		expect(context.instance.text).toBe('')
	})

	it('трёхзначный проп возвращается к «как у владельца»: closable элемента Tabs', () => {
		const ctrl = new TTabsItem()
		const binding = createAdapterContext(TabsItemDescriptor(), { ctrl }).connect(
			CallbackProfile,
		)

		binding.inputs.full({ closable: true })

		expect(ctrl.closable).toBe(true)

		binding.inputs.full({ closable: undefined })

		expect(ctrl.closable).toBeUndefined()
	})

	/*
	 * «Не задано» — тоже умолчание, и объявлено ключом. Пока у пропсов ниже
	 * ключа не было, снятый проп оставался с прежним значением во всех адаптерах.
	 */

	it('снятое имя убирает aria-label: у плагина имени по умолчанию нет', () => {
		const { ctrl, binding } = bindButton()

		binding.inputs.full({ aria_label: 'Закрыть' })

		expect(ctrl.aria.get('aria-label')).toBe('Закрыть')

		binding.inputs.full({})

		expect(ctrl.aria.has('aria-label')).toBe(false)
	})

	it('снятые width и height иконки уходят из стилей: размер снова даёт size', () => {
		const ctrl = new TIcon()
		const context = createAdapterContext(IconDescriptor(), { ctrl })
		const binding = context.connect(CallbackProfile)
		const layout = required(context.bundle?.get(TIconLayoutPlugin), 'плагин layout')

		binding.inputs.full({ width: 24, height: '2em' })

		expect(layout.styles).toEqual({ width: '24px', height: '2em' })

		binding.inputs.full({})

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
		const binding = context.connect(CallbackProfile)
		const anchor = required(context.bundle?.get(TAnchorPlugin), 'плагин anchor')
		const element = document.createElement('button')

		binding.inputs.full({ anchor_anchor: element })

		expect(anchor.anchor).toBe(element)

		binding.inputs.full({})

		expect(anchor.anchor).toBeNull()
	})

	it('после сброса проп снова не задан: повторное снятие ничего не пишет', () => {
		const { ctrl, binding } = bindButton()
		const changes = vi.fn()

		binding.inputs.full({ text: 'a' })
		ctrl.events.on('change:text', changes)

		binding.inputs.full({})
		// Ядро поменяло значение само — повторное снятие его не трогает
		ctrl.text = 'из ядра'
		binding.inputs.full({})

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
		const binding = createAdapterContext(descriptor, { ctrl }).connect(CallbackProfile)

		binding.inputs.full({ declared: 'задано', free: 'задано' })
		binding.inputs.full({})

		expect(ctrl.declared).toBe('умолчание')
		expect(ctrl.free).toBe('задано')
	})

	it('дельта пишет только свои ключи: остальные пропсы не сбрасываются', () => {
		const { ctrl, binding } = bindButton()

		binding.inputs.delta({ text: 'a', tag: 'span' })
		binding.inputs.delta({ tag: 'a' })

		expect(ctrl.text).toBe('a')
		expect(ctrl.tag).toBe('a')

		// Ключ есть, значение `undefined` — проп сняли
		binding.inputs.delta({ text: undefined })

		expect(ctrl.text).toBe('')
		expect(ctrl.tag).toBe('a')
	})

	it('дельта узнаёт проп по обоим именам, как read', () => {
		const { context, binding } = bindButton()
		const aria = required(context.bundle?.get(TAriaPlugin), 'плагин aria')

		binding.inputs.delta({ aria_label: 'Закрыть' })

		expect(aria.label).toBe('Закрыть')

		binding.inputs.delta({ label: 'Открыть' })

		expect(aria.label).toBe('Открыть')
	})
})

/**
 * React, Solid и Svelte отдают связке полный набор пропсов на каждом проходе,
 * а не только изменившиеся. Раньше связка писала в ядро каждый заданный проп,
 * и смена любого другого откатывала к разметке то, что поменяли ядро или код
 * через инстанс. Теперь `inputs.full` пишет лишь то, что сменилось с прошлого
 * набора, — как Vue, Angular и Web Components, которые сообщают только об
 * изменении.
 */
describe('связка · повторённый проп', () => {
	it('повторённый набор не откатывает то, что поменяло ядро', () => {
		const { ctrl, binding } = bindButton()

		binding.inputs.full({ text: 'a', tag: 'span' })
		ctrl.text = 'из ядра'
		// Родитель перерисовался: сменился другой проп
		binding.inputs.full({ text: 'a', tag: 'a' })

		expect(ctrl.text).toBe('из ядра')
		expect(ctrl.tag).toBe('a')
	})

	it('сменившееся в наборе значение пишется поверх ядра', () => {
		const { ctrl, binding } = bindButton()

		binding.inputs.full({ text: 'a' })
		ctrl.text = 'из ядра'
		binding.inputs.full({ text: 'b' })

		expect(ctrl.text).toBe('b')
	})

	it('снятый проп сбрасывается к умолчанию, даже если ядро его меняло', () => {
		const { ctrl, binding } = bindButton()

		binding.inputs.full({ text: 'a' })
		ctrl.text = 'из ядра'
		binding.inputs.full({})

		expect(ctrl.text).toBe('')
	})

	it('дельта с прошлым значением не сверяется: ключ в ней — уже изменение', () => {
		const { ctrl, binding } = bindButton()

		binding.inputs.delta({ text: 'a' })
		ctrl.text = 'из ядра'
		// Web Components: `el.text = 'a'` ещё раз — запись, а не повтор набора
		binding.inputs.delta({ text: 'a' })

		expect(ctrl.text).toBe('a')
	})

	/*
	 * Литерал массива в разметке (`value={['msk', 'tver']}` в React,
	 * `:value="[20, 80]"` во Vue) — новый объект на каждом проходе родителя.
	 * Вход сверяет его с прошлым значением фреймворка по содержимому, тем же
	 * правилом, что линия и состояние. Пока сверка шла по ссылке, перерисовка
	 * родителя по постороннему поводу откатывала выбор пользователя к разметке.
	 */

	it('литерал массива с тем же содержимым — повтор: выбор, сделанный в ядре, остаётся', () => {
		const { ctrl, binding } = bindSelect()

		binding.inputs.full({ value: ['msk', 'tver'] })
		// Пользователь снял выбор с Твери
		ctrl.value = ['msk']
		// Родитель перерисовался из-за другого пропа, литерал — новый объект
		binding.inputs.full({ value: ['msk', 'tver'], placeholder: 'Город' })

		expect(ctrl.value).toEqual(['msk'])
		expect(ctrl.placeholder).toBe('Город')
	})

	it('массив с другим содержимым пишется поверх ядра', () => {
		const { ctrl, binding } = bindSelect()

		binding.inputs.full({ value: ['msk', 'tver'] })
		ctrl.value = ['msk']
		binding.inputs.full({ value: ['msk', 'tula'] })

		expect(ctrl.value).toEqual(['msk', 'tula'])
	})

	it('снятый массив сбрасывается к умолчанию, даже если ядро его меняло', () => {
		const { ctrl, binding } = bindSelect()

		binding.inputs.full({ value: ['msk', 'tver'] })
		ctrl.value = ['msk']
		binding.inputs.full({})

		expect(ctrl.value).toBeUndefined()
	})

	it('дельта с массивом того же содержимого — всё равно команда', () => {
		const { ctrl, binding } = bindSelect()

		binding.inputs.delta({ value: ['msk', 'tver'] })
		ctrl.value = ['msk']
		// Web Components: `el.value = ['msk', 'tver']` ещё раз — запись, а не повтор набора
		binding.inputs.delta({ value: ['msk', 'tver'] })

		expect(ctrl.value).toEqual(['msk', 'tver'])
	})

	it('сверка поверхностная: литерал с новыми объектами внутри — смена', () => {
		// `items={[{ value: 'a' }]}` — объекты внутри новые на каждом проходе.
		// Глубже одного уровня не сверяют ни вход, ни линия, ни состояние
		class TSample {
			static defaultValues = { items: [] }
			sets = 0
			private _items: object[] = []

			get items(): object[] {
				return [...this._items]
			}

			set items(value: object[]) {
				this.sets++
				this._items = [...value]
			}
		}

		const ctrl = new TSample()
		const descriptor = defineComponent({
			ctor: TSample,
			contribution: { props: { items: { type: Array } } },
		})
		const binding = createAdapterContext(descriptor, { ctrl }).connect(CallbackProfile)

		binding.inputs.full({ items: [{ value: 'a' }] })
		binding.inputs.full({ items: [{ value: 'a' }] })

		expect(ctrl.sets).toBe(2)
	})
})

/** Связка над внешним Select: значение при множественном выборе — массив. */
function bindSelect(ctrl = new TSelect()) {
	const context = createAdapterContext(SelectDescriptor(), { ctrl })

	return { ctrl, binding: context.connect(CallbackProfile) }
}

/**
 * Начальные значения пропсов применяет сборка контекста — одна точка для всех
 * шести адаптеров. Раньше их дописывал первый проход каждого адаптера, и у
 * каждого своим способом: Vue отдельной записью перед `watch`, React, Solid и
 * Svelte первым `inputs.full`, Angular и Web Components первой дельтой.
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
		const binding = context.connect(CallbackProfile)

		ctrl.text = 'из кода'
		binding.inputs.full({ text: 'из разметки' })

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

	/*
	 * Значение, пришедшее в инстанс без события, плагин берёт у инстанса сам:
	 * свой инстанс получает размер конструктором, а внешнему `ctrl` сборка не
	 * пишет то, что в нём уже лежит. Раньше плагин раскладки иконки только
	 * следил за сменой размера, и заданный в разметке размер появлялся в стилях
	 * лишь после первой смены.
	 */

	it('размер иконки из пропсов виден в стилях сразу', () => {
		const context = createAdapterContext(IconDescriptor(), {
			props: { width: 24, height: '2em' },
		})
		const layout = required(context.bundle?.get(TIconLayoutPlugin), 'плагин layout')

		expect(layout.styles).toEqual({ width: '24px', height: '2em' })
		// Фреймворк получает то же подпиской на связку
		expect(context.connect(CallbackProfile).state.getSnapshot().layout_styles).toEqual({
			width: '24px',
			height: '2em',
		})
	})

	it('внешний ctrl с размером — тоже: запись пропа пропущена, стиль уже есть', () => {
		const ctrl = new TIcon({ width: 24 })
		const context = createAdapterContext(IconDescriptor(), { ctrl, props: { width: 24 } })
		const layout = required(context.bundle?.get(TIconLayoutPlugin), 'плагин layout')

		// Незаданная высота стиля не ставит: её даёт `size`
		expect(layout.styles).toEqual({ width: '24px', height: '' })
	})
})
