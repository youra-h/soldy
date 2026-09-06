/**
 * - Static (build-time): `createInspector(descriptor)` — useProps.ts, useEmits.ts
 * - Runtime: `createInspector(adapter.accessor)` — useAdapter.ts
 */

import { createInspectorFactory } from '@soldy/setup'
import { VueNaming } from './naming'

export const createInspector = createInspectorFactory(VueNaming)
