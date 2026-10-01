import type { TNoEvents } from '../../../../../../common'
import type { IRadioGroup } from '../../../types'

/** Опции движка RadioGroup: группа приходит и уходит после сборки. */
export type TRadioGroupEngineOptions<TOwner extends IRadioGroup = IRadioGroup> = {
	owner: TOwner
}

/** Событий у расширения нет — см. `TNoEvents`. */
export type TRadioGroupExtensionEvents = TNoEvents
