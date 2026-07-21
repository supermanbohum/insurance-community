import type { CompletenessResult } from '@/lib/admin/completeness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export function BranchCompletenessCard({ result }: { result: CompletenessResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>GA 프로필 완성도</span>
          <span className="tabular-nums text-primary">{result.percent}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress value={result.percent} />
        <p className="text-xs text-muted-foreground">
          {result.totalCount}개 항목 중 {result.filledCount}개 완료
        </p>
        {result.missingLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {result.missingLabels.map((label) => (
              <Badge key={label} variant="outline" className="text-muted-foreground">
                {label} 없음
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
