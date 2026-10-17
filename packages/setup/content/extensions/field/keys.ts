/**
 * Ключ лифта поля формы: `Field` опускает по нему связку своему поддереву, а
 * контрол внутри её берёт.
 *
 * Лежит отдельно от проводки, как ключ окна (`VIRTUAL_ELEVATOR`): лифт берёт
 * любой ключ, поэтому ключ — в наполнении, а не в механике лифта.
 */

import type { IElevatorKey } from '../../../protected/adapter/elevator'
import type { IFieldLink } from './types'

/**
 * Связка ближайшего поля выше по дереву. Пустое значение опускает своему
 * поддереву сам контрол: контролы в его слотах связку его поля не берут.
 */
export const FIELD_ELEVATOR: IElevatorKey<IFieldLink | null> = { name: 'soldy:field' }
