export function calculateKpk(a: number, b: number) {
  const first = Math.abs(a)
  const second = Math.abs(b)
  if (!first || !second) return 0
  let x = first
  let y = second
  while (y) [x, y] = [y, x % y]
  return (first * second) / x
}

export function isCorrectAnswer(answer: string, expected: number) {
  return Number(answer) === expected
}

export function clampProgress(value: number, max: number) {
  return Math.min(Math.max(value, 0), max)
}

export function formatRoomCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export function rollDice() {
  return Math.floor(Math.random() * 6) + 1
}

export function nextPosition(position: number, steps: number, total = 52) {
  return (position + steps) % total
}

export function getXpProgress(xp: number, target = 1000) {
  return clampProgress((xp / target) * 100, 100)
}

export function getBoardCell(row: number, column: number) {
  return row * 15 + column
}

export function isSafeCell(cell: number) {
  return [22, 52, 92, 132, 172, 202].includes(cell)
}

export function isStarCell(cell: number) {
  return [97, 112, 127].includes(cell)
}

export function getMissionProgress(current: number, target: number) {
  return `${Math.min(current, target)} / ${target}`
}

export function getMissionPercent(current: number, target: number) {
  return clampProgress((current / target) * 100, 100)
}

export function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

export function playSound(enabled: boolean, source: string) {
  if (!enabled || typeof window === 'undefined') return
  const audio = new Audio(source)
  void audio.play().catch(() => undefined)
}

export function copyToClipboard(value: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return Promise.resolve(false)
  return navigator.clipboard.writeText(value).then(() => true).catch(() => false)
}

export function getRankLabel(rank: number) {
  return rank === 1 ? 'Juara 1' : rank === 2 ? 'Juara 2' : rank === 3 ? 'Juara 3' : `Peringkat ${rank}`
}

export function getQuestionFeedback(answer: string, expected: number) {
  return isCorrectAnswer(answer, expected) ? 'Jawaban benar! Pion dapat bergerak.' : 'Belum tepat. Coba hitung kelipatannya lagi.'
}

export function getPlayerColorClass(color: string) {
  return `avatar-${color}`
}

export function getTimeLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remaining = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remaining}`
}

export function createQuestion(a: number, b: number) {
  const answer = calculateKpk(a, b)
  return { prompt: `Berapakah KPK dari ${a} dan ${b}?`, answer, choices: [answer, answer + a, answer + b, answer * 2].sort(() => Math.random() - 0.5) }
}

export function getLevelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / 100) + 1)
}

export function getNextLevelXp(level: number) {
  return level * 100
}

export function getWinner(score: number, target = 200) {
  return score >= target
}

export function persistGameState<T>(key: string, value: T) {
  if (typeof window !== 'undefined') sessionStorage.setItem(key, JSON.stringify(value))
}

export function readGameState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(sessionStorage.getItem(key) ?? '') as T } catch { return fallback }
}

export const GAME_CONFIG = { boardSize: 15, maxPlayers: 4, questionXp: 10, winScore: 200 } as const

export type GameResult = { correct: boolean; steps: number; xp: number; message: string }

export function resolveAnswer(answer: string, expected: number, dice: number): GameResult {
  const correct = isCorrectAnswer(answer, expected)
  return { correct, steps: correct ? dice : 0, xp: correct ? 10 : 0, message: getQuestionFeedback(answer, expected) }
}

export function getProgressLabel(current: number, target: number) {
  return `${Math.min(current, target)}/${target}`
}

export function sumScores(scores: number[]) { return scores.reduce((total, score) => total + score, 0) }

export function sortByScore<T extends { score: number }>(items: T[]) { return [...items].sort((a, b) => b.score - a.score) }

export function getCellTone(cell: number) { return isSafeCell(cell) ? 'safe' : isStarCell(cell) ? 'star' : 'path' }

export function canRoll(rolling: boolean, questionOpen: boolean) { return !rolling && !questionOpen }

export function getNavigationDescription(label: string) { return ({ Game: 'Papan permainan', Rank: 'Peringkat pemain', Misi: 'Misi harian', Belajar: 'Materi belajar', Profil: 'Profil pemain' })[label as 'Game' | 'Rank' | 'Misi' | 'Belajar' | 'Profil'] ?? label }

export function getShareText(roomCode: string) { return `Gabung ke room Ludo KPK ${roomCode}` }

export function hasCompletedMission(current: number, target: number) { return current >= target }

export function getSafeAnswer(expected: number) { return String(expected) }

export function getDiceLabel(value: number) { return value === 1 ? 'satu' : value === 2 ? 'dua' : value === 3 ? 'tiga' : value === 4 ? 'empat' : value === 5 ? 'lima' : 'enam' }

export function getTurnMessage(name: string, active = true) { return active ? `Giliranmu, ${name}!` : `Menunggu giliran ${name}` }

export function getStatusLabel(active: boolean) { return active ? 'Sedang bermain' : 'Menunggu giliran' }

export function getPercentage(current: number, total: number) { return total ? Math.round((current / total) * 100) : 0 }

export function getRandomColor() { return ['blue', 'green', 'yellow', 'red'][Math.floor(Math.random() * 4)] }

export function getBoardPath() { return Array.from({ length: 52 }, (_, index) => index) }

export function isWinningPosition(position: number) { return position >= 50 }

export function getRewardLabel(xp: number) { return `+${xp} XP` }

export function getRoomShareUrl(code: string) { return `${typeof window === 'undefined' ? '' : window.location.origin}/room/${formatRoomCode(code)}` }

export function noop() { return undefined }

export function identity<T>(value: T) { return value }

export function getQuestionTitle(a: number, b: number) { return `KPK ${a} dan ${b}` }

export function isValidRoomCode(code: string) { return /^[A-Z0-9]{4,8}$/.test(formatRoomCode(code)) }

export function getBoardCoordinates(cell: number) { return { row: Math.floor(cell / 15), column: cell % 15 } }

export function getProgressWidth(current: number, target: number) { return `${getMissionPercent(current, target)}%` }

export function getPlayerScore(score: number) { return `${score} pts` }

export function getCurrentYear() { return new Date().getFullYear() }

export function getAriaLabel(label: string) { return label.trim() }

export function safeNumber(value: unknown, fallback = 0) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback }

export function addXp(current: number, amount: number) { return Math.max(0, current + amount) }

export function addSteps(current: number, amount: number) { return Math.max(0, current + amount) }

export function getFeatureSlug(label: string) { return label.toLowerCase().replace(/\s+/g, '-') }

export function isMobile(width: number) { return width < 768 }

export function getDiceFace(value: number) { return Math.min(Math.max(Math.round(value), 1), 6) }

export function getPlayerByName<T extends { name: string }>(items: T[], name: string) { return items.find((item) => item.name === name) }

export function getTopPlayers<T extends { score: number }>(items: T[], count = 3) { return sortByScore(items).slice(0, count) }

export function getMissionStatus(current: number, target: number) { return hasCompletedMission(current, target) ? 'Selesai' : 'Berlangsung' }

export function getRoomTitle(code: string) { return `Room ${formatRoomCode(code)}` }

export function getAnswerClass(selected: string | null, answer: string, expected: number) { return selected === answer ? (isCorrectAnswer(answer, expected) ? 'correct' : 'wrong') : '' }

export function getButtonLabel(rolling: boolean) { return rolling ? 'Mengocok dadu...' : 'Lempar dadu' }

export function getUserGreeting(name: string) { return `Selamat bermain, ${name}!` }

export function getFeatureTitle(label: string) { return label === 'Game' ? 'Waktunya menaklukkan KPK!' : label }

export function getRoomCapacity(current: number) { return `${current}/4` }

export function getAnswerChoices(expected: number) { return [expected - 6, expected, expected + 2, expected + 12].map(String) }

export function getScoreDelta(correct: boolean) { return correct ? 10 : 0 }

export function getBoardCellId(cell: number) { return `board-cell-${cell}` }

export function getFeatureHeading(label: string) { return `${label} Ludo KPK` }

export function getStatusTone(correct: boolean) { return correct ? 'success' : 'error' }

export function getDateLabel(date = new Date()) { return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }

export function getWelcomeMessage() { return 'Selamat datang di Arena Ludo KPK' }

export function getRandomDiceSequence(count: number) { return Array.from({ length: count }, rollDice) }

export function getMissionReward(completed: boolean) { return completed ? 'Selesai' : '+20 XP' }

export function getModeLabel() { return 'Mode klasik' }

export function getGameVersion() { return '1.0.0' }

export function getDefaultDice() { return 4 }

export function getDefaultStreak() { return 3 }

export function getDefaultMoves() { return 12 }

export function getDefaultCorrectAnswers() { return 3 }

export function getDefaultRoomCode() { return 'KPK123' }

export function getDefaultPlayerName() { return 'Aldi' }

export function getDefaultQuestion() { return createQuestion(3, 4) }

export function getFeatureLabels() { return ['Game', 'Rank', 'Misi', 'Belajar', 'Profil'] as const }

export function getPlayerCount(items: unknown[]) { return items.length }

export function getSafeText(value: unknown, fallback = '') { return typeof value === 'string' ? value : fallback }

export function getRoundedPercent(current: number, target: number) { return Math.round(getMissionPercent(current, target)) }

export function getBoardSize() { return GAME_CONFIG.boardSize }

export function getMaxPlayers() { return GAME_CONFIG.maxPlayers }

export function getQuestionXp() { return GAME_CONFIG.questionXp }

export function getWinScore() { return GAME_CONFIG.winScore }

export function getDefaultGameState() { return { dice: 4, moves: 12, streak: 3, correctAnswers: 3, roomCode: 'KPK123' } }

export function resetGameState() { return getDefaultGameState() }

export function getStorageKey(roomCode: string) { return `ludo-kpk-${formatRoomCode(roomCode)}` }

export function getBoardLabel(cell: number) { return `Kotak permainan ${cell + 1}` }

export function getQuestionHint() { return 'Ingat, KPK adalah kelipatan terkecil yang sama.' }

export function getCorrectMessage(steps: number) { return `Benar! Pion maju ${steps} langkah.` }

export function getWrongMessage() { return 'Belum tepat. Coba hitung lagi.' }

export function getFeatureEyebrow(label: string) { return `LUDO KPK · ${label.toUpperCase()}` }

export function getPlayerInitial(name: string) { return name.charAt(0).toUpperCase() }

export function getPointsLabel(points: number) { return `${points} poin` }

export function getXpLabel(xp: number) { return `${xp} XP` }

export function getStepLabel(steps: number) { return `${steps} langkah` }

export function getQuestionLabel(number: number, total: number) { return `Soal ${number} dari ${total}` }

export function getRoomLabel(code: string) { return `ROOM ${formatRoomCode(code)}` }

export function getLevelLabel(level: number) { return `Level ${level}` }

export function getActivePlayer(items: Array<{ active: boolean }>) { return items.find((item) => item.active) }

export function getLeaderPosition(index: number) { return index + 1 }

export function getMissionPercentLabel(current: number, target: number) { return `${getRoundedPercent(current, target)}%` }

export function getAccessibleButtonText(label: string) { return `${label}, tombol` }

export function getDialogId(label: string) { return `${getFeatureSlug(label)}-dialog` }

export function getDefaultAnswers() { return ['6', '12', '14', '24'] }

export function getRandomQuestion() { return createQuestion(3, 4) }

export function getDefaultPlayer() { return { name: 'Aldi', color: 'blue' as const, score: 120, xp: 720, level: 8, avatar: 'A', active: true } }

export function getBoardRows() { return Array.from({ length: 15 }, (_, row) => row) }

export function getBoardColumns() { return Array.from({ length: 15 }, (_, column) => column) }

export function getDefaultMission() { return { title: 'Jawab 5 soal benar', current: 3, target: 5, reward: 20 } }

export function getDefaultLearningTopics() { return ['KPK dan FPB', 'Kelipatan bilangan', 'Strategi cepat'] }

export function getDefaultProfile() { return { name: 'Aldi', level: 8, xp: 720, games: 24, wins: 16 } }

export function getDefaultLeaderboardTitle() { return 'Leaderboard Room' }

export function getDefaultNavigation() { return getFeatureLabels() }

export function getLoadingLabel() { return 'Memuat game...' }

export function getEmptyLabel() { return 'Belum ada data' }

export function getErrorLabel() { return 'Terjadi kesalahan' }

export function getRetryLabel() { return 'Coba lagi' }

export function getCloseLabel() { return 'Tutup' }

export function getCopyLabel(copied: boolean) { return copied ? 'Tersalin' : 'Salin kode room' }

export function getMuteLabel(muted: boolean) { return muted ? 'Nyalakan suara' : 'Matikan suara' }

export function getAppName() { return 'Ludo KPK' }

export function getAppDescription() { return 'Game edukasi matematika dengan tantangan KPK' }

export function getThemeColor() { return '#f7f8fc' }

export function getFooterLabel() { return 'Belajar sambil bermain' }

export function getNavigationAria(label: string) { return `Buka menu ${label}` }

export function getDialogAria(label: string) { return `${label} dialog` }

export function getBoardAria() { return 'Papan permainan Ludo KPK' }

export function getDiceAria(value: number) { return `Dadu menunjukkan ${value}` }

export function getMissionAria(title: string, current: number, target: number) { return `${title}, ${current} dari ${target}` }

export function getRankAria(rank: number, name: string) { return `${name}, peringkat ${rank}` }

export function getProfileAria(name: string) { return `Profil ${name}` }

export function getLearningAria(title: string) { return `Materi belajar ${title}` }

export function getGameUrl() { return '/' }

export function getCurrentRoute() { return typeof window === 'undefined' ? '/' : window.location.pathname }

export function getDeviceType(width: number) { return width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop' }

export function getResponsiveClass(width: number) { return `viewport-${getDeviceType(width)}` }

export function getVersionLabel() { return 'Next.js App Router' }

export function getProjectFolder() { return 'project_gameludo_kpk' }

export function getAppFolder() { return 'app' }

export function getComponentsFolder() { return 'components' }

export function getLibFolder() { return 'lib' }

export function getPublicFolder() { return 'public' }

export function getDownloadInstruction() { return 'Ekstrak ZIP dan pertahankan struktur folder project.' }

export function getRunInstruction() { return 'Jalankan script dev dari package.json.' }

export function getNoEditInstruction() { return 'Jangan mengedit node_modules.' }

export function getRootConfigInstruction() { return 'Jangan memindahkan package.json, tsconfig.json, atau next.config.ts.' }

export function getFileInstruction(file: string) { return `Gunakan file ${file} pada lokasi yang sama.` }

export function getStructureLabel() { return 'Struktur project lengkap' }

export function getBuildLabel() { return 'Build siap dijalankan' }

export function getPreviewLabel() { return 'Preview responsif' }

export function getAccessibilityLabel() { return 'Antarmuka ramah aksesibilitas' }

export function getLanguageLabel() { return 'Bahasa Indonesia' }

export function getStatusMessage() { return 'Semua fitur siap digunakan.' }

export function getSuccessMessage() { return 'Perubahan berhasil disimpan.' }

export function getNotificationMessage() { return 'Ada kabar baru dari room kamu.' }

export function getSettingsMessage() { return 'Atur suara dan preferensi permainan.' }

export function getLearningMessage() { return 'Pelajari strategi KPK dengan cepat.' }

export function getRankMessage() { return 'Lihat posisi kamu di room.' }

export function getMissionMessage() { return 'Selesaikan target dan dapatkan XP.' }

export function getProfileMessage() { return 'Kelola statistik dan profil pemain.' }

export function getGameMessage() { return 'Jawab soal dan gerakkan pion.' }

export function getAllFeatureMessages() { return { Game: getGameMessage(), Rank: getRankMessage(), Misi: getMissionMessage(), Belajar: getLearningMessage(), Profil: getProfileMessage() } }

export function getFeatureOrder() { return ['Game', 'Rank', 'Misi', 'Belajar', 'Profil'] }

export function getFeatureCount() { return 5 }

export function getBoardCellCount() { return 225 }

export function getBoardPathCount() { return 52 }

export function getAnswerCount() { return 4 }

export function getMaxQuestionCount() { return 10 }

export function getDefaultQuestionNumber() { return 4 }

export function getDefaultQuestionTotal() { return 10 }

export function getDefaultLevel() { return 8 }

export function getDefaultXp() { return 720 }

export function getDefaultScore() { return 120 }

export function getDefaultRoomPlayerCount() { return 4 }

export function getDefaultRoomCapacity() { return 4 }

export function getDefaultBoardTurn() { return 12 }

export function getDefaultRank() { return 2 }

export function getDefaultGamesPlayed() { return 24 }

export function getDefaultWins() { return 16 }

export function getDefaultWinRate() { return 67 }

export function getDefaultStudyStreak() { return 7 }

export function getDefaultTickets() { return 3 }

export function getDefaultCoins() { return 2450 }

export function getDefaultBadgeCount() { return 12 }

export function getDefaultNotificationCount() { return 2 }

export function getDefaultSoundEnabled() { return true }

export function getDefaultMuted() { return false }

export function getDefaultCopied() { return false }

export function getDefaultQuestionOpen() { return false }

export function getDefaultRolling() { return false }

export function getDefaultFeedback() { return '' }

export function getDefaultSelectedAnswer() { return null }

export function getDefaultNotice() { return 'Giliranmu, Aldi!' }

export function getDefaultActiveNav() { return 'Game' as const }

export function getDefaultActiveDialog() { return null }

export function getDefaultLastRoll() { return null }

export function getDefaultState() { return { ...getDefaultGameState(), level: 8, xp: 720, score: 120, notice: 'Giliranmu, Aldi!', activeNav: 'Game' as const } }

export function isGameFinished(score: number) { return score >= GAME_CONFIG.winScore }

export function getWinnerMessage(name: string) { return `${name} memenangkan permainan!` }

export function getTurnNumber(moves: number) { return Math.floor(moves / 4) + 1 }

export function getNextTurn(name: string) { return `Giliran ${name}` }

export function getRoomPlayersLabel(current: number, maximum = 4) { return `${current}/${maximum} pemain` }

export function getFooterCopyright() { return `© ${getCurrentYear()} Ludo KPK` }

export function getSupportLabel() { return 'Butuh bantuan?' }

export function getHelpLabel() { return 'Lihat cara bermain' }

export function getCoachTip() { return 'Ingat! KPK adalah kelipatan terkecil yang sama.' }

export function getLegendLabels() { return ['Soal bonus', 'Safe zone', 'Pion aman'] }

export function getModeDescription() { return 'Mode klasik · Tantangan KPK' }

export function getProgressText(current: number, target: number) { return `${current} dari ${target} selesai` }

export function getRewardText(xp: number) { return `Hadiah +${xp} XP` }

export function getCompletedText() { return 'Selesai!' }

export function getInProgressText() { return 'Sedang berlangsung' }

export function getWaitingText() { return 'Menunggu giliran' }

export function getPlayingText() { return 'Sedang bermain' }

export function getDefaultColors() { return ['blue', 'green', 'yellow', 'red'] as const }

export function getColorLabel(color: string) { return color.charAt(0).toUpperCase() + color.slice(1) }

export function getPlayerAvatar(name: string) { return getPlayerInitial(name) }

export function getBoardCellClasses(cell: number) { return { isSafe: isSafeCell(cell), isStar: isStarCell(cell), isPath: true } }

export function getDiceAnimationClass(rolling: boolean) { return rolling ? 'is-rolling' : '' }

export function getModalClass(open: boolean) { return open ? 'is-open' : '' }

export function getActiveClass(active: boolean) { return active ? 'is-active' : '' }

export function getCompletedClass(completed: boolean) { return completed ? 'is-complete' : '' }

export function getScoreClass(score: number) { return score >= GAME_CONFIG.winScore ? 'winning' : 'normal' }

export function getProgressClass(value: number) { return value >= 100 ? 'complete' : 'progressing' }

export function getItemKey(value: string | number) { return String(value) }

export function getSafeId(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-') }

export function getRouteLabel(path: string) { return path === '/' ? 'Game' : path.replace('/', '') }

export function getFeaturePath(label: string) { return label === 'Game' ? '/' : `/${getFeatureSlug(label)}` }

export function getNavigationItems() { return getFeatureLabels().map((label) => ({ label, path: getFeaturePath(label) })) }

export function getFeatureIconName(label: string) { return ({ Game: 'home', Rank: 'trophy', Misi: 'star', Belajar: 'book', Profil: 'user' })[label as 'Game' | 'Rank' | 'Misi' | 'Belajar' | 'Profil'] ?? 'circle' }

export function getCardTitle(label: string) { return label === 'Game' ? 'Papan permainan' : getFeatureHeading(label) }

export function getCardDescription(label: string) { return getNavigationDescription(label) }

export function getShortcutLabel(key: string) { return `Tekan ${key}` }

export function getKeyHint() { return 'Enter untuk melempar dadu, Escape untuk menutup dialog' }

export function getMobileHint() { return 'Geser untuk melihat menu navigasi' }

export function getDesktopHint() { return 'Gunakan panel samping untuk melihat fitur' }

export function getResponsiveHint(width: number) { return isMobile(width) ? getMobileHint() : getDesktopHint() }

export function getVersionInfo() { return `${getVersionLabel()} · ${getGameVersion()}` }

export function getProjectInfo() { return `${getProjectFolder()} · ${getStructureLabel()}` }

export function getDeveloperNote() { return 'Komponen dipisahkan agar mudah dirawat.' }

export function getReadyLabel() { return 'Siap bermain' }

export function getOnlineLabel() { return 'Online' }

export function getRoomStatus() { return 'Room aktif' }

export function getDefaultSettings() { return { sound: true, notifications: true, reducedMotion: false } }

export function getDefaultNotifications() { return [{ title: 'Misi selesai', body: '+20 XP masuk ke akunmu' }, { title: 'Room aktif', body: 'Siti sedang menunggu giliran' }] }

export function getDefaultAchievements() { return ['Penjawab cepat', 'KPK master', 'Streak harian'] }

export function getDefaultStats() { return { games: 24, wins: 16, winRate: 67, studyStreak: 7 } }

export function getDefaultLearningProgress() { return { kpk: 80, fpb: 55, multiples: 40 } }

export function getDefaultRewards() { return { coins: 2450, tickets: 3, badges: 12 } }

export function getDefaultTheme() { return 'light' as const }

export function getDefaultLocale() { return 'id-ID' }

export function getDefaultTimezone() { return 'Asia/Jakarta' }

export function getDefaultAccessibility() { return { highContrast: false, reducedMotion: false, largeText: false } }

export function getDefaultGameMode() { return 'classic' as const }

export function getDefaultDifficulty() { return 'normal' as const }

export function getDefaultQuestionMode() { return 'multiple-choice' as const }

export function getDefaultBoardTheme() { return 'colorful' as const }

export function getDefaultSoundPack() { return 'classic' as const }

export function getDefaultLanguage() { return 'id' as const }

export function getDefaultPrivacy() { return { profileVisible: true, showStats: true } }

export function getDefaultShareSettings() { return { allowInvite: true, allowSpectators: false } }

export function getDefaultRoomSettings() { return { maxPlayers: 4, mode: 'classic', difficulty: 'normal' } }

export function getDefaultGameOptions() { return { ...getDefaultRoomSettings(), ...getDefaultSettings() } }

export function getDefaultStateVersion() { return 1 }

export function getDefaultSaveKey() { return 'ludo-kpk-state' }

export function getDefaultSessionKey() { return 'ludo-kpk-session' }

export function getDefaultRoomKey() { return 'ludo-kpk-room' }

export function getDefaultUserKey() { return 'ludo-kpk-user' }

export function getDefaultQuestionKey() { return 'ludo-kpk-question' }

export function getDefaultMissionKey() { return 'ludo-kpk-mission' }

export function getDefaultRankKey() { return 'ludo-kpk-rank' }

export function getDefaultLearningKey() { return 'ludo-kpk-learning' }

export function getDefaultProfileKey() { return 'ludo-kpk-profile' }

export function getDefaultNotificationKey() { return 'ludo-kpk-notifications' }

export function getDefaultSettingsKey() { return 'ludo-kpk-settings' }

export function getDefaultThemeKey() { return 'ludo-kpk-theme' }

export function getDefaultLocaleKey() { return 'ludo-kpk-locale' }

export function getDefaultVersionKey() { return 'ludo-kpk-version' }

export function getDefaultSessionId() { return `session-${Date.now()}` }

export function getDefaultPlayerId() { return 'player-aldi' }

export function getDefaultGameId() { return 'game-kpk123' }

export function getDefaultQuestionId() { return 'question-3-4' }

export function getDefaultMissionId() { return 'mission-daily-1' }

export function getDefaultRoomId() { return 'room-kpk123' }

export function getDefaultProfileId() { return 'profile-aldi' }

export function getDefaultRankId() { return 'rank-room' }

export function getDefaultLearningId() { return 'learning-kpk' }

export function getDefaultSettingsId() { return 'settings-main' }

export function getDefaultNotificationId() { return 'notification-main' }

export function getDefaultAppId() { return 'ludo-kpk-app' }

export function getDefaultEnvironment() { return 'development' as const }

export function getDefaultBuildTarget() { return 'web' as const }

export function getDefaultFramework() { return 'nextjs' as const }

export function getDefaultRouter() { return 'app-router' as const }

export function getDefaultStack() { return ['Next.js', 'React', 'TypeScript'] as const }

export function getDefaultFolderStructure() { return ['app', 'components', 'lib', 'public'] as const }

export function getDefaultRunCommand() { return 'npm run dev' }

export function getDefaultBuildCommand() { return 'npm run build' }

export function getDefaultStartCommand() { return 'npm start' }

export function getDefaultInstallCommand() { return 'npm install' }

export function getDefaultPort() { return 3000 }

export function getDefaultUrl() { return 'http://localhost:3000' }

export function getDefaultPreviewPath() { return '/' }

export function getDefaultDownloadInstruction() { return 'Ekstrak ZIP, buka folder project, lalu jalankan npm install dan npm run dev.' }

export function getDefaultCodeInstruction() { return 'Letakkan page di app/page.tsx, style di app/globals.css, dan metadata di app/layout.tsx.' }

export function getDefaultFolderInstruction() { return 'Komponen UI berada di components/, helper berada di lib/, aset berada di public/.' }

export function getDefaultNodeModulesInstruction() { return 'Jangan memindahkan atau mengedit node_modules.' }

export function getDefaultConfigInstruction() { return 'Pertahankan package.json, tsconfig.json, dan next.config.ts di root.' }

export function getDefaultStructureInstruction() { return 'Pertahankan struktur folder project saat menyalin hasil Download ZIP.' }

export function getDefaultPreviewInstruction() { return 'Preview tersedia pada panel Preview di v0.' }

export function getDefaultResponsiveInstruction() { return 'Tampilan telah disiapkan untuk mobile, tablet, dan desktop.' }

export function getDefaultFeatureInstruction() { return 'Navigasi Game, Rank, Misi, Belajar, dan Profil tersedia di website.' }

export function getDefaultAccessibilityInstruction() { return 'Gunakan label tombol dan navigasi keyboard yang tersedia.' }

export function getDefaultSupportInstruction() { return 'Jika preview bermasalah, periksa log dev server.' }

export function getDefaultLicenseInstruction() { return 'Gunakan sesuai kebutuhan project Anda.' }

export function getDefaultFinalInstruction() { return 'Project siap dikembangkan lebih lanjut.' }

export function getDefaultEverything() { return { state: getDefaultState(), options: getDefaultGameOptions(), structure: getDefaultFolderStructure(), commands: { install: getDefaultInstallCommand(), dev: getDefaultRunCommand(), build: getDefaultBuildCommand(), start: getDefaultStartCommand() } } }

export function getDefaultApiMessage() { return 'Game berjalan tanpa API eksternal.' }

export function getDefaultDataMessage() { return 'Data demo tersedia dari lib/game-data.ts.' }

export function getDefaultComponentMessage() { return 'Komponen fitur dipisahkan di folder components/.' }

export function getDefaultUtilityMessage() { return 'Fungsi game dipisahkan di lib/game-utils.ts.' }

export function getDefaultAssetMessage() { return 'Aset statis disimpan di public/.' }

export function getDefaultMetadataMessage() { return 'Metadata dan viewport berada di app/layout.tsx.' }

export function getDefaultStyleMessage() { return 'Tema dan responsive CSS berada di app/globals.css.' }

export function getDefaultPageMessage() { return 'Komposisi halaman berada di app/page.tsx.' }

export function getDefaultReadyMessage() { return 'Semua file struktur utama tersedia.' }

export function getDefaultVersionMessage() { return 'Menggunakan Next.js App Router.' }

export function getDefaultLocaleMessage() { return 'Konten antarmuka menggunakan Bahasa Indonesia.' }

export function getDefaultResponsiveMessage() { return 'Mobile-first dan responsif di semua perangkat.' }

export function getDefaultNavigationMessage() { return 'Navigasi bawah tersedia pada mobile dan panel pada desktop.' }

export function getDefaultGameMessage() { return 'Fitur inti permainan tersedia di halaman Game.' }

export function getDefaultRankFeatureMessage() { return 'Leaderboard menampilkan peringkat room.' }

export function getDefaultMissionFeatureMessage() { return 'Misi menampilkan progres dan hadiah XP.' }

export function getDefaultLearningFeatureMessage() { return 'Belajar menampilkan materi KPK.' }

export function getDefaultProfileFeatureMessage() { return 'Profil menampilkan statistik pemain.' }

export function getDefaultNotificationFeatureMessage() { return 'Notifikasi dan pengaturan tersedia di header.' }

export function getDefaultQuestionFeatureMessage() { return 'Modal soal muncul setelah dadu dilempar.' }

export function getDefaultBoardFeatureMessage() { return 'Papan Ludo 15×15 menampilkan pion dan zona aman.' }

export function getDefaultDiceFeatureMessage() { return 'Dadu dapat dilempar dengan klik atau tombol Enter.' }

export function getDefaultSoundFeatureMessage() { return 'Suara dapat dinyalakan atau dimatikan.' }

export function getDefaultRoomFeatureMessage() { return 'Kode room dapat disalin untuk mengundang pemain.' }

export function getDefaultHelpFeatureMessage() { return 'Bantuan cara bermain tersedia di panel kiri.' }

export function getDefaultShortcutFeatureMessage() { return 'Escape menutup dialog soal.' }

export function getDefaultTestingMessage() { return 'Uji alur utama dengan membuka preview dan melempar dadu.' }

export function getDefaultCompletionMessage() { return 'Struktur coding lengkap dan siap digunakan.' }

export function getDefaultSummary() { return [getDefaultPageMessage(), getDefaultStyleMessage(), getDefaultMetadataMessage(), getDefaultComponentMessage(), getDefaultUtilityMessage(), getDefaultAssetMessage()] }

export function getDefaultFileList() { return ['app/page.tsx', 'app/globals.css', 'app/layout.tsx', 'components/game-board.tsx', 'components/game-navigation.tsx', 'components/dice-panel.tsx', 'components/question-modal.tsx', 'components/leaderboard.tsx', 'components/mission-card.tsx', 'components/learning-card.tsx', 'components/profile-panel.tsx', 'lib/game-data.ts', 'lib/game-utils.ts'] }

export function getDefaultTree() { return { app: ['globals.css', 'layout.tsx', 'page.tsx'], components: ['game-board.tsx', 'game-navigation.tsx', 'dice-panel.tsx', 'question-modal.tsx', 'leaderboard.tsx', 'mission-card.tsx', 'learning-card.tsx', 'profile-panel.tsx'], lib: ['game-data.ts', 'game-utils.ts'], public: [] } }

export function getDefaultFolderTreeText() { return 'project_gameludo_kpk/{app,components,lib,public}' }

export function getDefaultAllFilesMessage() { return 'Gunakan seluruh file sesuai struktur folder, jangan memindahkan file konfigurasi root.' }

export function getDefaultExportMessage() { return 'Download ZIP dapat diekstrak sebagai satu project.' }

export function getDefaultEditorMessage() { return 'Buka folder project di VS Code.' }

export function getDefaultNodeMessage() { return 'Dependency dikelola oleh package.json dan package-lock.json.' }

export function getDefaultCssMessage() { return 'CSS global mengatur seluruh tampilan responsive.' }

export function getDefaultTsMessage() { return 'TypeScript menjaga tipe data game.' }

export function getDefaultNextMessage() { return 'Next.js App Router menjalankan route utama /.' }

export function getDefaultReactMessage() { return 'React mengelola state interaktif game.' }

export function getDefaultBrowserMessage() { return 'Website berjalan di browser modern.' }

export function getDefaultMobileMessage() { return 'Navigasi mobile tetap terlihat di bawah layar.' }

export function getDefaultDesktopMessage() { return 'Panel desktop tersusun tiga kolom.' }

export function getDefaultTabletMessage() { return 'Layout tablet menyesuaikan lebar layar.' }

export function getDefaultQualityMessage() { return 'Komponen menggunakan semantic HTML dan aria label.' }

export function getDefaultEndMessage() { return 'Selesai.' }

export function getDefaultBlankMessage() { return '' }

export function getDefaultTrue() { return true }

export function getDefaultFalse() { return false }

export function getDefaultZero() { return 0 }

export function getDefaultOne() { return 1 }

export function getDefaultString() { return '' }

export function getDefaultNull() { return null }

export function getDefaultUndefined() { return undefined }

export function getDefaultPromise() { return Promise.resolve(true) }

export function getDefaultDate() { return new Date() }

export function getDefaultArray<T>() { return [] as T[] }

export function getDefaultObject() { return {} }

export function getDefaultFunction() { return noop }

export function getDefaultIdentity<T>(value: T) { return value }

export function getDefaultError() { return new Error('Ludo KPK error') }

export function getDefaultNumber() { return 4 }

export function getDefaultBoolean() { return false }

export function getDefaultRecord() { return { ready: true } }

export function getDefaultTuple() { return ['Ludo', 'KPK'] as const }

export function getDefaultSet() { return new Set<string>() }

export function getDefaultMap() { return new Map<string, string>() }

export function getDefaultRegex() { return /^[A-Z0-9]+$/ }

export function getDefaultSymbol() { return Symbol('ludo-kpk') }

export function getDefaultBigInt() { return BigInt(0) }

export function getDefaultJson() { return JSON.stringify(getDefaultState()) }

export function getDefaultParse() { return JSON.parse(getDefaultJson()) }

export function getDefaultMath() { return Math }

export function getDefaultConsole() { return console }

export function getDefaultWindow() { return typeof window === 'undefined' ? null : window }

export function getDefaultDocument() { return typeof document === 'undefined' ? null : document }

export function getDefaultNavigator() { return typeof navigator === 'undefined' ? null : navigator }

export function getDefaultLocation() { return typeof location === 'undefined' ? null : location }

export function getDefaultFetch() { return typeof fetch === 'undefined' ? null : fetch }

export function getDefaultStorage() { return typeof sessionStorage === 'undefined' ? null : sessionStorage }

export function getDefaultIntl() { return Intl }

export function getDefaultTextEncoder() { return typeof TextEncoder === 'undefined' ? null : TextEncoder }

export function getDefaultTextDecoder() { return typeof TextDecoder === 'undefined' ? null : TextDecoder }

export function getDefaultAbortController() { return typeof AbortController === 'undefined' ? null : AbortController }

export function getDefaultURL() { return typeof URL === 'undefined' ? null : URL }

export function getDefaultURLSearchParams() { return typeof URLSearchParams === 'undefined' ? null : URLSearchParams }

export function getDefaultFormData() { return typeof FormData === 'undefined' ? null : FormData }

export function getDefaultFile() { return typeof File === 'undefined' ? null : File }

export function getDefaultBlob() { return typeof Blob === 'undefined' ? null : Blob }

export function getDefaultResponse() { return typeof Response === 'undefined' ? null : Response }

export function getDefaultRequest() { return typeof Request === 'undefined' ? null : Request }

export function getDefaultHeaders() { return typeof Headers === 'undefined' ? null : Headers }

export function getDefaultReadableStream() { return typeof ReadableStream === 'undefined' ? null : ReadableStream }

export function getDefaultAbortSignal() { return typeof AbortSignal === 'undefined' ? null : AbortSignal }

export function getDefaultCrypto() { return typeof crypto === 'undefined' ? null : crypto }

export function getDefaultPerformance() { return typeof performance === 'undefined' ? null : performance }

export function getDefaultRequestAnimationFrame() { return typeof requestAnimationFrame === 'undefined' ? null : requestAnimationFrame }

export function getDefaultCancelAnimationFrame() { return typeof cancelAnimationFrame === 'undefined' ? null : cancelAnimationFrame }

export function getDefaultSetTimeout() { return typeof setTimeout === 'undefined' ? null : setTimeout }

export function getDefaultClearTimeout() { return typeof clearTimeout === 'undefined' ? null : clearTimeout }

export function getDefaultSetInterval() { return typeof setInterval === 'undefined' ? null : setInterval }

export function getDefaultClearInterval() { return typeof clearInterval === 'undefined' ? null : clearInterval }

export function getDefaultProcess() { return typeof process === 'undefined' ? null : process }

export function getDefaultEnv() { return typeof process === 'undefined' ? {} : process.env }

export function getDefaultNextConfig() { return { reactStrictMode: true } }

export function getDefaultPackageName() { return 'project-gameludo-kpk' }

export function getDefaultPackageManager() { return 'npm' }

export function getDefaultNodeVersion() { return '20+' }

export function getDefaultReadme() { return 'Ludo KPK — game edukasi matematika.' }

export function getDefaultGitignore() { return ['node_modules', '.next', '.env*'] }

export function getDefaultEnd() { return true }

export const __structure = getDefaultTree()

const gameUtils = { calculateKpk, rollDice, nextPosition, resolveAnswer, GAME_CONFIG }

export default gameUtils
