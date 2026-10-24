/**
 * Связка поля формы `Field` с контролом — без фреймворка.
 *
 * Поле опускает по лифту себя и свой плагин связок (`TFieldExtension`), а
 * контрол внутри берёт связку своим расширением (`TFieldControlExtension`) по
 * фазам своего контекста. Сборка пишет контролу его же: ошибку поля, ссылки на
 * видимые части (через его `TAriaPlugin`) и, labelable-контролу без своего
 * `id`, `id` поля. Принятый контрол подписывается на поле и сообщает ему о
 * себе: по его `id` и labelable плагин решает `for` подписи. Снятый — всё
 * назад. Лифт здесь — в памяти, без дерева: значение, которое контрол опустил
 * своему поддереву, видит следующий контрол, как вложенный.
 *
 * Разметка и клик по подписи — в тестах адаптера (`ui/vue/__tests__/field.spec.ts`)
 * и браузерном спеке стенда.
 */

import { describe, it, expect } from 'vitest'
import { TFieldIdsPlugin } from '@soldy-ui/plugins'
import {
	CheckBoxDescriptor,
	DateInputDescriptor,
	DatePickerDescriptor,
	FieldDescriptor,
	InputDescriptor,
	NumberInputDescriptor,
	RadioGroupDescriptor,
	SelectDescriptor,
	SliderDescriptor,
	TextareaDescriptor,
	TFieldControlExtension,
	TFieldExtension,
	createAdapterContext,
} from '@soldy-ui/setup'
import type {
	IAdapterContext,
	IComponentDescriptor,
	IFieldLink,
	IPluginsContract,
	TContextContract,
	TElevatorFactory,
	IFieldControl,
} from '@soldy-ui/setup'
import { FIELD_ELEVATOR } from '../content/extensions/field/keys'
import {
	createElevatorFactory,
	idPluginOf,
	leftovers,
	required,
	spyBus,
	subscribed,
} from './helpers'

type TFieldProps = {
	label?: string
	helper?: string
	error?: string
	invalid?: boolean
}

/** Поле: связка опущена по лифту, плагин связок — в его наборе. */
function field(elevator: TElevatorFactory, props: TFieldProps = {}) {
	const context = createAdapterContext(FieldDescriptor(), { props, mountId: 'f' }).use(
		TFieldExtension,
		{ elevator },
	)

	context.attach()

	const ids = required(context.bundle?.get(TFieldIdsPlugin), 'плагин связок поля')

	return { field: context.instance, ids, context }
}

/** Контекст контрола: тип инстанса — из дескриптора. */
type TControlContext<
	TInstance extends IFieldControl,
	TPlugins extends IPluginsContract,
> = IAdapterContext<TContextContract<TInstance, TPlugins>>

/** Контрол под тем же лифтом — собранный, ещё не принятый. */
function assemble<TInstance extends IFieldControl, TPlugins extends IPluginsContract>(
	elevator: TElevatorFactory,
	descriptor: IComponentDescriptor<TContextContract<TInstance, TPlugins>>,
	props: object = {},
	embedded?: string,
): TControlContext<TInstance, TPlugins> {
	return createAdapterContext(descriptor, { props, embedded, mountId: 'c' }).use(
		TFieldControlExtension,
		{ elevator },
	)
}

/** Контрол, принятый сразу после сборки, как во Vue. */
function control<TInstance extends IFieldControl, TPlugins extends IPluginsContract>(
	elevator: TElevatorFactory,
	descriptor: IComponentDescriptor<TContextContract<TInstance, TPlugins>>,
	props: object = {},
): TControlContext<TInstance, TPlugins> {
	const context = assemble(elevator, descriptor, props)

	context.attach()

	return context
}

/** Атрибут набора `aria` инстанса контекста. */
function ariaOf(
	context: { instance: { aria: { get(name: string): string | undefined } } },
	name: string,
) {
	return context.instance.aria.get(name)
}

/** Связка, которую поле опустило: соседний контрол видит её снова. */
function sibling(store: Map<unknown, unknown>, link: unknown): void {
	store.set(FIELD_ELEVATOR, link)
}

describe('без поля', () => {
	it('контрол — как был: ни ошибки, ни id, ни ссылок', () => {
		const { factory } = createElevatorFactory()
		const input = control(factory, InputDescriptor())

		expect(input.instance.invalid).toBe(false)
		expect(idPluginOf(input).id).toBeUndefined()
		expect(ariaOf(input, 'aria-describedby')).toBeUndefined()
	})
})

describe('сборка: своё контролу — с первой отрисовки', () => {
	it('Input: ошибка поля, id поля и ссылка на подсказку — ещё до приёма', () => {
		const { factory } = createElevatorFactory()
		const { field: owner } = field(factory, { label: 'Почта', helper: 'Подсказка' })

		owner.invalid = true

		const input = assemble(factory, InputDescriptor())

		expect(input.instance.invalid).toBe(true)
		expect(idPluginOf(input).id).toBe('f-control')
		expect(ariaOf(input, 'aria-describedby')).toBe('f-helper')
		// Labelable-контрол называет `for` подписи, а не ссылка
		expect(ariaOf(input, 'aria-labelledby')).toBeUndefined()
		expect(owner.labelAria.get('for')).toBe('f-control')
	})

	/**
	 * Поле числа — labelable, как Input: `aria` у него на вложенном `<input>`,
	 * и подпись называет его своим `for`, а не ссылкой.
	 */
	it('NumberInput: labelable — id поля и for подписи, справка ссылкой', () => {
		const { factory } = createElevatorFactory()
		const { field: owner } = field(factory, { label: 'Количество', helper: 'Подсказка' })
		const number = assemble(factory, NumberInputDescriptor())

		expect(number.instance.labelable).toBe(true)
		expect(idPluginOf(number).id).toBe('f-control')
		expect(ariaOf(number, 'aria-describedby')).toBe('f-helper')
		expect(ariaOf(number, 'aria-labelledby')).toBeUndefined()
		expect(owner.labelAria.get('for')).toBe('f-control')
	})

	it('свой id контрола главнее: id поля ему не задаётся', () => {
		const { factory } = createElevatorFactory()

		field(factory)

		const input = assemble(factory, InputDescriptor(), { id: 'own' })

		expect(idPluginOf(input).id).toBe('own')
	})

	it('группа: id не задаётся, подпись — ссылкой aria-labelledby', () => {
		const { factory } = createElevatorFactory()

		field(factory, { label: 'Дата', helper: 'Подсказка' })

		const date = assemble(factory, DateInputDescriptor())

		expect(idPluginOf(date).id).toBeUndefined()
		expect(ariaOf(date, 'aria-labelledby')).toBe('f-label')
		expect(ariaOf(date, 'aria-describedby')).toBe('f-helper')
	})

	it('своё имя группы главнее подписи поля', () => {
		const { factory } = createElevatorFactory()

		field(factory, { label: 'Дата' })

		const date = assemble(factory, DateInputDescriptor(), { aria_label: 'Своё' })

		expect(ariaOf(date, 'aria-label')).toBe('Своё')
		expect(ariaOf(date, 'aria-labelledby')).toBeUndefined()
	})

	it('пояснение поля — перед своим', () => {
		const { factory } = createElevatorFactory()

		field(factory, { helper: 'Подсказка' })

		const input = assemble(factory, InputDescriptor(), { aria_describedBy: 'own-hint' })

		expect(ariaOf(input, 'aria-describedby')).toBe('f-helper own-hint')
	})

	/**
	 * Счётчик Textarea — своя часть контрола: ссылку на него плагин связок
	 * Textarea пишет третьим входом `TAriaPlugin`, между справкой поля и своим
	 * пояснением.
	 */
	it('Textarea со счётчиком: справка поля, счётчик, своё пояснение — ещё до приёма', () => {
		const { factory } = createElevatorFactory()

		field(factory, { label: 'О себе', helper: 'Подсказка' })

		const textarea = assemble(factory, TextareaDescriptor(), {
			counter: true,
			aria_describedBy: 'own-hint',
		})

		expect(textarea.instance.counterAria.get('id')).toBe('c-counter')
		expect(ariaOf(textarea, 'aria-describedby')).toBe('f-helper c-counter own-hint')
	})

	it('сборка чужих шин не трогает: на поле и его плагине подписок нет', () => {
		const { factory } = createElevatorFactory()
		const { field: owner, ids } = field(factory)
		const buses = [...spyBus('поле', owner), ...spyBus('плагин связок', ids)]

		assemble(factory, InputDescriptor())

		expect(leftovers(buses)).toEqual([])
		expect(ids.bound).toBe(false)
	})
})

describe('приём: связка контрола', () => {
	it('ошибка поля и видимая справка — за полем', () => {
		const { factory } = createElevatorFactory()
		const { field: owner } = field(factory, { helper: 'Подсказка', error: 'Нет @' })
		const input = control(factory, InputDescriptor())

		owner.invalid = true

		expect(input.instance.invalid).toBe(true)
		expect(ariaOf(input, 'aria-describedby')).toBe('f-error')

		owner.invalid = false

		expect(input.instance.invalid).toBe(false)
		expect(ariaOf(input, 'aria-describedby')).toBe('f-helper')
	})

	it('for подписи — на id контрола, и за его сменой', () => {
		const { factory } = createElevatorFactory()
		const { field: owner, ids } = field(factory, { label: 'Почта' })
		const input = control(factory, InputDescriptor(), { id: 'own' })

		expect(ids.bound).toBe(true)
		expect(owner.labelAria.get('for')).toBe('own')

		idPluginOf(input).id = 'other'

		expect(owner.labelAria.get('for')).toBe('other')

		// Свой id сняли — снова id поля
		idPluginOf(input).id = undefined

		expect(idPluginOf(input).id).toBe('f-control')
		expect(owner.labelAria.get('for')).toBe('f-control')
	})

	it('группа: for снят, подпись — ссылкой', () => {
		const { factory } = createElevatorFactory()
		const { field: owner } = field(factory, { label: 'Доставка' })
		const group = control(factory, RadioGroupDescriptor())

		expect(owner.labelAria.has('for')).toBe(false)
		expect(ariaOf(group, 'aria-labelledby')).toBe('f-label')

		owner.label = ''

		expect(ariaOf(group, 'aria-labelledby')).toBeUndefined()
	})

	it('Select: id поля — его id, ссылки — в его набор', () => {
		const { factory } = createElevatorFactory()
		const { field: owner } = field(factory, { label: 'Город', helper: 'Подсказка' })
		const select = control(factory, SelectDescriptor())

		owner.invalid = true

		expect(idPluginOf(select).id).toBe('f-control')
		expect(select.instance.field.invalid).toBe(true)
		expect(owner.labelAria.get('for')).toBe('f-control')
		expect(ariaOf(select, 'aria-describedby')).toBe('f-helper')
	})

	it('DatePicker — группа: ошибка его полям, for снят', () => {
		const { factory } = createElevatorFactory()
		const { field: owner } = field(factory, { label: 'Дата', invalid: true })
		const picker = control(factory, DatePickerDescriptor())

		expect(picker.instance.invalid).toBe(true)
		expect(picker.instance.field.invalid).toBe(true)
		expect(owner.labelAria.has('for')).toBe(false)
		expect(ariaOf(picker, 'aria-labelledby')).toBe('f-label')
	})

	/**
	 * У ползунка `id` поля нет: канала, кроме `aria`, у него нет, и `id` от поля
	 * ложится туда — на элемент, который называет подпись.
	 */
	it('labelable-контрол без id поля: id поля — в его aria, снятие его убирает', () => {
		const { factory } = createElevatorFactory()
		const { field: owner } = field(factory, { label: 'Громкость' })
		const slider = control(factory, SliderDescriptor())
		const instance = slider.instance

		expect(instance.labelable).toBe(true)
		expect(ariaOf(slider, 'id')).toBe('f-control')
		expect(owner.labelAria.get('for')).toBe('f-control')

		slider.destroy()

		expect(instance.aria.has('id')).toBe(false)
	})

	/**
	 * У нескольких ручек ползунок — группа: `for` назвал бы одно поле из них, а
	 * имя подписи на полях перекрыло бы имена ручек. Подпись — ссылкой в его
	 * `aria`, а разметка кладёт имя и описание на корень.
	 */
	it('ползунок с несколькими ручками — группа: id не задаётся, for снят, подпись — ссылкой', () => {
		const { factory } = createElevatorFactory()
		const { field: owner } = field(factory, { label: 'Цена', helper: 'Подсказка' })
		const slider = control(factory, SliderDescriptor(), { value: [20, 80] })

		expect(slider.instance.labelable).toBe(false)
		expect(slider.instance.aria.has('id')).toBe(false)
		expect(owner.labelAria.has('for')).toBe(false)
		expect(ariaOf(slider, 'aria-labelledby')).toBe('f-label')
		expect(ariaOf(slider, 'aria-describedby')).toBe('f-helper')
	})

	it('число ручек сменилось после приёма — id поля, ссылка и for за ним', () => {
		const { factory } = createElevatorFactory()
		const { field: owner } = field(factory, { label: 'Цена' })
		const slider = control(factory, SliderDescriptor())
		const instance = slider.instance

		instance.value = [20, 80]

		expect(instance.aria.has('id')).toBe(false)
		expect(ariaOf(slider, 'aria-labelledby')).toBe('f-label')
		expect(owner.labelAria.has('for')).toBe(false)

		instance.value = 50

		expect(ariaOf(slider, 'id')).toBe('f-control')
		expect(ariaOf(slider, 'aria-labelledby')).toBeUndefined()
		expect(owner.labelAria.get('for')).toBe('f-control')
	})
})

describe('снятие: записанное — назад', () => {
	it('ошибка, id поля и ссылки сняты, for — снова на id поля, связка свободна', () => {
		const { factory } = createElevatorFactory()
		const { field: owner, ids } = field(factory, { helper: 'Подсказка', invalid: true })
		const input = control(factory, InputDescriptor())
		const instance = input.instance
		const idPlugin = idPluginOf(input)

		input.destroy()

		expect(instance.invalid).toBe(false)
		expect(idPlugin.id).toBeUndefined()
		expect(instance.aria.has('aria-describedby')).toBe(false)
		expect(owner.labelAria.get('for')).toBe('f-control')
		expect(ids.bound).toBe(false)
	})

	it('свой id контрола снятие не трогает', () => {
		const { factory } = createElevatorFactory()

		field(factory)

		const input = control(factory, InputDescriptor(), { id: 'own' })
		const idPlugin = idPluginOf(input)

		input.destroy()

		expect(idPlugin.id).toBe('own')
	})

	it('после снятия на шинах поля и контрола подписок связки нет', () => {
		const { factory } = createElevatorFactory()
		const { field: owner, ids } = field(factory)
		const buses = [...spyBus('поле', owner), ...spyBus('плагин связок', ids)]
		const input = control(factory, InputDescriptor())

		input.destroy()

		expect(leftovers(buses)).toEqual([])
	})

	it.each([
		['Input', (elevator: TElevatorFactory) => assemble(elevator, InputDescriptor())],
		['ползунок', (elevator: TElevatorFactory) => assemble(elevator, SliderDescriptor())],
	])('%s: принятый контрол слушает свой labelable, снятие отписывает', (_name, build) => {
		const { factory } = createElevatorFactory()

		field(factory)

		const assembled = build(factory)
		const bus = spyBus('контрол', assembled.instance)

		assembled.attach()

		expect(subscribed(bus)).toContain('контрол: change:labelable')

		assembled.destroy()

		expect(leftovers(bus)).toEqual([])
	})

	it('принятый контрол слушает change:id своего TIdPlugin, снятие отписывает', () => {
		const { factory } = createElevatorFactory()

		field(factory)

		const assembled = assemble(factory, InputDescriptor())
		const bus = spyBus('TIdPlugin', idPluginOf(assembled))

		assembled.attach()

		expect(subscribed(bus)).toContain('TIdPlugin: change:id')

		assembled.destroy()

		expect(leftovers(bus)).toEqual([])
	})

	it('собранный и не принятый контрол снимается тоже', () => {
		const { factory } = createElevatorFactory()

		field(factory, { invalid: true })

		const input = assemble(factory, InputDescriptor())
		const instance = input.instance
		const idPlugin = idPluginOf(input)

		expect(instance.invalid).toBe(true)

		input.destroy()

		expect(instance.invalid).toBe(false)
		expect(idPlugin.id).toBeUndefined()
	})
})

describe('одно поле — один контрол', () => {
	it('связку берёт первый: соседний контрол её не берёт', () => {
		const { factory, store } = createElevatorFactory()
		const { field: owner } = field(factory, { label: 'Почта', invalid: true })
		const link = store.get(FIELD_ELEVATOR)
		const first = control(factory, InputDescriptor())

		sibling(store, link)

		const second = control(factory, CheckBoxDescriptor())

		expect(first.instance.invalid).toBe(true)
		expect(second.instance.invalid).toBe(false)
		expect(idPluginOf(second).id).toBeUndefined()
		expect(owner.labelAria.get('for')).toBe('f-control')
	})

	it('связку заняли между сборкой и приёмом — собранное снимается', () => {
		const { factory, store } = createElevatorFactory()

		field(factory, { invalid: true })

		const link = store.get(FIELD_ELEVATOR)
		const first = assemble(factory, InputDescriptor())

		sibling(store, link)

		const second = assemble(factory, CheckBoxDescriptor())

		// Обе сборки застали свободную связку
		expect(second.instance.invalid).toBe(true)

		first.attach()
		second.attach()

		expect(first.instance.invalid).toBe(true)
		expect(second.instance.invalid).toBe(false)
		expect(idPluginOf(second).id).toBeUndefined()
	})

	it('контрол опускает пустую связку: контрол в его слотах её не берёт', () => {
		const { factory } = createElevatorFactory()

		field(factory, { invalid: true })
		control(factory, InputDescriptor())

		const nested = control(factory, CheckBoxDescriptor())

		expect(nested.instance.invalid).toBe(false)
	})

	it('деталь чужой разметки (embedded) связку не берёт', () => {
		const { factory } = createElevatorFactory()
		const { ids } = field(factory, { invalid: true })
		const detail = assemble(factory, InputDescriptor(), {}, 'select.field')

		detail.attach()

		expect(detail.instance.invalid).toBe(false)
		expect(ids.bound).toBe(false)
	})

	it('связка — поле и его плагин связок', () => {
		const { factory, store } = createElevatorFactory()
		const { field: owner, ids } = field(factory)
		const link: unknown = store.get(FIELD_ELEVATOR)
		const expected: IFieldLink = { field: owner, ids }

		expect(link).toEqual(expected)
	})
})
