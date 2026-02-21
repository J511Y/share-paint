import { Metadata } from 'next';
import { DrawingCanvas } from './DrawingCanvas';

export const metadata: Metadata = {
  title: '그림 그리기 | PaintShare',
  description: '제한된 시간 내에 그림을 그려보세요!',
};

export default function DrawPage() {
  return <DrawingCanvas />;
}
