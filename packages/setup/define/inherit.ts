/**
 * Декларации дескриптора из родителя и опций: ctor, props, events, слоты, плагины.
 *
 * Наследник получает всё, что объявил `extends`, и добавляет своё. Перекрытие у
 * каждой части своё: плагин того же класса и слот того же имени встают на место
 * родительских, умолчания пропов пересчитываются от итогового `ctor`.
 */

import type { IPropDeclaration, ISlotDeclaration } from '@soldy/accessor'
import type {
	IComponentDescriptor,
	IComponentOptions,
	IPluginDefinition,
	TComponentCtor,
} from './types'
import { normalizeContribution } from './contribution'
import { withClassDefault } from './defaults'

/** Плагины по классу: повторный класс заменяет определение, оставаясь на месте первого. */
function createPluginCollector() {
	const map = new Map<IPluginDefinition['ctor'], IPluginDefinition>()

	return {
		add(plugins: readonly IPluginDefinition[]): void {
			for (const p of plugins) map.set(p.ctor, p)
		},
		toArray(): IPluginDefinition[] {
			return [...map.values()]
		},
	}
}

/** Слоты наследника перекрывают одноимённые родительские, порядок сохраняется. */
function mergeSlots(
	parent: readonly ISlotDeclaration[],
	own: readonly ISlotDeclaration[],
): ISlotDeclaration[] {
	const map = new Map<string, ISlotDeclaration>()

	for (const slot of [...parent, ...own]) map.set(slot.name, slot)

	return [...map.values()]
}

export function inheritDeclarations(
	options: IComponentOptions,
): Pick<IComponentDescriptor, 'ctor' | 'props' | 'events' | 'slots' | 'plugins'> {
	const parent = options.extends
	const ctor: TComponentCtor = options.ctor ?? parent?.ctor ?? Object

	const collector = createPluginCollector()

	collector.add(parent?.plugins ?? [])
	collector.add(options.plugins ?? [])

	const plugins = collector.toArray()

	const own = normalizeContribution(options.contribution)

	// Статические props/events: свои + наследуемые (без плагинов — они в plugins[],
	// умолчания им уже дал definePlugin). Умолчание — от итогового ctor и
	// пересчётом, а не копией родительского: наследник вправе поменять значение
	// (у Frame `visible: false`, у ComponentView — `true`).
	const props: IPropDeclaration[] = [...(parent?.props ?? []), ...own.props].map((prop) =>
		withClassDefault(prop, ctor.defaultValues),
	)

	const events = [...(parent?.events ?? []), ...own.events]

	// Слоты наследуются с перекрытием по имени: наследник вправе уточнить scope
	// (например, ListBoxItem добавляет `selected` к слоту, объявленному выше).
	const slots: ISlotDeclaration[] = mergeSlots(parent?.slots ?? [], own.slots)

	return { ctor, props, events, slots, plugins }
}
