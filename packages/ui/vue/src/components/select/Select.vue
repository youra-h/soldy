<script lang="ts">
import { Frame } from '../frame'
import { Input } from '../input'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tags } from '../tags'
import { SelectItem } from './item'
import SetupSelect from './setup.component'

/**
 * Клик по всему полю, а не только по `<input>`: иначе нажатие на стрелку справа
 * ничего не делало бы. Кнопка очистки внутри останавливает всплытие.
 *
 * Пояснение здесь, а не комментарием над корневым `<div>`, и это не вкусовщина:
 * компилятор SFC сохраняет комментарии в dev-режиме, поэтому комментарий перед
 * корнем делает компонент **многокорневым**. Последствия: Vue перестаёт
 * переносить на него `class`/`style`, а в проде комментарии вырезаются — и
 * разметка ведёт себя иначе, чем в разработке.
 */
export default { ...SetupSelect, components: { Frame, Input, Button, Icon, Tags, SelectItem } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:dir="dir ?? undefined"
		@click="ctrl.toggleOpen()"
		v-bind="{ ...dataset, ...containerAttrs }"
	>
		<!--
			Поле — готовый `Input`, а не свой `<input>`: у него уже есть слоты
			`leading`/`trailing` под иконки и стили. Сквозные атрибуты Input
			кладёт на внутренний `<input>`, поэтому весь набор ARIA
			(`role="combobox"`, `aria-expanded`, `aria-controls`,
			`aria-activedescendant`) оказывается ровно там, где нужен.

			`readonly` постоянный — это select-only. Снять его и добавить
			`aria-autocomplete="list"` будет достаточно, чтобы получить
			фильтрацию.

			`readonly` гасит нативный `required` у вложенного `<input>` (браузер
			не валидирует readonly-поле), поэтому `aria-required` в `aria`
			ядро ставит явно — без него состояние осталось бы немым для
			скринридера. См. `TInputControl._syncRequiredAria()`.
		-->
		<slot name="field" :text="valueText" :placeholder="placeholder">
			<Input
				class="s-select__field"
				:value="valueText"
				:name="name"
				:placeholder="field_placeholder"
				:id="id"
				:disabled="disabled"
				:required="required"
				:size="size"
				:variant="variant"
				readonly
				v-bind="{ ...aria, ...controlAttrs }"
			>
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
					-->
					<SelectItem v-for="item in items" :key="item.uid" :ctrl="item">
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

				<slot v-if="items.length === 0" name="empty" />
			</div>
		</Frame>
	</div>
</template>
