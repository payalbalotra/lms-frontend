'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InviteResult } from '@/lib/types';

interface InviteResultProps {
  locale: string;
  invite: InviteResult;
  employeeName: string;
  onCreateAnother: () => void;
}

export function InviteResultCard({ locale, invite, employeeName, onCreateAnother }: InviteResultProps): React.ReactElement {
  const t = useTranslations('admin');
  const [copied, setCopied] = useState<'url' | 'code' | null>(null);

  async function copy(text: string, kind: 'url' | 'code'): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(kind);
        setTimeout(() => setCopied(null), 2000);
      }
    } catch {
      // ignore
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{t('inviteCreatedHeading')}</CardTitle>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {employeeName}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-medium">{t('inviteUrlLabel')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-1 text-xs">
              {invite.url}
            </code>
            <Button size="sm" variant="outline" onClick={() => void copy(invite.url, 'url')}>
              {copied === 'url' ? t('copied') : t('copyUrl')}
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">{t('codeLabel')}</p>
          <div className="flex items-center gap-2">
            <code className="rounded border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2 font-mono text-2xl tracking-widest">
              {invite.code}
            </code>
            <Button size="sm" variant="outline" onClick={() => void copy(invite.code, 'code')}>
              {copied === 'code' ? t('copied') : t('copyCode')}
            </Button>
          </div>
          <p className="mt-2 text-xs text-red-600">{t('codeWarning')}</p>
        </div>

        <p className="text-xs text-[var(--color-muted-foreground)]">
          {t('expiresAt', { time: new Date(invite.expiresAt).toLocaleString() })}
        </p>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onCreateAnother}>
            {t('createAnother')}
          </Button>
          <Link href={`/${locale}/admin/employees`}>
            <Button variant="default">{t('backToList')}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}