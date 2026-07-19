/**
 * Дескриптор базового компонента (TComponent).
 *
 * Единый источник истины: консолидирует Contribution + Provider + Constructor.
 * Заменяет ручную сборку compileComponent(ComponentContribution).
 */

import { defineComponent } from '@soldy/provider'
import { TObservingAccessorProvider } from '@soldy/provider'
import { TComponent } from '@soldy/core'
import { ComponentContribution } from '../core/contributions'

export const ComponentDescriptor = defineComponent({
	ctor: TComponent,
	contribution: ComponentContribution,
	provider: TObservingAccessorProvider,
})
