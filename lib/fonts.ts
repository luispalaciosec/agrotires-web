import { DM_Sans, Manrope } from 'next/font/google';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', weight: ['400', '500', '600', '700'], display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', weight: ['400', '500', '600', '700', '800'], display: 'swap' });

export const fontClasses = `${dmSans.variable} ${manrope.variable}`;
