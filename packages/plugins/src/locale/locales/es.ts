import { freezeLocale } from '../locale'

/** Испанский (Испания). Другой регион — `extendLocale(esES, { tag: 'es-MX' })`. */
export const esES = freezeLocale({
	tag: 'es-ES',
	translations: {
		modal: { close: 'Cerrar' },
		dialog: { maximize: 'Maximizar' },
		popover: { close: 'Cerrar' },
		tabs: { close: 'Cerrar {name}' },
		tags: { close: 'Cerrar {name}', more: 'Más' },
		scroller: { prev: 'Desplazar hacia atrás', next: 'Desplazar hacia adelante' },
		field: { clear: 'Borrar {name}' },
		table: { selectAll: 'Seleccionar todo' },
		calendar: {
			prevMonth: 'Mes anterior',
			nextMonth: 'Mes siguiente',
			prevYear: 'Año anterior',
			nextYear: 'Año siguiente',
			prevYears: '12 años anteriores',
			nextYears: '12 años siguientes',
		},
		datePicker: {
			trigger: 'Elegir fecha',
			start: 'Fecha de inicio',
			end: 'Fecha de fin',
			confirm: 'Aceptar',
			cancel: 'Cancelar',
		},
	},
})
