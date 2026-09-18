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
import { TButton } from '@soldy/core'
import {
	ButtonDescriptor,
	bindComponent,
	createAdapterContext,
	defineComponent,
	surfaceOf,
} from '@soldy/setup'
import type { IAdapterProfile } from '@soldy/setup'
import { CallbackProfile, required } from './helpers'

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
	it('без ключа в декларации default в конфиге нет', () => {
		const config = surfaceOf(single({ name: 'text', type: String }), CallbackProfile)
			.exportProps.text

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
		const config = surfaceOf(descriptor, CallbackProfile).exportProps.closable

		expect(Object.hasOwn(config, 'default')).toBe(true)
		expect(config.default).toBeUndefined()
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
	it('стартовое состояние — свойства с триггерами', () => {
		const context = createAdapterContext(ButtonDescriptor(), { props: { text: 'hi' } })
		const state = bindComponent(context, CallbackProfile).state()

		expect(state.text).toBe('hi')
		expect('ctrl' in state).toBe(false)
	})

	it('изменение в ядре приходит в запись под именем фреймворка', () => {
		const ctrl = new TButton()
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const write = vi.fn()
		const off = bindComponent(context, CallbackProfile).bindOutput(write)

		ctrl.text = 'новый'

		expect(write).toHaveBeenCalledWith(expect.objectContaining({ exportName: 'text' }), 'новый')

		off()
		ctrl.text = 'после отписки'

		expect(write).toHaveBeenCalledTimes(1)
	})

	it('запись из фреймворка: то же значение и undefined пропускаются', () => {
		const ctrl = new TButton({ text: 'a' })
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const binding = bindComponent(context, CallbackProfile)
		const changes = vi.fn()

		ctrl.events.on('change:text', changes)

		binding.writeAll({ text: 'a' })
		binding.writeAll({ text: undefined })
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
