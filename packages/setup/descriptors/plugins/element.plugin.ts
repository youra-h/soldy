import { definePlugin } from '../base'
import { TElementPlugin } from '@soldy/plugins'
import type { TElementServiceEvents } from '@soldy/plugins'
import { ElementContribution } from '../../contributions'

export const ElementPluginDescriptor = () =>
	definePlugin<'element', TElementServiceEvents>({
		ctor: TElementPlugin,
		namespace: 'element',
		contribution: ElementContribution(),
	})
