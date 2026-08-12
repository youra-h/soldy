/**
 * defineCollection — создаёт дескриптор коллекции.
 *
 * Компилирует ICollectionContribution в ICollectionDescriptor.
 * Не наследует defineComponent — это параллельная ветка архитектуры.
 */

import type { ICompiledCollectionProp, ICompiledEvent, ICollectionPropContribution, ICollectionContribution } from '@soldy/accessor'
import type {
	ICollectionDefinitionOptions,
	ICollectionDescriptor,
	ICollectionItemDefinitionOptions,
	ICollectionItemDescriptor,
} from './types'

function compileCollectionContribution(
	contribution?: { props?: ICollectionPropContribution[]; events?: string[] },
	namespace?: string,
): { props: ICompiledCollectionProp[]; events: ICompiledEvent[] } {
	if (!contribution) return { props: [], events: [] }

	const props: ICompiledCollectionProp[] = (contribution.props ?? []).map((p) => ({
		name: p.name,
		type: p.type,
		protected: !!p.protected,
		triggers: p.triggers ?? [],
		namespace,
		source: p.source,
	}))

	const events: ICompiledEvent[] = (contribution.events ?? []).map((name) => ({
		name,
		namespace,
	}))

	return { props, events }
}

export function mergeCollectionContributions(
	...contributions: (ICollectionContribution | undefined)[]
): ICollectionContribution {
	const props = contributions.flatMap((c) => c?.props ?? [])
	const events = contributions.flatMap((c) => c?.events ?? [])

	return {
		props: props.length > 0 ? props : undefined,
		events: events.length > 0 ? events : undefined,
	}
}

export function defineCollection<TItem extends object = any>(
	options: ICollectionDefinitionOptions<TItem>,
): ICollectionDescriptor<TItem> {
	const { props, events } = compileCollectionContribution(options.contribution)

	return {
		props,
		events,
		factory: options.factory,
	}
}

/**
 * defineCollectionItem — создаёт дескриптор для элемента коллекции.
 *
 * Все props компилируются с namespace 'item', что даёт имена item_active,
 * item_order, item_closable и т.д. (совместимо со старым TCollectionItemPlugin).
 */
export function defineCollectionItem(
	options: ICollectionItemDefinitionOptions,
): ICollectionItemDescriptor {
	const { props, events } = compileCollectionContribution(options.contribution, 'item')

	return { props, events }
}
