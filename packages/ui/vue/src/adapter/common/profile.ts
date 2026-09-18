/**
 * Профиль Vue: имена поверхности.
 *
 * Поверхность нужна компоненту дважды: при импорте модуля (`props` и `emits`
 * Options API — `useProps`, `useEmits`) и на монтировании (связка
 * `bindComponent`). Один профиль — одна поверхность на оба случая.
 */

import type { IAdapterProfile } from '@soldy/setup'
import { VueNaming } from './naming'

export const VueProfile: IAdapterProfile = { naming: VueNaming }
