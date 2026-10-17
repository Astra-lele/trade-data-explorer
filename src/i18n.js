import strings from './strings-en.js?v=partners-en-20261016';

export const language='en';
export function setLanguage(){document.documentElement.lang='en';}
export const t=key=>strings[key]??key;
export const label=obj=>obj.name||'';
export const regionLabel=region=>region;
export const unitLabel=unit=>unit;
export function num(value,precision=2){
  if(value===null||value===undefined||!Number.isFinite(value))return '—';
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:precision}).format(value);
}
export function compact(value){
  if(value===null||!Number.isFinite(value))return '—';
  const n=Math.abs(value);
  return n>=1e9?num(value/1e9,1)+'bn':n>=1e6?num(value/1e6,1)+'m':n>=1e3?num(value/1e3,1)+'k':num(value,1);
}
