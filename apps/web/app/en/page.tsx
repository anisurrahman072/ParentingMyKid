import type { Metadata } from 'next';

import { Landing } from '../components/Landing';
import { enContent } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Parenting My Kid — For every parent',
  description:
    'Practical, warm guidance on health, learning, emotions, play, and raising confident kids.',
};

export default function EnglishPage(): React.ReactElement {
  return <Landing content={enContent} />;
}
