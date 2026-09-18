<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { createEngineSelection, isEventSource } from '@soldy/core'
import { TPluginBundle } from '@soldy/plugins'
import {
	createInstance,
	type TComponentEntry,
	type TInstance,
	type TPropControl,
} from '@soldy/playground-shared'
import { PREVIEW_COMPONENTS } from '../previews'
import { propSnippet, instanceSnippet } from '../snippet'
import PropControl from './PropControl.vue'
import CodeView from './CodeView.vue'
import type { TEventSource } from '../composables/useEvents'

const props = defineProps<{
	entry: TComponentEntry
	control: TPropControl
	/**
	 * Обработчики событий с пометкой источника. Обе колонки эмитят одинаковые
	 * имена, и без пометки нельзя понять, чьё событие пришло.
	 */
	tag: (source: TEventSource) => Record<string, (...args: unknown[]) => void>
	iconVersion: number
}>()

const value = shallowRef<unknown>(props.control.default)

const preview = computed(() => PREVIEW_COMPONENTS[props.entry.id])

/**
 * Экземпляр ядра для правой колонки.
 *
 * Создаётся один раз на строку: у каждого пропа свой компонент, и общий
 * экземпляр склеил бы соседние строки — правка `size` меняла бы и превью
 * `variant`.
 */
const instance = shallowRef(createInstance(props.entry))

const isCollectionRow = props.control.scope === 'collection'

/**
 * Движок правой колонки — только для коллекционных строк, и строится сразу.
 *
 * Раньше стенд ждал его событием `engine:create`: превью создавало движок
 * внутри себя, и до монтирования достать его было нечем. Теперь движок можно
 * собрать снаружи и отдать пропом `:engine` — стенд строит его сам, ещё до
 * первого рендера превью, тем же способом, каким это делает любой потребитель
 * библиотеки.
 *
 * Уровня `createEngineSelection` достаточно: единственный редактируемый
 * коллекционный проп на странице — `mode`, а он живёт на расширении
 * `selection`. Остальное (`accordion`, `list`, `select`, `factory`...)
 * недостающее компонент доустановит сам при привязке — и в компоненте пропом,
 * и в компоненте инстансом, потому что оба получают один и тот же движок.
 */
const engine = isCollectionRow ? createEngineSelection() : null

/**
 * Фасад коллекции правой колонки — тонкая обёртка над тем же движком.
 *
 * Строится сразу и с тем же владельцем, что получит настоящий компонент:
 * `instance.value` — это и есть тот инстанс, который уйдёт ему пропом
 * `:ctrl="instance"` и станет внутри `adapter.instance`. Один владелец на
 * обе стороны — фасад дополняет движок владельческими расширениями сразу,
 * своим же конструктором, а не ждёт, пока это сделает превью.
 *
 * Без `owner` было бы иначе: `TAccordionCollectionFacade` и соседи трогают
 * владельческое расширение в собственном конструкторе (`this.extensions
 * .accordion.events`), а `resolveEngine` довешивает его только при известном
 * `owner`. Тот же общий владелец заодно не даёт сработать предупреждению
 * «движок уже привязан к другому компоненту» — второго владельца тут нет,
 * оба фасада ссылаются на один и тот же `instance.value`.
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
 * только инстанс, их отдаёт одно это событие на шине самого инстанса. Своего
 * bundle стенд не собирает: набор плагинов — инвариант компонента, а не его
 * параметр. Перемонтирование колонки (смена пакета иконок меняет `key`)
 * собирает новый bundle со свежими плагинами — поэтому значение пишется при
 * каждом его появлении, а не только при смене.
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
 */
function write(next: unknown): void {
	// Пустая строка означает «проп не задан», а не пустое значение
	const written = next === '' ? undefined : next
	const control = props.control

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

// Пресет первым: собственное значение строки его перекрывает, а не наоборот
const propBind = computed(() => ({
	...props.control.preset,
	...(value.value === undefined || value.value === ''
		? {}
		: { [props.control.name]: value.value }),
	...props.tag('props'),
	key: props.iconVersion,
}))

const instanceBind = computed(() => ({
	// Пресет разметкой, рядом с `ctrl`: адаптер пишет написанные пропы и в
	// инстанс, и в фасад коллекции (`useSyncProps.passedNames`), а `mode`
	// у компонентной строки иначе записать некуда — своего движка у неё нет
	...props.control.preset,
	ctrl: instance.value,
	// Отдаём собственный движок пропом — компонент допривяжет к нему свой
	// `owner` сам, а `engine:create`, который он при этом эмитит, идёт в общий
	// журнал событий как обычно, без отдельного перехвата
	...(engine ? { engine } : {}),
	...props.tag('instance'),
	key: props.iconVersion,
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

		<div class="pg-prop__columns">
			<div class="pg-col">
				<div class="pg-col__head">Component</div>
				<div class="pg-col__stage">
					<component :is="preview" v-if="preview" v-bind="propBind" />
				</div>
				<CodeView
					:name="`${entry.label}-${control.name}`"
					:code="propSnippet(entry, control.name, value, control.preset)"
				/>
			</div>

			<div class="pg-col">
				<div class="pg-col__head">Component Instance</div>
				<div class="pg-col__stage">
					<component :is="preview" v-if="preview" v-bind="instanceBind" />
				</div>
				<CodeView
					:name="`${entry.label}-${control.name}-instance`"
					:code="instanceSnippet(entry, control, value)"
				/>
			</div>
		</div>
	</section>
</template>
