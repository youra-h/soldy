/**
 * TComponentDescriptor — дескриптор компонента: своё объявление поверх родительского.
 *
 * Наследник получает всё, что объявил `extends`, и добавляет своё. Правило
 * одно на все три категории объявлений: своё с тем же ключом ложится на
 * родительское и остаётся на его месте (`inheritDeclarations`). Что значит
 * «поверх», дескриптор не решает — это знает само объявление
 * (`IDeclaration`): плагин того же класса и слот того же имени встают
 * целиком, а проп переобъявляет ровно те факты, которые наследник написал.
 * Так `size` у элемента коллекции становится защищённым — входом он быть
 * перестаёт, — а тип и триггеры остаются объявленными один раз, у того, кто
 * проп завёл.
 *
 * События — не объявления, а имена: фактов, которые можно переобъявить, у них
 * нет, и повтор имени — дубль, а не уточнение. Поэтому они копятся списком, и
 * о повторе дескриптор сообщает (`reportDuplicateNames`).
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
import { inheritDeclarations } from './inherit'
import type { TName } from './name.class'
import type { TPropSpec } from './prop-spec.class'
import type { TSlotDeclaration } from './slot-declaration.class'
import type {
	IComponentDescriptor,
	IComponentOptions,
	IPluginDefinition,
	TComponentCtor,
} from './types'

/**
 * Корень цепочки наследования: дескриптор без объявлений.
 *
 * Пустой родитель отвечает на те же вопросы, что настоящий, поэтому «родителя
 * нет» — не развилка в сборке: без него `parent?.x ?? []` стояло бы у каждой
 * категории, и следующая добавила бы ещё одно. Наружу не выходит: у
 * дескриптора без `extends` родителем остаётся он.
 */
const ROOT: IComponentDescriptor = Object.freeze({
	ctor: Object,
	props: [],
	events: [],
	slots: [],
	plugins: [],
	getProps: () => [],
	getEvents: () => [],
})

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
	readonly slots: readonly TSlotDeclaration[]
	readonly plugins: readonly IPluginDefinition[]

	private readonly _allProps: readonly TPropSpec[]
	private readonly _allEvents: readonly TName[]

	constructor(options: IComponentOptions) {
		const parent = options.extends ?? ROOT
		// Плагины сюда не входят: у плагинов contribution свой, в `plugins`
		const own = normalizeContribution(options.contribution)
		const ctor: TComponentCtor = options.ctor ?? parent.ctor

		this.ctor = ctor
		// Умолчание пересчитывается от итогового класса, и только оно: остальное
		// объявление уже сложено наследованием
		this.props = Object.freeze(
			inheritDeclarations(parent.props, own.props).map((prop) =>
				prop.rebase(ctor.defaultValues),
			),
		)
		this.events = Object.freeze([...parent.events, ...own.events])
		this.slots = Object.freeze(inheritDeclarations(parent.slots, own.slots))
		this.plugins = Object.freeze(inheritDeclarations(parent.plugins, options.plugins ?? []))

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
