/**
 * defineCollectionExtension / defineCollection / defineCollectionItem
 *
 * Параллель definePlugin / defineComponent:
 *   defineCollectionExtension({ source, contribution }) → ICollectionExtensionDescriptor
 *   defineCollection({ factory, extensions })           → ICollectionDescriptor
 *   defineCollectionItem({ extensions })                → ICollectionItemDescriptor
 */

import type {
	ICompiledCollectionProp,
	ICompiledEvent,
	ICollectionPropContribution,
	ICollectionContribution,
	ICollectionExtensionDescriptor,
} from '@soldy/accessor'
import type {
	ICollectionDefinitionOptions,
	ICollectionDescriptor,
	ICollectionItemDefinitionOptions,
	ICollectionItemDescriptor,
	ICollectionExtensionDefinitionOptions,
} from './types'

/**
 * Компилирует contribution пропы с привязкой source.
 * Аналог compileContribution(contribution, namespace) для плагинов.
 */
function compileExtensionContribution(
	source: string,
	contribution: ICollectionContribution,
): { props: ICompiledCollectionProp[]; events: ICompiledEvent[] } {
	const props: ICompiledCollectionProp[] = (contribution.props ?? []).map((p) => ({
		name: p.name,
		type: p.type,
		protected: !!p.protected,
		triggers: p.triggers ?? [],
		source,
		get: p.get,
		set: p.set,
	}))

	const events: ICompiledEvent[] = (contribution.events ?? []).map((name) => ({ name }))

	return { props, events }
}

/** Создаёт дескриптор расширения коллекции — аналог definePlugin. */
export function defineCollectionExtension(
	options: ICollectionExtensionDefinitionOptions,
): ICollectionExtensionDescriptor {
	const { props, events } = compileExtensionContribution(
		options.source,
		options.contribution ?? {},
	)
	return { source: options.source, props, events }
}

/** Создаёт дескриптор коллекции из списка расширений. */
export function defineCollection<TItem extends object = any>(
	options: ICollectionDefinitionOptions<TItem>,
): ICollectionDescriptor<TItem> {
	const props = options.extensions.flatMap((e) => e.props)
	const events = options.extensions.flatMap((e) => e.events)

	return { props, events, factory: options.factory }
}

/** Создаёт дескриптор элемента коллекции из списка расширений. */
export function defineCollectionItem(
	options: ICollectionItemDefinitionOptions,
): ICollectionItemDescriptor {
	const props = options.extensions.flatMap((e) => e.props)
	const events = options.extensions.flatMap((e) => e.events)

	return { props, events }
}

