/**
 * defineCollection — создаёт дескриптор коллекции.
 *
 * Компилирует ICollectionContribution в ICollectionDescriptor.
 * Не наследует defineComponent — это параллельная ветка архитектуры.
 */

import type { ICompiledCollectionProp, ICompiledEvent, ICollectionPropContribution } from '@soldy/accessor'
import type { ICollectionDefinitionOptions, ICollectionDescriptor } from './types'

function compileCollectionContribution(
	contribution?: { props?: ICollectionPropContribution[]; events?: string[] },
): { props: ICompiledCollectionProp[]; events: ICompiledEvent[] } {
	if (!contribution) return { props: [], events: [] }

	const props: ICompiledCollectionProp[] = (contribution.props ?? []).map((p) => ({
		name: p.name,
		type: p.type,
		protected: !!p.protected,
		triggers: p.triggers ?? [],
		namespace: undefined,
		source: p.source,
	}))

	const events: ICompiledEvent[] = (contribution.events ?? []).map((name) => ({
		name,
		namespace: undefined,
	}))

	return { props, events }
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
