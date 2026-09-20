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
 * Описания заморожены: дескриптор строится один раз на тип
 * (`defineDescriptor`) и один на все монтирования, а родительские описания
 * делят все наследники. Правка массива у одного потребителя молча сломала бы
 * остальных.
 *
 * Контракта в типе у класса нет: `ctor` без своего и без родителя — `Object`, и
 * связать его с выведенным инстансом можно только в типах. Контракт
 * приписывает сигнатура `defineComponent`.
 */

import { normalizeContribution } from './contribution'
import type { ISlotDeclaration } from './contribution.types'
import type { TName } from './name.class'
import type { TPropSpec } from './prop-spec.class'
import type {
	IComponentDescriptor,
	IComponentOptions,
	IPluginDefinition,
	TComponentCtor,
} from './types'

/** Последний с тем же ключом заменяет прежнего, оставаясь на его месте: `Map.set` позицию ключа не меняет. */
function overrideBy<T>(items: readonly T[], keyOf: (item: T) => unknown): T[] {
	const byKey = new Map<unknown, T>()

	for (const item of items) byKey.set(keyOf(item), item)

	return [...byKey.values()]
}

/**
 * Полное имя уникально в составе компонента: по нему проп и событие находят и
 * во фреймворке, и в ядре. Это свойство типа, поэтому сверяется один раз, при
 * построении дескриптора, а не на каждом монтировании.
 *
 * Дубль — ошибка автора дескриптора, и отвечает за неё он: слой сообщает в
 * консоль и работает дальше, а не роняет приложение. Развести имена плагинов
 * помогает неймспейс; проконтролировать автора полностью слой не может и не
 * пытается.
 *
 * Триггеры пропсов сюда не входят: одно событие — законный триггер нескольких
 * свойств (`change:visible` у `visible` и `present`), и наружу оно уходит один
 * раз — это держит поверхность.
 */
function reportDuplicateNames(ctor: TComponentCtor, kind: string, names: readonly TName[]): void {
	const seen = new Set<string>()

	for (const item of names) {
		const name = item.getName()

		if (seen.has(name)) {
			console.error(
				`${ctor.name}: ${kind} «${name}» объявлено дважды — полное имя обязано быть одно`,
			)
		}

		seen.add(name)
	}
}

export class TComponentDescriptor implements IComponentDescriptor {
	readonly ctor: TComponentCtor
	readonly props: readonly TPropSpec[]
	readonly events: readonly TName[]
	readonly slots: readonly ISlotDeclaration[]
	readonly plugins: readonly IPluginDefinition[]

	private readonly _allProps: readonly TPropSpec[]
	private readonly _allEvents: readonly TName[]

	constructor(options: IComponentOptions) {
		const parent = options.extends
		// Плагины сюда не входят: у плагинов contribution свой, в `plugins`
		const own = normalizeContribution(options.contribution)
		const ctor: TComponentCtor = options.ctor ?? parent?.ctor ?? Object

		this.ctor = ctor
		this.props = Object.freeze(
			[...(parent?.props ?? []), ...own.props].map((prop) => prop.rebase(ctor.defaultValues)),
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

		this._allProps = Object.freeze([
			...this.props,
			...this.plugins.flatMap((plugin) => plugin.props),
		])
		this._allEvents = Object.freeze([
			...this.events,
			...this.plugins.flatMap((plugin) => plugin.events),
		])

		reportDuplicateNames(
			ctor,
			'свойство',
			this._allProps.map((prop) => prop.name),
		)
		reportDuplicateNames(ctor, 'событие', this._allEvents)
	}

	getProps(): readonly TPropSpec[] {
		return this._allProps
	}

	getEvents(): readonly TName[] {
		return this._allEvents
	}
}
