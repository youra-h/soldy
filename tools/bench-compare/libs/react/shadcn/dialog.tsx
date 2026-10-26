import { Button } from './ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'

/** A button opens a dialog with a field inside, as the soldy preview. */
export default function Page() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Открыть окно</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Настройки</DialogTitle>
					<DialogDescription>
						Произвольное содержимое: текст, поля, кнопки
					</DialogDescription>
				</DialogHeader>
				<Input placeholder="Имя" />
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Отмена</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button>Сохранить</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
