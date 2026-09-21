'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InviteResult } from '@/lib/types';
import { LuPlus } from 'react-icons/lu';

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
    <Card className="mx-auto max-w-narrow">
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
            <code className="flex-1 break-all rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1 text-sm text-[var(--color-ink)]">
              {invite.url}
            </code>
            <Button size="sm" variant="neutral" onClick={() => void copy(invite.url, 'url')}>
              {copied === 'url' ? t('copied') : t('copyUrl')}
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">{t('codeLabel')}</p>
          <div className="flex items-center gap-2">
            <code className="rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2 font-mono text-2xl text-[var(--color-ink)]">
              {invite.code}
            </code>
            <Button size="sm" variant="neutral" onClick={() => void copy(invite.code, 'code')}>
              {copied === 'code' ? t('copied') : t('copyCode')}
            </Button>
          </div>
          <p className="mt-2 text-sm text-[var(--color-bad)]">{t('codeWarning')}</p>
        </div>

        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('expiresAt', { time: new Date(invite.expiresAt).toLocaleString() })}
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="secondary" onClick={onCreateAnother} icon={LuPlus}>
            {t('createAnother')}
          </Button>
          <Link href={`/${locale}/admin/employees`}>
            <Button variant="primary">{t('backToList')}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}