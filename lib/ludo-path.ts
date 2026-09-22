// Sistem Koordinat Path Ludo (Grid 15x15)
// Koordinat 0-indexed (row, col)

// Array koordinat jalur utama (52 langkah) searah jarum jam
// Dimulai dari petak keluar Biru (kiri bawah)
export const mainPath = [
  // Biru naik
  {r: 13, c: 6}, {r: 12, c: 6}, {r: 11, c: 6}, {r: 10, c: 6}, {r: 9, c: 6},
  // Biru ke kiri
  {r: 8, c: 5}, {r: 8, c: 4}, {r: 8, c: 3}, {r: 8, c: 2}, {r: 8, c: 1}, {r: 8, c: 0},
  // Ujung kiri atas
  {r: 7, c: 0}, 
  // Merah ke kanan
  {r: 6, c: 0}, {r: 6, c: 1}, {r: 6, c: 2}, {r: 6, c: 3}, {r: 6, c: 4}, {r: 6, c: 5},
  // Merah naik
  {r: 5, c: 6}, {r: 4, c: 6}, {r: 3, c: 6}, {r: 2, c: 6}, {r: 1, c: 6}, {r: 0, c: 6},
  // Ujung atas kanan
  {r: 0, c: 7}, 
  // Hijau turun
  {r: 0, c: 8}, {r: 1, c: 8}, {r: 2, c: 8}, {r: 3, c: 8}, {r: 4, c: 8}, {r: 5, c: 8},
  // Hijau ke kanan
  {r: 6, c: 9}, {r: 6, c: 10}, {r: 6, c: 11}, {r: 6, c: 12}, {r: 6, c: 13}, {r: 6, c: 14},
  // Ujung kanan bawah
  {r: 7, c: 14}, 
  // Kuning ke kiri
  {r: 8, c: 14}, {r: 8, c: 13}, {r: 8, c: 12}, {r: 8, c: 11}, {r: 8, c: 10}, {r: 8, c: 9},
  // Kuning turun
  {r: 9, c: 8}, {r: 10, c: 8}, {r: 11, c: 8}, {r: 12, c: 8}, {r: 13, c: 8}, {r: 14, c: 8},
  // Ujung bawah kiri
  {r: 14, c: 7},
  // (Selesai, petak ke-52 kembali ke belakang awal biru)
  {r: 14, c: 6}
]

// Offset titik awal setiap warna di mainPath
export const startOffsets = {
  blue: 0,
  red: 13,
  green: 26,
  yellow: 39
}

// Jalur khusus menuju rumah (Home Track)
export const homeTracks = {
  blue: [
    {r: 13, c: 7}, {r: 12, c: 7}, {r: 11, c: 7}, {r: 10, c: 7}, {r: 9, c: 7}, {r: 8, c: 7} // Finish
  ],
  red: [
    {r: 7, c: 1}, {r: 7, c: 2}, {r: 7, c: 3}, {r: 7, c: 4}, {r: 7, c: 5}, {r: 7, c: 6} // Finish
  ],
  green: [
    {r: 1, c: 7}, {r: 2, c: 7}, {r: 3, c: 7}, {r: 4, c: 7}, {r: 5, c: 7}, {r: 6, c: 7} // Finish
  ],
  yellow: [
    {r: 7, c: 13}, {r: 7, c: 12}, {r: 7, c: 11}, {r: 7, c: 10}, {r: 7, c: 9}, {r: 7, c: 8} // Finish
  ]
}

// Koordinat absolut dalam kandang (Base)
export const basePositions = {
  blue: [
    {r: 10.5, c: 1.5}, {r: 10.5, c: 3.5}, {r: 12.5, c: 1.5}, {r: 12.5, c: 3.5}
  ],
  red: [
    {r: 1.5, c: 1.5}, {r: 1.5, c: 3.5}, {r: 3.5, c: 1.5}, {r: 3.5, c: 3.5}
  ],
  green: [
    {r: 1.5, c: 10.5}, {r: 1.5, c: 12.5}, {r: 3.5, c: 10.5}, {r: 3.5, c: 12.5}
  ],
  yellow: [
    {r: 10.5, c: 10.5}, {r: 10.5, c: 12.5}, {r: 12.5, c: 10.5}, {r: 12.5, c: 12.5}
  ]
}
