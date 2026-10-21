import React from 'react';
import Link from 'next/link';
import { CgpaCalculator } from '@/components/tools/CgpaCalculator';
import { buttonClass } from '@/components/ui/Button';
import { Page, PageHeader } from '@/components/ui/Layout';

export const metadata = {
  title: 'CGPA calculator',
  description: 'Combine semester SGPAs, weighted by credits, into a cumulative GPA.',
};

export default function CgpaPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Study tools"
        title="CGPA calculator"
        description="Enter each completed semester's SGPA and credits to find your cumulative grade point average."
        breadcrumbs={[{ label: 'Study tools', href: '/tools' }, { label: 'CGPA' }]}
        actions={
          <Link href="/tools/gpa" className={buttonClass('outline', 'sm')}>
            Go to SGPA
          </Link>
        }
      />
      <CgpaCalculator />
    </Page>
  );
}
