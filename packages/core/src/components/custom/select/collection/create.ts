import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { SELECT_EXTENSIONS, SELECT_OWNER_EXTENSIONS } from './factory'
import type { TSelectCollection } from './types'
import type { ISelect } from '../types'

/**
 * Коллекция Select целиком — со всем, включая владельческое.
 *
 * `owner` обязателен: связь `value` ↔ выбор, `aria-activedescendant` и текст
 * поля держатся на компоненте. Нужна коллекция без него — берите `createEngine`
 * или `createEngineSelection`: недостающее `<Select>` доустановит сам.
 */
export function createEngineSelect(
	options: TCreateEngineOptions & { owner: ISelect },
): TSelectCollection {
	return createComponentEngine(
		'createEngineSelect',
		SELECT_EXTENSIONS(),
		SELECT_OWNER_EXTENSIONS,
		options,
	) as TSelectCollection
}
