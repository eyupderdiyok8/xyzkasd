// ──────────────────────────────────────────────
// GET /api/survey/report
// Anket raporu — tüm puanlar listelenebilir
// Role: manager+
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { SurveyRepository } from '@/repositories/survey.repository';

export async function GET(request: NextRequest) {
  const auth = await requireRole('manager');
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Yetkisiz erişim' } }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const repo = new SurveyRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

    // Parse query filters
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const score = searchParams.get('score') ? Number(searchParams.get('score')!) : undefined;
    const respondedStr = searchParams.get('responded');
    const responded = respondedStr === 'true' ? true : respondedStr === 'false' ? false : undefined;

    const [surveys, stats] = await Promise.all([
      repo.findAll({ dateFrom, dateTo, score, responded }),
      repo.getStats({ dateFrom, dateTo }),
    ]);

    return NextResponse.json({ data: surveys, stats });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
