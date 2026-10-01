import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { radioGroupExtensions } from './factory'
import type { TRadioGroupCollection } from './types'
import type { IRadioGroup } from '../types'
import type { IRadioGroupItem } from '../item/types'

/**
 * Коллекция RadioGroup целиком. `owner` необязателен: группа — опция движка, её
 * пишет `<RadioGroup>`, когда движок передадут компоненту, или код —
 * `engine.options.set({ owner })`.
 */
export function createEngineRadioGroup(
	options: TCreateEngineOptions<IRadioGroupItem> & { owner?: IRadioGroup } = {},
): TRadioGroupCollection {
	return createComponentEngine(radioGroupExtensions(), options)
}
