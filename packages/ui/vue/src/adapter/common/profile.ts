/**
 * Профиль Vue: имена поверхности и событие `v-model`.
 *
 * Поверхность нужна компоненту дважды: при импорте модуля (`props` и `emits`
 * Options API — `useProps`, `useEmits`) и на монтировании (связка
 * `adapter.connect()`). Один профиль — одна поверхность на оба случая.
 *
 * `v-model` держится на `update:<prop>`: его объявляет поверхность, а
 * эмитит связка, — у каждого записываемого пропа с триггерами, плагинные
 * включительно (`update:anchor_anchor` у Frame).
 */

import type { IAdapterProfile } from '@soldy/setup'
import { VueNaming } from './naming'

export const VueProfile: IAdapterProfile = {
	naming: VueNaming,
	model: (exportName) => `update:${exportName}`,
}
