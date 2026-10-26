import {
	TCollectionExtension,
	PaginationDescriptor,
	PaginationCollectionDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	extendBinding,
	joinBindings,
	useExpose,
	useCollectionAdapter,
	roleIcon,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BasePagination, { type PaginationProps } from './base.component'

/**
 * Логики здесь нет: страницы окна, текущая, пропуски и связь текущей со
 * значением — расширение коллекции `pagination`, выключенность стрелок и
 * переход на соседнюю страницу — сама пагинация, имена стрелок — плагин
 * имён. Разметка раскладывает то, что они отдали.
 *
 * Движок снаружи — как у остальных коллекций. Состава и ключа сверки снаружи
 * нет — страницы окна кладёт в движок расширение пагинации, и ключ у них —
 * ключ страницы.
 */
export default {
	name: '_Pagination',
	extends: BasePagination,
	expose: useExpose(),
	setup(props: PaginationProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(PaginationDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const refs = useAdapter(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			PaginationCollectionDescriptor(),
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

		return extendBinding(joinBindings(refs, refsCollection), {
			/**
			 * Одна иконка на обе стрелки: роли «влево» в контракте иконок нет, и
			 * ту стрелку, что смотрит в начало строки, зеркалит тема.
			 */
			arrowIconTag: roleIcon('arrowRight'),
		})
	},
}
