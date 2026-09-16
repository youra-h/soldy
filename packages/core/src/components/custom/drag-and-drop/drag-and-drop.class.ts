import { TComponent } from '../../base/component'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { IDragAndDrop, IDragAndDropProps, TDragAndDropEvents } from './types'

export default class TDragAndDrop
	extends TComponent<IDragAndDropProps, TDragAndDropEvents>
	implements IDragAndDrop
{
	static defaultValues: typeof TComponent.defaultValues & TDefaultValues<IDragAndDropProps> = {
		...TComponent.defaultValues,
	}

	constructor(props: Partial<IDragAndDropProps> = {}, options: IComponentOptions = {}) {
		super(props, options)
	}
}
