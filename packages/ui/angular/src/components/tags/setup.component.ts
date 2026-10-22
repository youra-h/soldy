import { TCollectionExtension, TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import type { ITags, ITagsProps, TTagsCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupTags — setup-слой Tags.
 *
 * Два контекста, как у Vue и Svelte: свой (`TagsDescriptor` — закрываемость,
 * вид, переполнение) и фасада коллекции (`TagsCollectionDescriptor` — теги,
 * режим и выбор) на общем наборе. Оба собираются один раз, в `ngOnInit`, в
 * контексте инъекции набора, и база получает их одной связкой
 * (`joinBindings`).
 *
 * Расширение коллекции опускает движок и регистратор тегов лифтом — в слой
 * набора (`provideElevator()` в его `providers`): тег, собранный внутри, —
 * разметкой, из данных или в своей раскладке слота `default`, — прочтёт их при
 * своей сборке и войдёт в коллекцию набора.
 *
 * `engine` — готовая коллекция снаружи, вход набора. Дали — фасад работает на
 * ней и своей не создаёт, лишь доложит недостающие расширения в неё же. Не
 * дали — соберёт свою. Развилка в `completeEngine`. Так работает ряд тегов в
 * поле Select: инстанс тегов и их коллекцию держит Select (`tags`,
 * `tags_engine`), и набор над ними — `[ctrl]` и `[engine]`.
 *
 * Логики здесь нет: клавиатура — `TTagsKeyboardPlugin`, доводка тега под
 * фокусом в окно ряда — `TTagsScrollPlugin`, роли и остановку Tab по режиму
 * пишет `TTagsExtension`.
 */
export function setupTags(
	ctrl: ITags | undefined,
	props: object,
	engine: ITagsProps['engine'],
): TBinding<ITags, TTagsCollectionFacade> {
	const adapter = createAngularAdapterContext(TagsDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		TagsCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
