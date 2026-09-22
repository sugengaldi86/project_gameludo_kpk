import { StudentDetail } from '@/components/admin/student-detail'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StudentDetail studentId={id} />
}
