'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { deleteBranchContactAction, upsertBranchContactAction } from '@/lib/actions/branch-admin';
import type { BranchContactRow } from '@/lib/admin/branch';
import type { KnownBranchContactType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const CONTACT_TYPE_OPTIONS: { value: KnownBranchContactType | 'custom'; label: string }[] = [
  { value: 'phone', label: '전화' },
  { value: 'phone_recruit', label: '채용문의 전화' },
  { value: 'kakao', label: '카카오톡' },
  { value: 'homepage', label: '홈페이지' },
  { value: 'instagram', label: '인스타그램' },
  { value: 'youtube', label: '유튜브' },
  { value: 'blog', label: '블로그' },
  { value: 'custom', label: '직접 입력' },
];

const CONTACT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CONTACT_TYPE_OPTIONS.filter((o) => o.value !== 'custom').map((o) => [o.value, o.label])
);

export function BranchContactsTab({ branchId, contacts }: { branchId: string; contacts: BranchContactRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<string>('phone');
  const [customType, setCustomType] = useState('');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const finalType = type === 'custom' ? customType.trim() : type;
    startTransition(async () => {
      const result = await upsertBranchContactAction({
        contactId: null,
        branchId,
        type: finalType,
        value,
        label,
        sortOrder: contacts.length,
      });
      if (result.success) {
        toast.success('연락처를 추가했습니다.');
        setValue('');
        setLabel('');
        setCustomType('');
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(contactId: string) {
    startTransition(async () => {
      const result = await deleteBranchContactAction(contactId, branchId);
      if (result.success) toast.success('삭제되었습니다.');
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-2 p-0">
          {contacts.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">등록된 연락처가 없습니다.</p>
          ) : (
            contacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 border-b p-3 last:border-0">
                <span className="w-28 shrink-0 text-sm font-medium">
                  {contact.label || CONTACT_TYPE_LABEL[contact.type] || contact.type}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{contact.value}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => handleDelete(contact.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>채널 종류</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {type === 'custom' && (
                <div className="flex flex-col gap-1.5">
                  <Label>직접 입력 (예: naver_blog)</Label>
                  <Input value={customType} onChange={(e) => setCustomType(e.target.value)} required />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>값 (전화번호/URL)</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>표시 라벨 (선택)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 대표전화" />
            </div>
            <Button type="submit" disabled={isPending} className="self-start">
              {isPending ? '추가 중...' : '연락처 추가'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
