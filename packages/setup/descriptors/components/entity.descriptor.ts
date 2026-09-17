import { defineComponent, defineDescriptor } from '../../define'
import { EntityContribution } from '../../contributions'

export const EntityDescriptor = defineDescriptor(() =>
	defineComponent({
		contribution: EntityContribution(),
	}),
)
