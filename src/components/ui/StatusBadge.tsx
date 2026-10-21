import { Badge } from './Badge';
import { PUBLICATION_STATUS_INFO, VERIFICATION_STATUS_INFO } from '@/lib/resources/constants';
import type { PublicationStatus, VerificationStatus } from '@/lib/resources/types';

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const info = VERIFICATION_STATUS_INFO[status];
  return (
    <Badge variant={info?.variant ?? 'neutral'} size="sm">
      {info?.label ?? status}
    </Badge>
  );
}

export function PublicationBadge({ status }: { status: PublicationStatus }) {
  const info = PUBLICATION_STATUS_INFO[status];
  return (
    <Badge variant={info?.variant ?? 'neutral'} size="sm">
      {info?.label ?? status}
    </Badge>
  );
}
