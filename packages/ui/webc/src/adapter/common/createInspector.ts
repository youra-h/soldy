/**
 * - Static (build-time): `createInspector(descriptor)` — useAttributes, defineProps
 * - Runtime: `createInspector(adapter.accessor)` — useAdapter
 */

import { createInspectorFactory } from '@soldy/setup'
import { WebcNaming } from './naming'

export const createInspector = createInspectorFactory(WebcNaming)
