// Fungsi-fungsi pembantu untuk mengelola alur permainan secara server-side

export function generateDiceRoll(): number {
  // Menghasilkan angka dadu acak 1-6
  return Math.floor(Math.random() * 6) + 1
}

export function isValidPawnMove(
  currentPosition: number | null, 
  diceValue: number, 
  isAtBase: boolean,
  isInHomeTrack: boolean
): boolean {
  // Pion di base hanya bisa keluar jika dadu 6
  if (isAtBase) {
    return diceValue === 6
  }

  // Validasi posisi di track
  // Di game ini, jalur memiliki 52 kotak (0-51)
  if (!isAtBase && !isInHomeTrack) {
    return true // Bisa digerakkan
  }

  // Jika di home track (6 kotak menuju finish)
  // Pion harus pas ke finish
  if (isInHomeTrack && currentPosition !== null) {
    const spacesLeft = 5 - currentPosition
    return diceValue <= spacesLeft
  }

  return false
}
