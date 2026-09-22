/**
 * Профиль React: имена поверхности и слот по умолчанию.
 *
 * Статического слоя у React нет — имена пропов выводятся из типов, — поэтому
 * профиль нужен только связке монтирования (`adapter.connect()`).
 */

import type { IAdapterProfile } from '@soldy-ui/setup'
import { ReactNaming } from './naming'

export const ReactProfile: IAdapterProfile = { naming: ReactNaming, defaultSlot: 'children' }
