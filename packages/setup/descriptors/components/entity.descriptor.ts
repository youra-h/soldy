import { defineComponent } from '../../define'
import { EntityContribution } from '../../contributions'

export const EntityDescriptor = () =>
	defineComponent({
		contribution: EntityContribution(),
	})
