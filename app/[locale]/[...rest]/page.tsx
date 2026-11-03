import { notFound } from 'next/navigation';

// Any unknown address gets the store's own 404 page, in the right language.
export default function CatchAll() {
  notFound();
}
