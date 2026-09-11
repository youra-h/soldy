import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { TAGS_EXTENSIONS, TAGS_OWNER_EXTENSIONS } from './factory'
import type { TTagsCollection } from './types'
import type { ITags } from '../types'

/**
 * Коллекция Tags целиком — со всем, включая владельческое.
 *
 * `owner` обязателен: проброс `disabled`/`size`/`variant` и закрытие держатся
 * на компоненте. Нужна коллекция без него — берите `createEngine` или
 * `createEngineSelection`: недостающее `<Tags>` доустановит сам.
 */
export function createEngineTags(
	options: TCreateEngineOptions & { owner: ITags },
): TTagsCollection {
	return createComponentEngine(
		'createEngineTags',
		TAGS_EXTENSIONS(),
		TAGS_OWNER_EXTENSIONS,
		options,
	) as TTagsCollection
}
