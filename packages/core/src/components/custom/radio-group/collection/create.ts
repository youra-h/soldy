import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { radioGroupExtensions } from './factory'
import type { TRadioGroupCollection } from './types'
import type { IRadioGroup } from '../types'
import type { IRadioGroupItem } from '../item/types'

/**
 * Коллекция RadioGroup целиком. `owner` необязателен: без него детали владельца не
 * ставятся — их доставит `<RadioGroup>`, когда движок передадут компоненту.
 */
export function createEngineRadioGroup(
	options: TCreateEngineOptions<IRadioGroupItem> & { owner?: IRadioGroup } = {},
): TRadioGroupCollection {
	return createComponentEngine(radioGroupExtensions, options)
}
