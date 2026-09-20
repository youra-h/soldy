/**
 * Профиль Solid: имена поверхности и слот по умолчанию.
 *
 * Статического слоя у Solid нет — имена пропов выводятся из типов, — поэтому
 * профиль нужен только связке монтирования (`adapter.connect()`).
 */

import type { IAdapterProfile } from '@soldy/setup'
import { SolidNaming } from './naming'

export const SolidProfile: IAdapterProfile = { naming: SolidNaming, defaultSlot: 'children' }
