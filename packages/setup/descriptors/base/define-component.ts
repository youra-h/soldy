/**
 * defineComponent — создаёт дескриптор компонента.
 *
 * createAccessor строит TAccessor из Unit'ов:
 *   - Unit[0]: сам instance + собственные props/events
 *   - Unit[N]: plugin instance + его props/events
 * Никакого namespace или pluginsMap.
 */

import { TPluginBundle } from '@soldy/plugins'
import {
	TAccessor,
	type IPropDeclaration,
	type ISlotDeclaration,
	type TName,
} from '@soldy/accessor'
import type { IComponentDefinitionOptions, IComponentDescriptor, IPluginDefinition } from './types'
import { normalizeContribution } from './compile-contribution'

function createPluginCollector() {
	const map = new Map<any, IPluginDefinition>()

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

function buildDescriptor(options: IComponentDefinitionOptions): IComponentDescriptor {
	const parent = options.extends

	const collector = createPluginCollector()

	collector.add(parent?.plugins ?? [])
	collector.add(options.plugins ?? [])

	const plugins = collector.toArray()

	const own = normalizeContribution(options.contribution)

	// Статические props/events: свои + наследуемые (без плагинов — они в plugins[])
	const props: IPropDeclaration[] = [...(parent?.props ?? []), ...own.props]

	const events = [...(parent?.events ?? []), ...own.events]

	// Слоты наследуются с перекрытием по имени: наследник вправе уточнить scope
	// (например, ListBoxItem добавляет `selected` к слоту, объявленному выше).
	const slots: ISlotDeclaration[] = mergeSlots(parent?.slots ?? [], own.slots)

	return {
		ctor: options.ctor ?? parent?.ctor ?? Object,

		props,
		events,
		slots,
		plugins,

		getProps(): IPropDeclaration[] {
			return [...props, ...plugins.flatMap((p) => p.props ?? [])]
		},

		getEvents(): TName[] {
			return [...events, ...plugins.flatMap((p) => p.events ?? [])]
		},

		getSlots(): ISlotDeclaration[] {
			return [...slots]
		},

		createBundle(instance: any) {
			if (plugins.length === 0) {
				return null
			}

			const bundle = new TPluginBundle(instance)

			for (const plugin of plugins) {
				bundle.use(plugin.ctor, plugin.options ?? {})
			}

			// Плагины появились — объявляем их наружу. `bundle:create` идёт на
			// шину инстанса: это единственный канал, видимый и шаблону, и тому,
			// у кого на руках только ctrl. Свойством (`btn.plugins`) выразить
			// нельзя — до монтирования bundle не существует.
			//
			// Отложено на микрозадачу по той же причине, что и `engine:create`
			// в engine.class.ts: адаптер подписывается на события уже после
			// того, как получил bundle, и синхронный эмит ушёл бы в пустоту.
			//
			// Сначала bundle, потом плагины: иначе обработчик `bundle:create`
			// не успел бы подписаться на плагинный `create`.
			Promise.resolve().then(() => {
				instance?.events?.emit('bundle:create', bundle)

				for (const plugin of plugins) {
					bundle.get(plugin.ctor)?.created()
				}
			})

			return bundle
		},

		createAccessor(instance: any, bundle: TPluginBundle | null) {
			return new TAccessor([
				// Unit компонента: все наследуемые + собственные props/events
				{ instance, props, events },
				// Units плагинов
				...plugins
					.map((def) => ({
						instance: bundle?.get(def.ctor),
						props: def.props,
						events: def.events,
					}))
					.filter((u) => u.instance != null),
			])
		},
	}
}

/**
 * Одноразовая форма (без явных type-аргументов): кортеж плагинов выводится из
 * options.plugins. Используется дескрипторами без явного типа props/events.
 */
export function defineComponent<
	const TPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
>(
	options: IComponentDefinitionOptions<TPlugins, TParentPlugins>,
): IComponentDescriptor<
	Record<string, unknown>,
	{},
	readonly [...TParentPlugins, ...TPlugins],
	{}
>

/**
 * Curried-форма: явные TProps/TEvents/TSlots на первом вызове, кортеж плагинов
 * выводится на втором. Используется типизированными дескрипторами.
 *
 * TSlots с дефолтом `{}` — дескрипторы без слотов не переписываются.
 */
export function defineComponent<
	TProps extends object,
	TEvents extends object,
	TSlots extends object = {},
>(): <
	const TPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
>(
	options: IComponentDefinitionOptions<TPlugins, TParentPlugins>,
) => IComponentDescriptor<TProps, TEvents, readonly [...TParentPlugins, ...TPlugins], TSlots>

export function defineComponent(...args: any[]): any {
	if (args.length > 0) return buildDescriptor(args[0])

	return (options: IComponentDefinitionOptions) => buildDescriptor(options)
}
