<script lang="ts">
import { Button } from '../button'
import { Calendar } from '../calendar'
import { DateInput } from '../date-input'
import { Frame } from '../frame'
import { Icon } from '../icon'
import SetupDatePicker from './setup.component'

export default { ...SetupDatePicker, components: { Button, Calendar, DateInput, Frame, Icon } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:id="id"
		:class="classes"
		v-bind="{ ...attrs, ...rootAria, ...dataset }"
	>
		<!--
			DatePicker — поле даты и календарь в панели, как Select — поле и
			список. Корень — якорь панели: она открывается под ним от его
			начала, у края окна — над ним. Своей коробки у корня одной даты нет,
			у диапазона корень и есть коробка поля (`--range`).

			На корне — `id` DatePicker, атрибуты снаружи и набор корня
			(`rootAria`): у диапазона корень — группа полей концов со своим
			именем, у одной даты группа — само поле, и набор пуст. `data-open` и
			`data-disabled` — для темы и потребителя.

			Ниже оба режима подряд: одна дата и диапазон. В разметке стоит один
			из них — по `mode`. Поля, календарь и его движок — экземпляры ядра
			DatePicker (`:ctrl`, `:engine`): размер, вариант, `disabled`,
			локаль, границы и значение им раздаёт ядро, а не разметка.
		-->

		<!--
			Одна дата. Поле — готовый DateInput: коробка, части, кольцо фокуса и
			ошибка — его. Кнопка календаря — в его слоте `trailing`: обёртку
			слота у конца поля держит тема DateInput.

			Поле и есть группа частей, поэтому имя DatePicker (`aria_label`,
			`aria_labelledBy`, `aria_describedBy`) уходит ему: так оно дойдёт и до
			частей там, где группы скринридер не объявляет.
		-->
		<DateInput
			v-if="mode === 'single'"
			embedded="date-picker.field"
			class="s-date-picker__field"
			:ctrl="field"
			:aria_label="aria_label"
			:aria_labelledBy="aria_labelledBy"
			:aria_describedBy="aria_describedBy"
		>
			<template #trailing>
				<!--
					Кнопка календаря. Вида нет: тема красит её по контексту, как
					очистку Select. Пока панель открыта, она нажата (`data-selected`).
					Связку с панелью (`aria-haspopup`, `aria-expanded`,
					`aria-controls`) и имя кнопка получает набором `triggerAria`, а
					выключена она, когда открыть панель нельзя — у выключенного и
					только для чтения. Нажатие ловит плагин открытия на корне.
					Значок — слот `trigger-icon`, по умолчанию иконка роли
					`calendar` — без своего размера: по кеглю кнопки.
				-->
				<Button
					embedded="date-picker.trigger"
					class="s-date-picker__trigger"
					:size="size"
					:disabled="!openable"
					v-bind="{ ...triggerAria, ...triggerDataset }"
				>
					<slot name="trigger-icon">
						<Icon embedded="date-picker.trigger-icon" :tag="calendarIconTag" />
					</slot>
				</Button>
			</template>
		</DateInput>

		<!--
			Диапазон: поле начала, тире, поле конца и кнопка — одна коробка на
			корне. Поля внутри без своей рамки (тема, по контексту), кнопка — после
			поля конца, а не в его слоте: она выбирает весь период, а не конец.
			Тире — для глаза, скринридеру оно не нужно: поля называют свои концы
			сами — именами `startLabel` и `endLabel`, выходами DatePicker из
			словаря.
		-->
		<template v-else>
			<DateInput
				embedded="date-picker.start"
				class="s-date-picker__start"
				:ctrl="start"
				:aria_label="startLabel"
			/>
			<span class="s-date-picker__dash" aria-hidden="true">–</span>
			<DateInput
				embedded="date-picker.end"
				class="s-date-picker__end"
				:ctrl="end"
				:aria_label="endLabel"
			/>
			<Button
				embedded="date-picker.trigger"
				class="s-date-picker__trigger"
				:size="size"
				:disabled="!openable"
				v-bind="{ ...triggerAria, ...triggerDataset }"
			>
				<slot name="trigger-icon">
					<Icon embedded="date-picker.trigger-icon" :tag="calendarIconTag" />
				</slot>
			</Button>
		</template>

		<!--
			Панель — Frame, телепорт в `body`: поверхность, кромка и тень — как у
			панелей Select и Popover. Открытость — `visible` панели, как у Select:
			закрытая панель прячется, а не размонтируется. Подложки, крестика и
			подвала нет — нажатие мимо закрывает панель.

			Якорь — корень: панель встаёт под ним от его начала, а у нижнего края
			окна — над ним (сторону выбирает `TAnchorPlugin`). Панель
			телепортирована, поэтому `dismiss_ownerAttribute` помечает её
			владельцем — иначе нажатие в календарь считалось бы нажатием мимо.

			На панель ложится набор `panelAria`: `role="dialog"`, `aria-modal`,
			имя и `id`, на который ссылается `aria-controls` кнопки. `tabindex="-1"`
			— фокус встаёт на саму панель, когда внутри нечего фокусировать.

			`panelDataset` — `data-*` панели: признак «тянут» (`data-swiping`), по
			которому тема снимает переход, пока панель идёт за пальцем. Набор
			отдельный от `panelAria`: ARIA и `data-*` не смешиваются. Открытость
			(`data-open`) Frame пишет сам, сторону после flip (`data-placement`) —
			плагин якоря, сдвиг во время жеста (`--s-swipe-offset`) — плагин жеста.
		-->
		<Frame
			embedded="date-picker.frame"
			class="s-date-picker__panel"
			tabindex="-1"
			:visible="open"
			position="fixed"
			:anchor_anchor="rootElement"
			:anchor_offset="4"
			v-bind="{ ...panelAria, ...panelDataset, ...dismiss_ownerAttribute }"
		>
			<!--
				Полоса, за которую панель тянут, — пока жест включён. Она говорит,
				что панель можно смахнуть, и сама ничего не делает: потребитель её
				не адресует, скринридеру она не нужна (`aria-hidden`). Стоит она у
				края со стороны поля (`data-placement`), ставит её тема. Закрыть без
				перетаскивания — Escape, выбор и нажатие мимо.
			-->
			<div v-if="handleRendered" class="s-date-picker__handle" aria-hidden="true" />

			<!--
				Содержимое — обёртка календаря, и прокручивается она, а не панель:
				пока жест включён, плагин жеста отдаёт касание вдоль оси панели
				жесту (`touch-action`), и прокручиваемую саму панель палец бы не
				прокрутил. Своя прокрутка у содержимого касание оставляет себе.

				Календарь — готовый Calendar над экземпляром и движком ядра
				DatePicker. Своей поверхности у него нет, её даёт панель. Содержимое
				дня — слот `item` DatePicker, отданный календарю под тем же именем,
				со scope `{ item }`.
			-->
			<div class="s-date-picker__content">
				<Calendar
					embedded="date-picker.calendar"
					class="s-date-picker__calendar"
					:ctrl="calendar"
					:engine="engine"
				>
					<template #item="{ item }">
						<slot name="item" :item="item" />
					</template>
				</Calendar>
			</div>
		</Frame>
	</div>
</template>
