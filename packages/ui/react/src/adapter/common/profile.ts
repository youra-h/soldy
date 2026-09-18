/**
 * Профиль React: имена поверхности и слот по умолчанию.
 *
 * Статического слоя у React нет — имена пропов выводятся из типов, — поэтому
 * профиль нужен только связке монтирования (`bindComponent`).
 */

import type { IAdapterProfile } from '@soldy/setup'
import { ReactNaming } from './naming'

export const ReactProfile: IAdapterProfile = { naming: ReactNaming, defaultSlot: 'children' }
