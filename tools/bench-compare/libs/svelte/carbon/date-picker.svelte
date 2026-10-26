<script lang="ts">
	import { DatePicker, DatePickerInput } from 'carbon-components-svelte'
</script>

<!-- A date field with a calendar (flatpickr) in a popup, opened from the field. -->
<DatePicker datePickerType="single">
	<DatePickerInput labelText="Дата" placeholder="mm/dd/yyyy" />
</DatePicker>
