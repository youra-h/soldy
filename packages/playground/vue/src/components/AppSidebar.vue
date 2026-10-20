<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ListBox } from '@soldy-ui/vue'
import { MENU_GROUPS, menuOf } from '../catalog'
import { hostOf } from '../hosts'
import { frameworkOf } from '../navigation'

const route = useRoute()
const router = useRouter()

/** Фреймворк из адреса: меню — то, что умеет показать его хост. */
const framework = computed(() => frameworkOf(route))
const host = computed(() => hostOf(framework.value))

/**
 * Пункты меню — данными, а не `ListBox.Item` в разметке: секции групп список
 * рисует только из данных, по метке группы в отметках элемента (`_.group`).
 * Порядок — `menuOf`: группы порядком `MENU_GROUPS`, внутри группы — по
 * алфавиту.
 */
const items = computed(() =>
	menuOf(host.value).map((entry) => ({
		value: entry.id,
		text: entry.label,
		_: { group: entry.group },
	})),
)

/**
 * Текущий пункт — производная от маршрута, а не отдельное состояние.
 *
 * У `ListBox` своё состояние выбора есть, но источником истины остаётся адрес:
 * иначе прямая ссылка или «назад» в браузере рассинхронизировали бы подсветку.
 */
const current = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

function open(id: unknown): void {
	const next = String(id ?? '')

	if (next && next !== current.value) router.push(`/${framework.value}/${next}`)
}
</script>

<template>
	<nav class="pg__sidebar">
		<RouterLink :to="`/${framework}`">
			<div class="pg__sidebar-title">Витрина</div>
		</RouterLink>

		<!--
			Меню на `value` списка, а не на `selected` каждого элемента.

			Первая версия ходила через элементы, потому что у `ListBox` не было
			значения: выбор отдавался наружу списком объектов — внутренней
			моделью коллекции. Теперь `TListBox` растёт от `TValueControl`, и на
			вопрос «что выбрано» отвечает само поле, одним пропом.

			Список один: компоненты и слои наследования — группы реестра
			(`MENU_GROUPS`), и «Слои» — последняя из них, а не второй список
			рядом. Заголовков над списком нет — их заменили подписи групп, — а
			имя списку даёт `aria-label`: его ListBox кладёт на узел списка.
		-->
		<ListBox
			mode="single"
			class="pg__menu"
			aria-label="Компоненты"
			:items="items"
			:groups="MENU_GROUPS"
			:value="current"
			@update:value="open"
		/>
	</nav>
</template>
