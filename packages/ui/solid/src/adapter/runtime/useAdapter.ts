/**
 * useAdapter — единственный Solid-хук на весь проект (аналог useAdapter
 * из Vue/React/Svelte-пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-слое компонента через
 * createAdapterContext) и связывает его с Solid через обмен `adapter.connect()`
 * из setup. Своё здесь — только куда писать значение (`createStore`), как
 * отдать событие (колбэк-проп) и в какой момент цикла Solid это делать:
 *
 * 1. Core → Solid: подписка на состояние связки
 * 2. Solid → Core: входные пропсы в эффекте
 * 3. События (Core → колбэк-пропы onXxx)
 * 4. Компонент принят — adapter.attach()
 * 5. DOM-биндинг через callback-ref, и тот же узел — `ref` потребителя
 * 6. Очистка при уничтожении компонента (onCleanup)
 *
 * Props передаются как есть: в Solid это объект геттеров, деструктурировать
 * его нельзя, но читать напрямую — можно и нужно.
 *
 * `ref` потребителя (`<Button ref={button}>`) получает корень компонента —
 * узел, на который ложатся его класс и атрибуты. У поля (Input, CheckBox,
 * Switch) — тоже корень, а не `<input>`: от корня до поля потребитель дойдёт
 * `querySelector`, а от поля до корня — только по родителям, и этот путь
 * ломается при каждой правке разметки. Отдаёт его callback-ref корня — тем же
 * вызовом, после привязки к `TElementPlugin`: у узла `ref` один, и ставит его
 * адаптер. Компоненту Solid отдаёт `ref` функцией — `ref={button}` тоже:
 * функция присвоит узел переменной. Узлом он бывает только мимо компилятора
 * Solid, и присвоить такой некуда. Снятие узла Solid своим `ref` не
 * объявляет, и `ref` потребителя тоже: на `onCleanup` — только отвязка корня.
 */

import { createEffect, createMemo, onCleanup } from 'solid-js'
import { createStore } from 'solid-js/store'
import { toInstanceState } from '@soldy-ui/setup'
import type { IAdapterContext, IComponentContract, TAdapterState } from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
import { SolidProfile } from '../common'

/**
 * `ref` потребителя — корень компонента. Функция, которой Solid отдаёт узел,
 * или переменная: `ref={button}` компилятор Solid превращает в функцию,
 * которая присвоит ей узел. Узел — `Element`, а не `HTMLElement`: `tag`
 * свободен, и корнем бывает `<svg>` (иконка по роли).
 */
export type TConsumerRef = Element | ((element: Element) => void)

export type TBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = {
	readonly ctrl: C['instance']
	readonly plugins: IPluginBundle | null
	/** Свойства инстанса и выходы плагинов со снимком через `valueOf()` — см. `TAdapterState`. */
	readonly state: TAdapterState<C>
	/** Мемо: DOM-атрибуты, не съеденные компонентом */
	forwardProps: () => Partial<TProps>
	/** callback-ref корня: привязка к `TElementPlugin`, затем тот же узел — `ref` потребителя */
	ref: (el: Element) => void
}

/** Инстанс и выходы плагинов берутся из контракта в типе контекста — его выводит `createAdapterContext`. */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
): TBinding<C, TProps> {
	const binding = adapter.connect(SolidProfile)
	const [state, setState] = createStore<Record<string, unknown>>({})

	// 1. Core → Solid: подписка на всё время жизни, отписка на onCleanup.
	// Подписка сразу отдаёт значение каждого свойства — тем же вызовом, что и
	// триггер: так стор и заполняется. Merge-форма, а не setState(key, value):
	// при значении-функции путевая форма трактовала бы его как updater.
	onCleanup(binding.state.subscribe((name, value) => setState({ [name]: value })))

	// 2. Solid → Core: эффект читает все props и перезапускается при смене любого,
	// а связка пишет из них только сменившиеся с прошлого раза
	createEffect(() => binding.inputs.full(props))

	// 3. События
	onCleanup(
		binding.events.listen((exportName, args) => {
			const callback: unknown = Reflect.get(props, exportName)

			if (typeof callback === 'function') callback(...args)
		}),
	)

	// 4. Компонент принят: тело компонента Solid выполняется один раз, и на
	// сервере тоже, — это и есть его монтирование
	adapter.attach()

	// 5. Очистка контекста
	onCleanup(() => adapter.destroy())

	const forwardProps = createMemo(() => binding.forward(props))

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		state: toInstanceState<C>(state),
		forwardProps,

		ref(el: Element) {
			adapter.bindElement(el)

			onCleanup(() => adapter.bindElement(null))

			// Тот же узел — `ref` потребителя: Solid читает `ref` один раз, когда
			// создаёт узел, — и потребителю его отдаёт тот же вызов
			const consumer: unknown = Reflect.get(props, 'ref')

			if (typeof consumer === 'function') consumer(el)
		},
	}
}
