import type { Metadata } from 'next';

import { Landing } from '../components/Landing';
import { bnContent } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Parenting My Kid — বাবা-মাদের জন্য',
  description:
    'শিশুর স্বাস্থ্য, শিক্ষা, মানসিক স্থিতিশীলতা, আবেগ, খেলা—একসাথে একটি উষ্ণ, বোধগম্য পথ।',
};

export default function BanglaPage(): React.ReactElement {
  return <Landing content={bnContent} />;
}
