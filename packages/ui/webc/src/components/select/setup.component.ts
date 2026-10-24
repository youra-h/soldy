import {
	SelectCollectionDescriptor,
	SelectDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
	TVirtualCollectionExtension,
	type DescriptorPluginOutputs,
	type DescriptorPluginProps,
} from '@soldy-ui/setup'
import type { ISelect, TSelectCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/**
 * Входы и выходы плагинов Select — их читает шаблон: пометку панели
 * владельцем и `id` Select, проп `TIdPlugin`, который шаблон отдаёт полю.
 */
export type TSelectOutputs = DescriptorPluginProps<typeof SelectDescriptor> &
	DescriptorPluginOutputs<typeof SelectDescriptor>

export function setupSelect(
	host: HTMLElement,
	ctrl: ISelect | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ISelect, TSelectCollectionFacade, TSelectOutputs> {
	const elevator = createWebcElevator(host)
	// `Field` связывается с Select, а не с его полем: деталь связку не берёт
	const adapter = createWebcAdapterContext(host, SelectDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator },
	)
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		SelectCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		// Окно обёртки `<so-virtual>` над Select
		.use(TVirtualCollectionExtension, { elevator })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
