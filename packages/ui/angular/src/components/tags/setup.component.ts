import { TCollectionExtension, TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import type { ITags, ITagsProps, TTagsCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/** Tags: движок и регистратор лифт опускает в слой набора; `engine` — готовая коллекция. */
export function setupTags(
	ctrl: ITags | undefined,
	props: object,
	engine: ITagsProps['engine'],
): TBinding<ITags, TTagsCollectionFacade> {
	const adapter = createAngularAdapterContext(TagsDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		TagsCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
