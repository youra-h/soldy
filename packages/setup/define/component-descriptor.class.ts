/**
 * TComponentDescriptor — дескриптор компонента: своё объявление поверх родительского.
 *
 * Наследник получает всё, что объявил `extends`, и добавляет своё. Перекрытие
 * одно на плагины и слоты: плагин того же класса и слот того же имени встают на
 * место родительских. Так наследник меняет опции плагина
 * (`DismissPluginDescriptor.with(…)`) и уточняет scope слота (ListBoxItem
 * добавляет `selected` к слоту, объявленному выше).
 *
 * Умолчание пропа — от итогового `ctor` и пересчётом, а не копией
 * родительского: наследник вправе поменять значение (у Frame
 * `visible: false`, у ComponentView — `true`). Плагинов это не касается:
 * умолчания их пропсов знает определение плагина.
 *
 * Декларации заморожены: дескриптор строится один раз на тип
 * (`defineDescriptor`) и один на все монтирования, а родительские декларации
 * делят все наследники. Правка массива у одного потребителя молча сломала бы
 * остальных.
 *
 * Контракта в типе у класса нет: `ctor` без своего и без родителя — `Object`, и
 * связать его с выведенным инстансом можно только в типах. Контракт
 * приписывает сигнатура `defineComponent`.
 */

import type { IPropDeclaration, ISlotDeclaration, TName } from '@soldy/accessor'
import { normalizeContribution } from './contribution'
import { withClassDefault } from './defaults'
import type {
	IComponentDescriptor,
	IComponentOptions,
	IPluginDefinition,
	TComponentCtor,
} from './types'

/** Последний с тем же ключом заменяет прежнего, оставаясь на его месте. */
function overrideBy<T>(items: readonly T[], keyOf: (item: T) => unknown): T[] {
	const byKey = new Map<unknown, T>()

	for (const item of items) byKey.set(keyOf(item), item)

	return [...byKey.values()]
}

export class TComponentDescriptor implements IComponentDescriptor {
	readonly ctor: TComponentCtor
	readonly props: readonly IPropDeclaration[]
	readonly events: readonly TName[]
	readonly slots: readonly ISlotDeclaration[]
	readonly plugins: readonly IPluginDefinition[]

	constructor(options: IComponentOptions) {
		const parent = options.extends
		// Плагины сюда не входят: у плагинов contribution свой, в `plugins`
		const own = normalizeContribution(options.contribution)
		const ctor: TComponentCtor = options.ctor ?? parent?.ctor ?? Object

		this.ctor = ctor
		this.props = Object.freeze(
			[...(parent?.props ?? []), ...own.props].map((prop) =>
				withClassDefault(prop, ctor.defaultValues),
			),
		)
		this.events = Object.freeze([...(parent?.events ?? []), ...own.events])
		this.slots = Object.freeze(
			overrideBy([...(parent?.slots ?? []), ...own.slots], (slot) => slot.name),
		)
		this.plugins = Object.freeze(
			overrideBy(
				[...(parent?.plugins ?? []), ...(options.plugins ?? [])],
				(plugin) => plugin.ctor,
			),
		)
	}

	getProps(): IPropDeclaration[] {
		return [...this.props, ...this.plugins.flatMap((plugin) => plugin.props)]
	}

	getEvents(): TName[] {
		return [...this.events, ...this.plugins.flatMap((plugin) => plugin.events)]
	}
}
