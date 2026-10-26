<script setup lang="ts">
import {
	DatePickerCalendar,
	DatePickerCell,
	DatePickerCellTrigger,
	DatePickerContent,
	DatePickerField,
	DatePickerGrid,
	DatePickerGridBody,
	DatePickerGridHead,
	DatePickerGridRow,
	DatePickerHeadCell,
	DatePickerHeader,
	DatePickerHeading,
	DatePickerInput,
	DatePickerNext,
	DatePickerPrev,
	DatePickerRoot,
	DatePickerTrigger,
} from 'reka-ui'

/** A date field of segments with a calendar in a popup, put together as the Reka docs do it. */
defineOptions({ name: 'RekaDatePickerPage' })
</script>

<template>
	<DatePickerRoot>
		<DatePickerField v-slot="{ segments }" aria-label="Дата" style="display: inline-flex">
			<template v-for="item in segments" :key="item.part">
				<DatePickerInput :part="item.part">{{ item.value }}</DatePickerInput>
			</template>
			<DatePickerTrigger>📅</DatePickerTrigger>
		</DatePickerField>
		<DatePickerContent style="background: white; border: 1px solid; padding: 8px">
			<DatePickerCalendar v-slot="{ weekDays, grid }">
				<DatePickerHeader>
					<DatePickerPrev>‹</DatePickerPrev>
					<DatePickerHeading />
					<DatePickerNext>›</DatePickerNext>
				</DatePickerHeader>
				<DatePickerGrid v-for="month in grid" :key="month.value.toString()">
					<DatePickerGridHead>
						<DatePickerGridRow>
							<DatePickerHeadCell v-for="day in weekDays" :key="day">{{
								day
							}}</DatePickerHeadCell>
						</DatePickerGridRow>
					</DatePickerGridHead>
					<DatePickerGridBody>
						<DatePickerGridRow v-for="(week, index) in month.rows" :key="index">
							<DatePickerCell
								v-for="date in week"
								:key="date.toString()"
								:date="date"
							>
								<DatePickerCellTrigger :day="date" :month="month.value" />
							</DatePickerCell>
						</DatePickerGridRow>
					</DatePickerGridBody>
				</DatePickerGrid>
			</DatePickerCalendar>
		</DatePickerContent>
	</DatePickerRoot>
</template>
