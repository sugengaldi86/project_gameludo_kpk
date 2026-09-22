import type { RoomFilter, StudentReport } from '@/lib/admin-types'

type ReportSummary = {
  students: number
  answers: number
  averageAccuracy: number
  belowTarget: number
}

type ExportOptions = {
  reports: StudentReport[]
  summary: ReportSummary
  rooms: RoomFilter[]
  roomId: string
  from: string
  to: string
}

type ZipEntry = { name: string; data: Uint8Array }

const encoder = new TextEncoder()

function escapeXml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function write16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

function write32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

function createZip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let localOffset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const checksum = crc32(entry.data)
    const local = new Uint8Array(30 + name.length + entry.data.length)
    write32(local, 0, 0x04034b50)
    write16(local, 4, 20)
    write16(local, 6, 0x0800)
    write16(local, 8, 0)
    write32(local, 14, checksum)
    write32(local, 18, entry.data.length)
    write32(local, 22, entry.data.length)
    write16(local, 26, name.length)
    local.set(name, 30)
    local.set(entry.data, 30 + name.length)
    localParts.push(local)

    const central = new Uint8Array(46 + name.length)
    write32(central, 0, 0x02014b50)
    write16(central, 4, 20)
    write16(central, 6, 20)
    write16(central, 8, 0x0800)
    write16(central, 10, 0)
    write32(central, 16, checksum)
    write32(central, 20, entry.data.length)
    write32(central, 24, entry.data.length)
    write16(central, 28, name.length)
    write32(central, 42, localOffset)
    central.set(name, 46)
    centralParts.push(central)
    localOffset += local.length
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0)
  const end = new Uint8Array(22)
  write32(end, 0, 0x06054b50)
  write16(end, 8, entries.length)
  write16(end, 10, entries.length)
  write32(end, 12, centralSize)
  write32(end, 16, localOffset)

  const parts = [...localParts, ...centralParts, end]
  const archive = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    archive.set(part, offset)
    offset += part.length
  }

  return new Blob([archive.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function textCell(reference: string, value: string, style = 0) {
  return `<c r="${reference}" t="inlineStr" s="${style}"><is><t>${escapeXml(value)}</t></is></c>`
}

function numberCell(reference: string, value: number, style = 0) {
  return `<c r="${reference}" s="${style}"><v>${Number.isFinite(value) ? value : 0}</v></c>`
}

function row(number: number, cells: string[], height?: number) {
  return `<row r="${number}"${height ? ` ht="${height}" customHeight="1"` : ''}>${cells.join('')}</row>`
}

function formatDate(value: string) {
  if (!value) return 'Semua tanggal'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
}

export function exportStudentReportsToExcel({ reports, summary, rooms, roomId, from, to }: ExportOptions) {
  const roomLabel = rooms.find((item) => item.id === roomId)?.room_code || 'Semua room'
  const periodLabel = from || to
    ? `${from ? formatDate(from) : 'Awal'} – ${to ? formatDate(to) : 'Sekarang'}`
    : 'Semua tanggal'
  const generatedAt = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  const headers = ['No.', 'Nama Murid', 'Sesi', 'Soal', 'Benar', 'Belum Tepat', 'Akurasi', 'Pretest', 'Informasi', 'Strategi', 'Hitung KPK', 'Cek Ulang', 'Status']
  const sheetRows = [
    row(1, [textCell('A1', 'REKAP NILAI SISWA — LUDO KPK', 1)], 28),
    row(2, [textCell('A2', `Room: ${roomLabel}  |  Periode: ${periodLabel}`, 2)]),
    row(3, [textCell('A3', `Dibuat pada ${generatedAt}`, 3)]),
    row(5, [
      textCell('A5', 'Jumlah murid', 4),
      textCell('D5', 'Jawaban terkumpul', 4),
      textCell('G5', 'Rata-rata akurasi', 4),
      textCell('J5', 'Perlu latihan', 4),
    ]),
    row(6, [
      numberCell('A6', summary.students, 5),
      numberCell('D6', summary.answers, 5),
      numberCell('G6', summary.averageAccuracy / 100, 6),
      numberCell('J6', summary.belowTarget, summary.belowTarget ? 7 : 5),
    ], 24),
    row(7, [textCell('A7', 'Target ketuntasan minimal 75%. Status dihitung dari akurasi keseluruhan siswa.', 3)]),
    row(9, headers.map((header, index) => textCell(`${String.fromCharCode(65 + index)}9`, header, 8)), 26),
    ...reports.map((report, index) => {
      const rowNumber = index + 10
      const percentageStyle = report.accuracy >= 75 ? 11 : 12
      const status = report.questionCount === 0 ? 'Belum ada jawaban' : report.accuracy >= 75 ? 'Tercapai' : 'Perlu latihan'
      const statusStyle = report.questionCount === 0 ? 4 : report.accuracy >= 75 ? 13 : 14
      return row(rowNumber, [
        numberCell(`A${rowNumber}`, index + 1, 10),
        textCell(`B${rowNumber}`, report.name, 9),
        numberCell(`C${rowNumber}`, report.sessionCount, 10),
        numberCell(`D${rowNumber}`, report.questionCount, 10),
        numberCell(`E${rowNumber}`, report.correctCount, 10),
        numberCell(`F${rowNumber}`, report.incorrectCount, 10),
        numberCell(`G${rowNumber}`, report.accuracy / 100, percentageStyle),
        numberCell(`H${rowNumber}`, report.pretestScore / 100, report.pretestScore >= 75 ? 11 : 12),
        numberCell(`I${rowNumber}`, report.informationAccuracy / 100, report.informationAccuracy >= 75 ? 11 : 12),
        numberCell(`J${rowNumber}`, report.strategyAccuracy / 100, report.strategyAccuracy >= 75 ? 11 : 12),
        numberCell(`K${rowNumber}`, report.kpkAccuracy / 100, report.kpkAccuracy >= 75 ? 11 : 12),
        numberCell(`L${rowNumber}`, report.verificationAccuracy / 100, report.verificationAccuracy >= 75 ? 11 : 12),
        textCell(`M${rowNumber}`, status, statusStyle),
      ], 21)
    }),
  ]

  const lastRow = Math.max(9, reports.length + 9)
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><tabColor rgb="FF2856C6"/><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:M${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="9" topLeftCell="A10" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="7" customWidth="1"/><col min="2" max="2" width="27" customWidth="1"/>
    <col min="3" max="6" width="13" customWidth="1"/><col min="7" max="12" width="14" customWidth="1"/>
    <col min="13" max="13" width="19" customWidth="1"/>
  </cols>
  <sheetData>${sheetRows.join('')}</sheetData>
  <autoFilter ref="A9:M${lastRow}"/>
  <mergeCells count="12"><mergeCell ref="A1:M1"/><mergeCell ref="A2:M2"/><mergeCell ref="A3:M3"/><mergeCell ref="A5:C5"/><mergeCell ref="D5:F5"/><mergeCell ref="G5:I5"/><mergeCell ref="J5:M5"/><mergeCell ref="A6:C6"/><mergeCell ref="D6:F6"/><mergeCell ref="G6:I6"/><mergeCell ref="J6:M6"/><mergeCell ref="A7:M7"/></mergeCells>
  <printOptions horizontalCentered="1"/>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>
</worksheet>`

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="0%"/></numFmts>
  <fonts count="5">
    <font><sz val="11"/><name val="Aptos"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>
    <font><b/><sz val="11"/><color rgb="FF172033"/><name val="Aptos"/></font>
    <font><b/><sz val="14"/><color rgb="FF172033"/><name val="Aptos Display"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2856C6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF2F4F7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEDF2FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF4E5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF1F2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF3"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2"><border/><border><left style="thin"><color rgb="FFE4E7EC"/></left><right style="thin"><color rgb="FFE4E7EC"/></right><top style="thin"><color rgb="FFE4E7EC"/></top><bottom style="thin"><color rgb="FFE4E7EC"/></bottom></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="15">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="164" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="7" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`) },
    { name: '_rels/.rels', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: 'xl/workbook.xml', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Rekap Nilai" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(worksheet) },
    { name: 'xl/styles.xml', data: encoder.encode(styles) },
  ]

  const blob = createZip(entries)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `rekap-nilai-ludo-kpk-${new Date().toISOString().slice(0, 10)}.xlsx`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
