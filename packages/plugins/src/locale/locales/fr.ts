import { freezeLocale } from '../locale'

/** Французский (Франция). */
export const frFR = freezeLocale({
	tag: 'fr-FR',
	translations: {
		modal: { close: 'Fermer' },
		dialog: { maximize: 'Agrandir' },
		popover: { close: 'Fermer' },
		tabs: { close: 'Fermer {name}' },
		tags: { close: 'Fermer {name}' },
		toasts: { region: 'Notifications (F8)', close: 'Fermer {name}' },
		scroller: { prev: 'Défiler vers l’arrière', next: 'Défiler vers l’avant' },
		pagination: { prev: 'Page précédente', next: 'Page suivante' },
		field: { clear: 'Effacer {name}' },
		numberInput: { increment: 'Augmenter {name}', decrement: 'Diminuer {name}' },
		table: { selectAll: 'Tout sélectionner', sort: 'Trier par {name}' },
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
		rating: {
			value: '{value} sur {max}',
			required: 'Veuillez choisir une note',
		},
		textarea: { counter: '{count} / {max}' },
	},
})
