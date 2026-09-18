import type { TNoEvents } from '../../../../../../common'
import type { IRadioGroup } from '../../../types'

/** Опции конструктора `TRadioGroupExtension`: ссылка на инстанс группы. */
export interface IRadioGroupExtensionOptions<TOwner extends IRadioGroup = IRadioGroup> {
	/** Инстанс компонента группы. */
	owner: TOwner
}

/** Событий у расширения нет — см. `TNoEvents`. */
export type TRadioGroupExtensionEvents = TNoEvents
