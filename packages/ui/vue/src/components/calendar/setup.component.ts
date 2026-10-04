import {
	TCollectionExtension,
	CalendarDescriptor,
	CalendarCollectionDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	useCollectionAdapter,
	useIcon,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseCalendar, { type CalendarProps } from './base.component'

/**
 * Логики здесь нет: состав дней, выбор, фокус, листание и панели выбора
 * месяца и года — расширения коллекции, клавиши и нажатия — плагины
 * календаря. Разметка раскладывает то, что они отдали.
 *
 * Движок снаружи — как у остальных коллекций: его держит тот, кто зовёт
 * команды расширений календаря (панель DatePicker). Состава и ключа сверки
 * снаружи нет — дни кладёт в движок вид по месяцам сеток, и ключ у них — дата.
 */
export default {
	name: '_Calendar',
	extends: BaseCalendar,
	setup(props: CalendarProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(CalendarDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const refs = useAdapter(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			CalendarCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `completeEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter(collectionAdapter, props, emit)

		return {
			...refs,
			...refsCollection,
			/**
			 * Одна иконка на все стрелки: роли «влево» в контракте иконок нет, и
			 * ту стрелку, что смотрит в начало строки, зеркалит тема.
			 */
			arrowIconTag: useIcon('arrowRight'),
		}
	},
}
