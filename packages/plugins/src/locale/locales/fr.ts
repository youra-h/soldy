import { freezeLocale } from '../locale'

/** Французский (Франция). */
export const frFR = freezeLocale({
	tag: 'fr-FR',
	translations: {
		modal: { close: 'Fermer' },
		dialog: { maximize: 'Agrandir' },
		popover: { close: 'Fermer' },
		tabs: { close: 'Fermer {name}' },
		tags: { close: 'Fermer {name}', more: 'Plus' },
		scroller: { prev: 'Défiler vers l’arrière', next: 'Défiler vers l’avant' },
		field: { clear: 'Effacer {name}' },
		table: { selectAll: 'Tout sélectionner' },
		calendar: {
			prevMonth: 'Mois précédent',
			nextMonth: 'Mois suivant',
			prevYear: 'Année précédente',
			nextYear: 'Année suivante',
			prevYears: '12 années précédentes',
			nextYears: '12 années suivantes',
		},
		datePicker: {
			trigger: 'Choisir une date',
			start: 'Date de début',
			end: 'Date de fin',
			confirm: 'OK',
			cancel: 'Annuler',
		},
	},
})
