export type PawnColor = 'blue' | 'red' | 'green' | 'yellow'

export type PawnState = {
  id: string
  color: PawnColor
  pawnNumber: number // 0-3
  status: 'base' | 'track' | 'home' | 'finished'
  position: number // track: 0-51, home: 0-5, base: 0-3
}

export function initializePawns(): PawnState[] {
  const colors: PawnColor[] = ['blue', 'red', 'green', 'yellow']
  const pawns: PawnState[] = []
  
  for (const color of colors) {
    for (let i = 0; i < 1; i++) {
      pawns.push({
        id: `${color}-${i}`,
        color,
        pawnNumber: i,
        status: 'base',
        position: i
      })
    }
  }
  return pawns
}
