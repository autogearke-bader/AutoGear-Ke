import { lazy, Suspense } from 'react';
import { TechnicianMapProps } from './TechnicianMap';

const TechnicianMap = lazy(() => import('./TechnicianMap'));

export default function LazyMap(props: TechnicianMapProps) {
  return (
    <Suspense fallback={<div style={{ height: '300px', background: '#f0f0f0' }}>Loading map...</div>}>
      <TechnicianMap {...props} />
    </Suspense>
  );
}