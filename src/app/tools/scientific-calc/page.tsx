import React from 'react';
import { ScientificCalculator } from '@/components/tools/ScientificCalculator';
import { Page, PageHeader } from '@/components/ui/Layout';

export const metadata = {
  title: 'Scientific calculator',
  description: 'Trigonometry, logarithms, roots and powers in degrees or radians.',
};

export default function ScientificCalcPage() {
  return (
    <Page className="max-w-3xl">
      <PageHeader
        eyebrow="Study tools"
        title="Scientific calculator"
        description="Type with the buttons, then press equals. Switch between degrees and radians for trigonometric functions."
        breadcrumbs={[{ label: 'Study tools', href: '/tools' }, { label: 'Scientific calculator' }]}
      />
      <ScientificCalculator />
    </Page>
  );
}
