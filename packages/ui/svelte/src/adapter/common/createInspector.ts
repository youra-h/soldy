/**
 * Runtime: `createInspector(adapter.accessor)` — useAdapter.
 *
 * Статический режим (дескриптор) в Svelte не нужен: имена пропов выводятся
 * из типов, а не из рантайм-объявлений.
 */

import { createInspectorFactory } from '@soldy/setup'
import { SvelteNaming } from './naming'

export const createInspector = createInspectorFactory(SvelteNaming)
