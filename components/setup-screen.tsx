import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Dices,
  RefreshCw,
} from "lucide-react";
import { Player } from "@/lib/game-data";

type SetupScreenProps = {
  onStart: (context: {
    players: Player[];
    goal: string;
    roomCode: string;
    roomId: string;
    sessionId: string;
  }) => Promise<void>;
};

const PLAYER_COLORS: ("blue" | "green" | "yellow" | "red")[] = [
  "blue",
  "green",
  "yellow",
  "red",
];

// Ubah ke true jika alur Ringkasan Materi ingin digunakan kembali.
const ENABLE_PREGAME_SUMMARY = false;

export function SetupScreen({ onStart }: SetupScreenProps) {
  type AvailableExam = {
    id: string;
    name: string;
    learning_goal: string | null;
    starts_at: string;
    ends_at: string;
    duration_minutes: number;
    question_time_seconds: number | null;
    essay_question_count: number;
    multiple_choice_question_count: number;
    status: "scheduled" | "active";
    availability: "available" | "upcoming";
    is_available: boolean;
  };
  const [exams, setExams] = useState<AvailableExam[]>([]);
  const [examId, setExamId] = useState("");
  const [loadingExams, setLoadingExams] = useState(true);
  const [examError, setExamError] = useState("");
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [goal, setGoal] = useState("");
  const [names, setNames] = useState<string[]>([
    "Pemain 1",
    "Pemain 2",
    "Pemain 3",
    "Pemain 4",
  ]);
  const [attendanceNumbers, setAttendanceNumbers] = useState<string[]>([
    "",
    "",
    "",
    "",
  ]);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [preparedPlayers, setPreparedPlayers] = useState<Player[] | null>(null);
  const [materials, setMaterials] = useState<
    Array<{ id: string; title: string; body: string }>
  >([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const loadExams = useCallback(async () => {
    setLoadingExams(true);
    setExamError("");
    try {
      const response = await fetch("/api/exams/active", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Daftar ujian gagal dimuat");
      const nextExams: AvailableExam[] = result.data || [];
      const available = nextExams.filter((exam) => exam.is_available);
      setExams(nextExams);
      setExamId((current) =>
        available.some((exam) => exam.id === current)
          ? current
          : available.length === 1
          ? available[0].id
          : ""
      );
      if (available.length === 1 && available[0].learning_goal)
        setGoal(available[0].learning_goal);
    } catch (loadError) {
      setExams([]);
      setExamError(
        loadError instanceof Error
          ? loadError.message
          : "Daftar ujian gagal dimuat"
      );
    } finally {
      setLoadingExams(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadExams(), 0);
    return () => window.clearTimeout(timer);
  }, [loadExams]);

  const handleExamChange = (value: string) => {
    setExamId(value);
    const selected = exams.find((exam) => exam.id === value);
    setGoal(selected?.learning_goal || "");
  };

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  };

  const handleAttendanceChange = (index: number, value: string) => {
    const nextNumbers = [...attendanceNumbers];
    nextNumbers[index] = value.replace(/\D/g, "").slice(0, 2);
    setAttendanceNumbers(nextNumbers);
  };

  const handleStart = async () => {
    const newPlayers: Player[] = Array.from({ length: playerCount }).map(
      (_, index) => ({
        studentCode: attendanceNumbers[index].trim(),
        name: names[index] || `Pemain ${index + 1}`,
        color: PLAYER_COLORS[index],
        score: 0,
        xp: 0,
        level: 1,
        avatar: (names[index] || `P${index + 1}`)[0].toUpperCase(),
        active: index === 0,
      })
    );

    const activeNumbers = attendanceNumbers
      .slice(0, playerCount)
      .map((number) => number.trim());
    if (activeNumbers.some((number) => !/^(0[1-9]|[1-9][0-9])$/.test(number))) {
      setError("Nomor absen wajib terdiri dari 2 angka, mulai 01 sampai 99.");
      return;
    }
    if (new Set(activeNumbers).size !== activeNumbers.length) {
      setError("Nomor absen harus berbeda dalam satu permainan.");
      return;
    }

    setError("");

    if (ENABLE_PREGAME_SUMMARY) {
      await loadPregameMaterials(newPlayers);
      return;
    }

    await createGame(newPlayers);
  };

  async function loadPregameMaterials(players: Player[]) {
    setLoadingMaterials(true);
    try {
      const response = await fetch("/api/learning-content", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Materi belum dapat dimuat");
      const nextMaterials = (
        result.data?.briefingMaterials ||
        result.data?.materials ||
        []
      ).map((item: { id: string; title: string; body: string }) => item);
      if (nextMaterials.length === 0)
        throw new Error("Materi pembelajaran belum dipublikasikan oleh admin.");
      setMaterials(nextMaterials);
      setPreparedPlayers(players);
    } catch (materialError) {
      setError(
        materialError instanceof Error
          ? materialError.message
          : "Materi belum dapat dimuat"
      );
    } finally {
      setLoadingMaterials(false);
    }
  }

  async function createGame(players: Player[]) {
    setIsStarting(true);
    setError("");

    try {
      const response = await fetch("/api/rooms/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players,
          goal,
          examId: examId || null,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Tidak dapat membuat room permainan");
      }

      window.localStorage.setItem(
        "ludo-kpk-session",
        JSON.stringify({
          roomCode: result.roomCode,
          roomId: result.roomId,
          sessionId: result.sessionId,
        })
      );
      await onStart({
        players: result.players,
        goal,
        roomCode: result.roomCode,
        roomId: result.roomId,
        sessionId: result.sessionId,
      });
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Koneksi database belum dapat digunakan"
      );
    } finally {
      setIsStarting(false);
    }
  }

  if (preparedPlayers) {
    return (
      <main className="pregame-container">
        <section className="pregame-card">
          <button
            className="pregame-back"
            type="button"
            onClick={() => setPreparedPlayers(null)}
            disabled={isStarting}
          >
            <ArrowLeft size={17} /> Kembali ke data pemain
          </button>
          <div className="pregame-heading">
            <span className="pregame-icon">
              <BookOpen />
            </span>
            <p className="eyebrow">PERSIAPAN SEBELUM BERMAIN</p>
            <h1>Ingat kembali materi KPK</h1>
            <p>
              Baca ringkasan berikut bersama-sama. Waktu permainan belum
              berjalan pada tahap ini.
            </p>
          </div>
          <div className="pregame-materials">
            {materials.length > 0
              ? materials.map((material, index) => (
                  <article className="pregame-material" key={material.id}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h2>{material.title}</h2>
                      <p>{material.body}</p>
                    </div>
                  </article>
                ))
              : null}
          </div>
          {error && (
            <p className="setup-error" role="alert">
              {error}
            </p>
          )}
          <div className="pregame-notice">
            <CalendarClock size={18} />
            <span>Timer baru dimulai setelah tombol di bawah ditekan.</span>
          </div>
          <button
            className="start-game-btn"
            type="button"
            onClick={() => {
              if (preparedPlayers) void createGame(preparedPlayers);
            }}
            disabled={isStarting}
          >
            {isStarting ? (
              "Menyiapkan permainan..."
            ) : (
              <>
                Saya Sudah Paham, Mulai Permainan <ArrowRight size={19} />
              </>
            )}
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <div className="setup-header-icon">
            <Dices />
          </div>
          <div>
            <p className="eyebrow">GAME LOKAL MATEMATIKA KELAS V</p>
            <h1>Petualangan Seru Melalui Ludo</h1>
            <p className="setup-subtitle">
              Isi data pemain, pelajari cara bermain, lalu mulai petualangan KPK
              bersama.
            </p>
          </div>
        </div>

        <div className="setup-content">
          <div className="setup-form">
            <div className="form-group">
              <div className="setup-exam-label">
                <label htmlFor="active-exam">Pilih Ujian</label>
                <button
                  type="button"
                  onClick={() => void loadExams()}
                  disabled={loadingExams}
                  aria-label="Muat ulang daftar ujian"
                >
                  <RefreshCw
                    size={14}
                    className={loadingExams ? "spinning" : ""}
                  />{" "}
                  Muat ulang
                </button>
              </div>
              <select
                id="active-exam"
                className="setup-input"
                value={examId}
                onChange={(event) => handleExamChange(event.target.value)}
                disabled={loadingExams}
              >
                <option value="">Permainan latihan (30 menit)</option>
                {exams.map((exam) => (
                  <option
                    key={exam.id}
                    value={exam.id}
                    disabled={!exam.is_available}
                  >
                    {exam.name} · {exam.duration_minutes} menit
                    {exam.is_available
                      ? " · tersedia"
                      : ` · mulai ${new Date(exam.starts_at).toLocaleString(
                          "id-ID",
                          { dateStyle: "short", timeStyle: "short" }
                        )}`}
                  </option>
                ))}
              </select>
              {loadingExams && <small>Memuat ujian dari database...</small>}
              {!loadingExams && examError && (
                <div className="setup-exam-message error">
                  <span>{examError}</span>
                  <button type="button" onClick={() => void loadExams()}>
                    Coba lagi
                  </button>
                </div>
              )}
              {!loadingExams && !examError && exams.length === 0 && (
                <small>Belum ada ujian yang aktif atau terjadwal.</small>
              )}
              {!loadingExams &&
                !examError &&
                exams.length > 0 &&
                exams.every((exam) => !exam.is_available) && (
                  <small>
                    Ada {exams.length} ujian terjadwal, tetapi belum memasuki
                    waktu mulai.
                  </small>
                )}
              {examId &&
                (() => {
                  const selected = exams.find((exam) => exam.id === examId);
                  return selected ? (
                    <div className="setup-exam-info">
                      <CalendarClock size={15} />
                      <span>
                        <strong>{selected.name}</strong>
                        <small>
                          Berakhir{" "}
                          {new Date(selected.ends_at).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {selected.question_time_seconds
                            ? ` · ${selected.question_time_seconds} detik/soal`
                            : ""}
                        </small>
                      </span>
                    </div>
                  ) : null;
                })()}
            </div>
            <div className="form-group">
              <label>Pilih Jumlah Pemain</label>
              <div className="player-count-buttons">
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    className={`count-btn ${
                      playerCount === num ? "active" : ""
                    }`}
                    onClick={() => setPlayerCount(num)}
                  >
                    {num} Pemain
                  </button>
                ))}
              </div>
            </div>

            <div className="names-grid">
              {Array.from({ length: playerCount }).map((_, i) => (
                <div className="form-group" key={i}>
                  <label>Nama Pemain {i + 1}</label>
                  <input
                    type="text"
                    value={names[i]}
                    onChange={(e) => handleNameChange(i, e.target.value)}
                    className="setup-input"
                  />
                  <label htmlFor={`attendance-number-${i}`}>
                    Nomor Absen {i + 1}
                  </label>
                  <input
                    id={`attendance-number-${i}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{2}"
                    value={attendanceNumbers[i]}
                    onChange={(event) =>
                      handleAttendanceChange(i, event.target.value)
                    }
                    className="setup-input"
                    placeholder="Contoh: 01"
                    minLength={2}
                    maxLength={2}
                    required
                  />
                </div>
              ))}
            </div>

            {error && (
              <p className="setup-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="start-game-btn"
              onClick={handleStart}
              disabled={isStarting || loadingMaterials}
            >
              {isStarting
                ? "Menyiapkan permainan..."
                : loadingMaterials
                  ? "Memuat ringkasan materi..."
                  : "Mulai Bermain"}
            </button>
          </div>

          <div className="setup-guide">
            <div className="guide-header">
              <BookOpen size={18} />
              <h3>Cara Bermain</h3>
            </div>
            <ol className="guide-list">
              <li>1.Kocok dan lempar dadumu.</li>
              <li>2.Jalankan bidak sesuai angka yang kamu dapatkan.</li>
              <li>
                3.Jawablah soal yang muncul (5 uraian dan 10 pilihan ganda).
                Setiap Jawabanmu menentukan hasil akhir.
              </li>
              <li>
                4.Bawa bidakmu menuju garis akhir (pusat kemenangan untuk
                memenangkan permainan).
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
