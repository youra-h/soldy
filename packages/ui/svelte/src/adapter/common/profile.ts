/**
 * Профиль Svelte: имена поверхности и слот по умолчанию.
 *
 * Статического слоя у Svelte нет — имена пропов выводятся из типов, — поэтому
 * профиль нужен только связке монтирования (`bindComponent`).
 */

import type { IAdapterProfile } from '@soldy/setup'
import { SvelteNaming } from './naming'

export const SvelteProfile: IAdapterProfile = { naming: SvelteNaming, defaultSlot: 'children' }
