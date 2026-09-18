import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { RADIO_GROUP_EXTENSIONS, RADIO_GROUP_OWNER_EXTENSIONS } from './factory'
import type { TRadioGroupCollection } from './types'
import type { IRadioGroup } from '../types'
import type { IRadioGroupItem } from '../item/types'

/**
 * Коллекция RadioGroup целиком — со всем, включая владельческое.
 *
 * `owner` обязателен: связь `value` ↔ активное радио, общий `name` и проброс
 * `size`/`variant`/`view` держатся на компоненте. Нужна коллекция без него —
 * берите `createEngine` или `createEngineActivation`: недостающее
 * `<RadioGroup>` доустановит сам.
 */
export function createEngineRadioGroup(
	options: TCreateEngineOptions<IRadioGroupItem> & { owner: IRadioGroup },
): TRadioGroupCollection {
	return createComponentEngine(
		'createEngineRadioGroup',
		RADIO_GROUP_EXTENSIONS(),
		RADIO_GROUP_OWNER_EXTENSIONS,
		options,
	) as TRadioGroupCollection
}
