import React from 'react';
import Link from 'next/link';
import { GpaCalculator } from '@/components/tools/GpaCalculator';
import { buttonClass } from '@/components/ui/Button';
import { Page, PageHeader } from '@/components/ui/Layout';

export const metadata = {
  title: 'SGPA calculator',
  description: 'Estimate a semester grade point average from course credits and letter grades.',
};

export default function GpaPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Study tools"
        title="SGPA calculator"
        description="Add your courses with their credits and expected grades to estimate the semester's grade point average."
        breadcrumbs={[{ label: 'Study tools', href: '/tools' }, { label: 'SGPA' }]}
        actions={
          <Link href="/tools/cgpa" className={buttonClass('outline', 'sm')}>
            Go to CGPA
          </Link>
        }
      />
      <GpaCalculator />
    </Page>
  );
}
