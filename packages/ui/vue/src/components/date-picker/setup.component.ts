import { DatePickerDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	roleIcon,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseDatePicker, { type DatePickerProps } from './base.component'

/**
 * No logic here: the shared state of the fields and the calendar, the value,
 * openness and choice confirmation are held by the DatePicker core, its
 * `clear` command clears it, the opening plugin catches the calendar button
 * and Alt+↓, `TDismissPlugin` — a press outside, the focus plugin — the
 * panel's focus, `TSwipePlugin` — the swipe. The markup lays out what they
 * gave.
 *
 * The fields, the calendar and its collection's engine are core instances
 * living as long as the DatePicker, not props: they go out as instances, as
 * Select's `field` does, and components take them whole (`:ctrl`, `:engine`).
 * The calendar and the engine come from setup; a mode's fields the template
 * reads from the instance in that mode's branch — the core creates a field
 * when its mode needs it, and the other mode's fields are never built.
 *
 * A form `Field` above the DatePicker links with it, not with its fields: the
 * fields are details of its markup (`embedded`) and take no form-field link.
 */
export default {
	name: '_DatePicker',
	extends: BaseDatePicker,
	expose: useExpose(),
	setup(props: DatePickerProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(DatePickerDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldControlExtension, { elevator: VueElevatorFactory })
		const picker = adapter.instance

		return {
			// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
			...useAdapter(adapter, props, emit),
			/**
			 * The instance — for the mode's fields and the footer buttons with
			 * `confirmable`: «OK» accepts the choice (`confirm`), «Cancel» closes
			 * the panel, and the closing itself drops the draft. Returning the
			 * focus is the plugin's business; the markup knows nothing of it.
			 */
			picker,
			calendar: picker.calendar,
			engine: picker.engine,
			clearIconTag: roleIcon('close'),
			calendarIconTag: roleIcon('calendar'),
		}
	},
}
