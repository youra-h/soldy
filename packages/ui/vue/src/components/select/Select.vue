<script lang="ts">
import { Frame } from '../frame'
import { Input } from '../input'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tags } from '../tags'
import { SelectItem } from './item'
import SetupSelect from './setup.component'

export default { ...SetupSelect, components: { Frame, Input, Button, Icon, Tags, SelectItem } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
		v-bind="{ ...dataset, ...containerAttrs }"
	>
		<!--
			Поле — готовый `Input`, а не свой `<input>`: у него уже есть слоты
			`leading`/`trailing` под иконки и стили. Весь набор ARIA комбобокса
			(`role="combobox"`, `aria-expanded`, `aria-controls`,
			`aria-activedescendant`, `aria-autocomplete`) живёт в `field.aria`
			(см. `TSelect`, `TSelectExtension`, `TSelectKeyboardPlugin`) и
			выводится самим `Input.vue` на его внутренний `<input>` — здесь его
			пробрасывать не нужно.

			`:ctrl="field"`, а не набор пропов: текст, плейсхолдер и ARIA,
			которые видит пользователь, принадлежат отдельному экземпляру
			`TInput` (`field`), которым владеет Select (см. `TSelect.field`,
			`TSelectExtension`). Рядом `:value`/`:placeholder`/`aria` не
			ставить ни в каком виде — тогда снова завелись бы вторые копии.
			`disabled`, `size`, `variant`, `readonly`, `required`, `name`, `id`
			тоже несёт инстанс: Select синхронизирует их с ним сам.

			`readonly` вложенного `Input` — обычный `readonly` Select, которым
			управляет `editable`. В select-only (`editable: false`, по
			умолчанию) поле остаётся readonly; `editable: true` снимает его и
			позволяет вводить текст. Что делает ввод, решает `editableMode`, и
			решает целиком в `TEditablePlugin`: разметка про подсветку и отбор
			не знает ничего, поэтому во всех адаптерах они одинаковы.

			`readonly` гасит нативный `required` у вложенного `<input>` (браузер
			не валидирует readonly-поле), поэтому `aria-required` в `field.aria`
			`TInput` ставит явно — без него состояние осталось бы немым для
			скринридера (см. `TInput._syncInputAccessibility()`).
		-->
		<slot name="field" :field="field">
			<Input class="s-select__field" :ctrl="field" v-bind="controlAttrs">
				<!-- Слоты Input пробрасываются наружу как есть -->
				<template #leading>
					<!--
						Теги — второй компонент со своей коллекцией, не разметка: связка
						«опция ⇄ тег» целиком в `TSelectTagsExtension`. Есть только в
						`multiple` — в `single` `tags` пуст, и слот получает то же поле.
					-->
					<Tags
						v-if="tags"
						class="s-select__tags"
						:ctrl="tags"
						:engine="tags_engine ?? undefined"
					/>
					<slot name="leading" />
				</template>

				<template #trailing>
					<slot name="clear" :clear="collection.clear">
						<Button
							v-if="clearable"
							class="s-select__clear"
							view="plain"
							:size="size"
							:disabled="disabled"
							@click.stop="collection.clear()"
							v-bind="clearAria"
						>
							<Icon :tag="clearIconTag" :size="size" />
						</Button>
					</slot>

					<!--
						Стрелка декоративна: состояние панели уже сказано через
						`aria-expanded` на поле, второй раз объявлять его не надо.
						Icon скрыт от скринридера по умолчанию.

						Класс на обёртке, а не на иконке: тема разворачивает
						стрелку селектором `.s-select[data-open] .s-select__arrow`.
						Поставь его на `Icon` — и подменённая через слот иконка
						перестала бы поворачиваться, причём молча.
					-->
					<span class="s-select__arrow">
						<slot name="arrow-icon">
							<Icon :tag="arrowIconTag" :size="size" />
						</slot>
					</span>

					<slot name="trailing" />
				</template>
			</Input>
		</slot>

		<!--
			Панель телепортируется, поэтому лежит вне поддерева поля. Из этого
			два следствия: якорем ей служит корень Select, а
			`dismiss_ownerAttribute` помечает её владельцем — иначе нажатие
			внутрь панели считалось бы нажатием мимо и закрывало её.

			Открытость — это `visible` (v-show), а не `rendered` (v-if), и это
			важно: опции регистрируются в коллекции при монтировании и выбывают
			при размонтировании. Спрячь панель через `v-if` — и закрытие
			вычистило бы коллекцию, а вместе с ней и выбор, то есть значение
			поля. `v-show` ставит `display: none`, чего достаточно и чтобы
			убрать панель из дерева доступности.
		-->
		<Frame
			:visible="open"
			position="fixed"
			:anchor_anchor="rootElement"
			anchor_placement="bottom-start"
			:anchor_matchWidth="autoFitWidth"
			:anchor_offset="4"
			class="s-select__panel"
			v-bind="dismiss_ownerAttribute"
		>
			<div class="s-select__list" v-bind="list_aria">
				<slot>
					<!--
						Слоты опций статические и получают элемент через scope —
						динамические имена резолвит только Vue (см. Tabs.vue).

						`shown`, а не `items`: это то, что осталось после отбора.
						Скрытая опция размонтируется, но из коллекции не исчезает —
						составом владеют данные, а не разметка (см. `owned` в
						`TCollectionExtension`). Снятие фильтра возвращает её на место
						вместе с выбором.
					-->
					<SelectItem v-for="item in shown" :key="item.uid" :ctrl="item">
						<template #leading>
							<slot name="item-leading" :item="item" />
						</template>
						<template #default>
							<slot name="item" :item="item" />
						</template>
						<template #trailing>
							<slot name="item-trailing" :item="item" />
						</template>
					</SelectItem>
				</slot>

				<slot v-if="shown.length === 0" name="empty" />
			</div>
		</Frame>
	</div>
</template>
