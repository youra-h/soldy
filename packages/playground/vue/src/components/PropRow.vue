<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { createEngine, isEventSource } from '@soldy-ui/core'
import { TPluginBundle } from '@soldy-ui/plugins'
import {
	createInstance,
	isEmptyField,
	type IPreviewHost,
	type TComponentEntry,
	type TInstance,
	type TPreviewEventSink,
	type TPropControl,
} from '@soldy-ui/playground-shared'
import PropControl from './PropControl.vue'
import PreviewStage from './PreviewStage.vue'
import CodeView from './CodeView.vue'

const props = defineProps<{
	entry: TComponentEntry
	control: TPropControl
	/** Хост фреймворка, выбранного в шапке: он и рисует обе колонки. */
	host: IPreviewHost
	/**
	 * Куда отдать события колонки. Обе колонки рисуют один компонент и
	 * отдают одинаковые имена, и без пометки нельзя понять, чьё событие пришло.
	 */
	sink: (column: 'props' | 'instance') => TPreviewEventSink
}>()

const value = shallowRef<unknown>(props.control.default)

/**
 * Экземпляр ядра для правой колонки.
 *
 * Создаётся один раз на строку: у каждого пропа свой компонент, и общий
 * экземпляр склеил бы соседние строки — правка `size` меняла бы и превью
 * `variant`. Строка переживает смену фреймворка (её ключ от него не зависит),
 * и экземпляр вместе с ней: хост другого фреймворка получает тот же `ctrl`.
 */
const instance = shallowRef(createInstance(props.entry))

const isCollectionRow = props.control.scope === 'collection'

/**
 * Движок правой колонки — только для коллекционных строк, и строится сразу.
 *
 * Раньше стенд ждал его событием `engine:create`: превью создавало движок
 * внутри себя, и до монтирования достать его было нечем. Теперь движок можно
 * собрать снаружи и отдать пропом `engine` — стенд строит его сам, ещё до
 * первого рендера превью, тем же способом, каким это делает любой потребитель
 * библиотеки.
 *
 * Уровня `createEngine` достаточно, и он один на все коллекции: состав
 * деталей у каждой свой, а недостающее — `selection` с единственным
 * редактируемым коллекционным пропом `mode`, `accordion`, вид календаря,
 * `factory`… — доставит фасад стенда при сборке, своим же конструктором.
 * Готовый выбор уровня `createEngineSelection` календарю не годится: выбор у
 * него свой, дат, а стандартный занял бы его место. Компонент получает тот же
 * движок — и в колонке пропом, и в колонке инстансом.
 */
const engine = isCollectionRow ? createEngine() : null

/**
 * Фасад коллекции правой колонки — тонкая обёртка над тем же движком.
 *
 * Строится сразу и с тем же владельцем, что получит настоящий компонент:
 * `instance.value` — это и есть тот инстанс, который уйдёт ему пропом `ctrl`
 * и станет внутри `adapter.instance`. Один владелец на обе стороны — фасад
 * дополняет движок владельческими расширениями сразу, своим же
 * конструктором, а не ждёт, пока это сделает превью.
 *
 * Без `owner` было бы иначе: `TAccordionCollectionFacade` и соседи трогают
 * владельческое расширение в собственном конструкторе (`this.extensions
 * .accordion.events`), а `completeEngine` довешивает его только при известном
 * `owner`. Оба фасада ссылаются на один и тот же `instance.value` — второго
 * владельца тут нет.
 */
const facade: TInstance | null = engine ? createFacade(engine) : null

function createFacade(withEngine: unknown): TInstance {
	const collectionDescriptor = props.entry.collectionDescriptor

	// Коллекционная строка без дескриптора коллекции — ошибка манифеста стенда.
	if (!collectionDescriptor) {
		throw new Error(
			`[playground] ${props.entry.id}: у коллекционного пропа нет collectionDescriptor`,
		)
	}

	const Ctor = collectionDescriptor().ctor as new (props: object, options: object) => TInstance

	return new Ctor({}, { engine: withEngine, owner: instance.value })
}

/**
 * Bundle правой колонки — последний, пришедший событием `bundle:create`.
 *
 * Плагины собирает адаптер при монтировании превью, и тому, у кого на руках
 * только инстанс, их отдаёт одно это событие на шине самого инстанса — у
 * адаптера любого фреймворка. Своего bundle стенд не собирает: набор плагинов
 * — инвариант компонента, а не его параметр. Перемонтирование колонки (смена
 * фреймворка или пакета иконок) собирает новый bundle со свежими плагинами —
 * поэтому значение пишется при каждом его появлении, а не только при смене.
 */
let bundle: TPluginBundle | null = null

if (props.control.scope === 'plugin') {
	const events: unknown = instance.value.events

	if (isEventSource(events)) {
		events.on('bundle:create', (created: unknown) => {
			if (!(created instanceof TPluginBundle)) return

			bundle = created
			write(value.value)
		})
	}
}

/**
 * Куда писать проп: коллекционный — в фасад, плагинный — в свой плагин под
 * именем без неймспейса, остальные — в инстанс.
 *
 * Пустое поле — проп не задан, и правило у него то же, что у связки в первой
 * колонке (`TLine.reset`): свойство получает умолчание декларации, а без
 * умолчания (`mode` фасадов) остаётся как есть. Значим ключ, а не значение:
 * объявленное `undefined` (`aria_label`) тоже умолчание. Запись `undefined`
 * мимо этого правила дала бы значение вне типа свойства — у ProgressLinear
 * шкалу без конца (`aria-valuemax="undefined"`), у Tooltip подсказку без
 * задержки.
 */
function write(next: unknown): void {
	const control = props.control
	const empty = isEmptyField(next)

	if (empty && !Object.hasOwn(control, 'default')) return

	const written = empty ? control.default : next

	if (control.scope === 'plugin') {
		// Плагина может не быть: превью `frame` и слоёв — заглушка на
		// ComponentView, и в её bundle нет ни якоря, ни доступного имени
		const plugin = bundle?.get(control.plugin.ctor)

		if (plugin) Reflect.set(plugin, control.plugin.name, written)

		return
	}

	const target = isCollectionRow ? facade : instance.value

	if (target) target[control.name] = written
}

watch(value, write)

onUnmounted(() => instance.value.destroy?.())

/** Приёмники событий колонок — по одному на строку, а не на каждую отрисовку. */
const propSink = props.sink('props')
const instanceSink = props.sink('instance')

// Пресет первым: собственное значение строки его перекрывает, а не наоборот
const propBind = computed(() => ({
	...props.control.preset,
	...(isEmptyField(value.value) ? {} : { [props.control.name]: value.value }),
}))

const instanceBind = computed(() => ({
	// Пресет разметкой, рядом с `ctrl`: сборка применяет написанные пропы и к
	// инстансу, и к фасаду коллекции (`applyInitialProps`), а `mode`
	// у компонентной строки иначе записать некуда — своего движка у неё нет
	...props.control.preset,
	ctrl: instance.value,
	// Отдаём собственный движок пропом — компонент допривяжет к нему свой
	// `owner` сам, а `engine:create`, который он при этом эмитит, идёт в общий
	// журнал событий как обычно, без отдельного перехвата
	...(engine ? { engine } : {}),
}))
</script>

<template>
	<section class="pg-prop">
		<!--
			Имя и контрол стоят рядом и прижаты влево. Обе колонки фиксированной
			ширины, ряд не растягивается: иначе на широком экране `margin-left:
			auto` уводил контрол к правому краю, и чтобы понять, что именно ты
			крутишь, приходилось водить глазами через всю страницу.

			Фиксированная ширина второй колонки выстраивает switch, select и
			input в одну вертикаль, а не по содержимому.
		-->
		<div class="pg-prop__head">
			<span class="pg-prop__name">{{ control.name }}</span>
			<div class="pg-prop__control">
				<PropControl :control="control" v-model="value" />
			</div>
		</div>

		<p class="pg-prop__note">{{ control.description }}</p>

		<!--
			Колонки рисует хост фреймворка (`PreviewStage`), код под ними — тоже
			он: нет генератора у хоста — нет и блоков кода.
		-->
		<div class="pg-prop__columns">
			<div class="pg-col">
				<div class="pg-col__head">Component</div>
				<div class="pg-col__stage">
					<PreviewStage
						:host="host"
						:component="entry.id"
						:bind="propBind"
						:sink="propSink"
					/>
				</div>
				<CodeView
					v-if="host.snippets"
					:name="`${entry.label}-${control.name}`"
					:code="host.snippets.propSnippet(entry, control.name, value, control.preset)"
				/>
			</div>

			<div class="pg-col">
				<div class="pg-col__head">Component Instance</div>
				<div class="pg-col__stage">
					<PreviewStage
						:host="host"
						:component="entry.id"
						:bind="instanceBind"
						:sink="instanceSink"
					/>
				</div>
				<CodeView
					v-if="host.snippets"
					:name="`${entry.label}-${control.name}-instance`"
					:code="host.snippets.instanceSnippet(entry, control, value)"
				/>
			</div>
		</div>
	</section>
</template>
