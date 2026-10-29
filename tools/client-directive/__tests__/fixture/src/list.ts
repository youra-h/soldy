// Parts hung on an owner, as `withParts` does: React only through the imports
import { Button } from './button'
import { Item } from './item'

export const List = Object.assign(Button, { Item })
