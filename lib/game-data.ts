export type Player = {
  id?: string
  studentCode?: string
  name: string
  color: 'blue' | 'green' | 'yellow' | 'red'
  score: number
  xp: number
  totalXp?: number
  totalScore?: number
  level: number
  avatar: string
  active: boolean
}

export const boardCells = Array.from({ length: 225 }, (_, index) => index)
export type Question = {
  id: string
  code?: string
  text?: string
  content?: string
  options: Array<{ key: string; text: string } | Record<string, string>>
  difficulty?: string
  correctAnswer?: string
  explanation?: string
}

export function getBoardCellClass(cell: number) {
  const row = Math.floor(cell / 15)
  const col = cell % 15
  return {
    isCenter: row >= 6 && row <= 8 && col >= 6 && col <= 8,
    isPath: row >= 6 && row <= 8 || col >= 6 && col <= 8,
    isSafe: [201, 122, 91, 36, 8, 102, 133, 188].includes(cell),
    isStar: [97, 112, 127].includes(cell),
  }
}

export const navItems = ['Game', 'Rank', 'Misi', 'Belajar', 'Profil'] as const
export type NavItem = (typeof navItems)[number]
