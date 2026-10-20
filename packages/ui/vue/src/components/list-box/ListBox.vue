<script lang="ts">
import { ListBoxItem } from './item'
import { ListBoxGroup } from './group'
import SetupListBox from './setup.component'

export default { ...SetupListBox, components: { ListBoxItem, ListBoxGroup } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...dataset, ...containerAttrs }"
	>
		<!--
			Корень — рамка: шапка, список и подвал. Набор `aria` — это сам список
			(`role="listbox"`, `aria-multiselectable`, имя от `aria_label`), и
			лежит он на узле списка, а не на корне: в `listbox` ARIA пускает только
			опции и группы, а шапка и подвал — место полей и кнопок. На узле списка
			и остановка Tab: по элементам ходят стрелки его клавиатуры
			(`TListKeyboardPlugin`). На корне — `attrs` и `dataset`: тема красит
			рамку по корню.

			Атрибуты потребителя делятся, как у поля: класс и стиль — корню
			(`containerAttrs`), остальное — узлу списка (`controlAttrs`), поверх его
			`aria` и остановки Tab. `aria-label` и `id` потребителя называют список,
			а не рамку без роли, а `tabindex="-1"` снимает список с остановок Tab.

			Предел строк (`maxRows`) плагин высоты ставит узлу списка: он и
			прокручивается, а шапка и подвал стоят на месте.
		-->
		<slot name="header" />
		<div class="so-list-box__list" tabindex="0" v-bind="{ ...aria, ...controlAttrs }">
			<slot>
				<!--
					Элементы — то, что рисует коллекция, по секциям группировки
					(`drawnSections`), ключ секции — её ключ. Группа с подписью — в
					`ListBoxGroup`, элементы без группы — прямо в списке, между
					соседними секциями, пока его просит список (`groupSeparators`), —
					разделитель: немой `div` (`aria-hidden`), а не `separator` — в
					`listbox` ARIA пускает только опции и группы. Секции идут порядком
					показанного, поэтому стрелки ходят так же, как элементы стоят на
					экране. Без групп секция одна — ни обёртки, ни разделителя.

					В секции — её записи по порядку, ключ — ключ записи. Без окна это
					все показанные элементы секции. В окне обёртки `Virtual` (у списка
					без групп) — видимые и распорки на месте пропущенных: `div` под
					`aria-hidden`, высоту которого тема берёт из его стиля. Одна петля на
					элементы и распорки: петли по блокам перемонтировали бы элемент,
					когда он переходит из блока в блок.

					Слоты элементов статические и получают элемент через scope —
					динамические имена резолвит только Vue (см. Tabs.vue). Проброс
					целиком: у каждого слота элемента есть `item-<слот>`, и его scope —
					scope слота элемента плюс сам элемент. Записан он у элементов группы
					и у элементов без неё: обёртка у них разная.

					Отметку элемент рисует сам, пока слот не задан, — поэтому слот
					отметки отдаётся ему, только когда задан списку.
				-->
				<template v-for="(section, index) in drawnSections" :key="section.key">
					<div
						v-if="groupSeparators && index > 0"
						class="so-list-box__separator"
						aria-hidden="true"
					></div>
					<ListBoxGroup v-if="section.group" :label="section.group.label">
						<template v-for="entry in section.entries" :key="entry.key">
							<div
								v-if="entry.kind === 'filler'"
								class="so-list-box__filler"
								aria-hidden="true"
								:style="entry.style"
							></div>
							<ListBoxItem v-else :ctrl="entry.item">
								<template #leading>
									<slot name="item-leading" :item="entry.item" />
								</template>
								<template #default="{ text, selected }">
									<slot
										name="item"
										:item="entry.item"
										:text="text"
										:selected="selected"
									/>
								</template>
								<template #trailing>
									<slot name="item-trailing" :item="entry.item" />
								</template>
								<template
									v-if="$slots['item-indicator-icon']"
									#indicator-icon="{ selected }"
								>
									<slot
										name="item-indicator-icon"
										:item="entry.item"
										:selected="selected"
									/>
								</template>
							</ListBoxItem>
						</template>
					</ListBoxGroup>
					<template v-else>
						<template v-for="entry in section.entries" :key="entry.key">
							<div
								v-if="entry.kind === 'filler'"
								class="so-list-box__filler"
								aria-hidden="true"
								:style="entry.style"
							></div>
							<ListBoxItem v-else :ctrl="entry.item">
								<template #leading>
									<slot name="item-leading" :item="entry.item" />
								</template>
								<template #default="{ text, selected }">
									<slot
										name="item"
										:item="entry.item"
										:text="text"
										:selected="selected"
									/>
								</template>
								<template #trailing>
									<slot name="item-trailing" :item="entry.item" />
								</template>
								<template
									v-if="$slots['item-indicator-icon']"
									#indicator-icon="{ selected }"
								>
									<slot
										name="item-indicator-icon"
										:item="entry.item"
										:selected="selected"
									/>
								</template>
							</ListBoxItem>
						</template>
					</template>
				</template>
			</slot>
			<!--
				Пустой список — как у Select: пока показанных элементов нет, на их
				месте слот `empty`, внутри списка. Пустой `listbox` для скринридера —
				тупик, а сообщение объясняет, что происходит.
			-->
			<slot v-if="shown.length === 0" name="empty" />
		</div>
		<slot name="footer" />
	</div>
</template>
