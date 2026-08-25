/**
 * TCollectionItemMetaExtension — снимает item-метаданные из props и толкает их
 * в коллекционное TMetaExtension уже после вставки элемента.
 *
 * Использование:
 *   adapter.use(TCollectionItemMetaExtension, { descriptor, elevator })
 *
 * Регистрируется ПОСЛЕ TCollectionItemExtension (который вставляет элемент),
 * чтобы meta применилась к уже находящемуся в коллекции элементу.
 */

import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'
import type { ICollectionDescriptor } from '@soldy/setup'
import type { IPropDeclaration } from '@soldy/accessor'

export interface ICollectionItemMetaExtensionOptions {
	descriptor: ICollectionDescriptor
	elevator: TElevatorFactory
}

export class TCollectionItemMetaExtension {
	static readonly key = Symbol('TCollectionItemMetaExtension')

	constructor(context: IAdapterContext, options: ICollectionItemMetaExtensionOptions) {
		const { descriptor, elevator } = options

		const collection = elevator(ITEM_CONTEXT_ELEVATOR).up() as any
		const metaExt = collection?.extensions?.meta

		if (!metaExt) return

		const meta = collectItemMeta(descriptor.itemProps, context.props)

		metaExt.apply(context.instance, meta)
	}
}

/**
 * Собрать meta из входных (не protected) item-пропсов дескриптора,
 * присутствующих в props. Генерично для любой коллекции: `active`, `selected`, ...
 */
function collectItemMeta(
	itemProps: IPropDeclaration[],
	props: Readonly<Record<string, any>>,
): Record<string, unknown> {
	const meta: Record<string, unknown> = {}

	for (const decl of itemProps) {
		if (decl.protected) continue

		const key = decl.name.name

		if (key in props && props[key] !== undefined) {
			meta[key] = props[key]
		}
	}

	return meta
}
