'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/components/ui';
import { shrinkPhoto } from './forms';

type Turn = { role: 'user' | 'assistant'; content: string; photo?: string; filled?: string[] };

const TEXT = {
  es: {
    title: 'Asistente de productos',
    intro: 'Cuéntame el producto como se lo contarías a un compañero, o envíame una foto de la etiqueta. Yo lleno el formulario y tú lo revisas.',
    hello: '¡Hola! ¿Qué producto vamos a cargar? Dime lo que sepas: nombre, marca, número de pieza, precio, cuántas unidades tienes…',
    placeholder: 'Escribe aquí lo que sabes del producto…',
    send: 'Enviar',
    photo: 'Foto de la etiqueta',
    thinking: 'Pensando…',
    filled: 'Llené:',
    undo: 'Deshacer lo último',
    photoSent: 'Foto enviada',
    photoBad: 'No pude leer esa foto. Usa una imagen JPG, PNG o WebP.',
    note: 'No inventa datos: precios, medidas y compatibilidad salen de lo que tú le dices o de tu foto. Nada se guarda hasta que presiones Guardar producto. Lo que escribes y tus fotos se envían a Anthropic, el proveedor de la IA.',
    off: 'El asistente aún no está conectado. Falta configurar su clave en Vercel.',
    busy: 'Hay muchas solicitudes ahora. Espera un minuto e inténtalo de nuevo.',
    declined: 'No pude responder a eso. Prueba a decirlo de otra forma.',
    failed: 'Algo falló y no pude responder. Inténtalo de nuevo; lo que llevas en el formulario sigue ahí.',
  },
  en: {
    title: 'Product assistant',
    intro: 'Tell me about the product as you would tell a coworker, or send me a photo of the label. I fill in the form and you review it.',
    hello: 'Hello! Which product are we adding? Tell me what you know: name, brand, part number, price, how many units you have…',
    placeholder: 'Write what you know about the product…',
    send: 'Send',
    photo: 'Photo of the label',
    thinking: 'Thinking…',
    filled: 'Filled in:',
    undo: 'Undo the last change',
    photoSent: 'Photo sent',
    photoBad: 'I could not read that photo. Use a JPG, PNG or WebP image.',
    note: 'It does not make up data: prices, measurements and fitment come from what you tell it or from your photo. Nothing is saved until you press Save product. What you write and your photos are sent to Anthropic, the AI provider.',
    off: 'The assistant is not connected yet. Its key still has to be set in Vercel.',
    busy: 'There are many requests right now. Wait a minute and try again.',
    declined: 'I could not answer that. Try saying it another way.',
    failed: 'Something failed and I could not answer. Try again; what you have in the form is still there.',
  },
};

const LABELS: Record<string, [string, string]> = {
  name: ['nombre en inglés', 'name in English'], nameEs: ['nombre en español', 'name in Spanish'], sku: ['número de pieza', 'part number'], brand: ['marca', 'brand'], cat: ['categoría', 'category'],
  desc: ['descripción en inglés', 'description in English'], descEs: ['descripción en español', 'description in Spanish'], price: ['precio', 'price'], stockQty: ['stock', 'stock'], tireSize: ['medida', 'tire size'], tags: ['etiquetas', 'tags'],
  equipmentMake: ['marca del equipo', 'equipment make'], equipmentModel: ['modelo del equipo', 'equipment model'], fitment: ['máquinas compatibles', 'machines it fits'], shippingClass: ['tipo de envío', 'shipping type'],
  weightLb: ['peso', 'weight'], lengthIn: ['largo', 'length'], widthIn: ['ancho', 'width'], heightIn: ['alto', 'height'],
};

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export function ProductAssistant({ formId }: { formId: string }) {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const t = TEXT[lang];
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [undo, setUndo] = useState<Record<string, string> | null>(null);
  const chat = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { setLang(document.documentElement.dataset.adminLang === 'en' ? 'en' : 'es'); }, []);
  // Only the chat scrolls, so the form stays where the person left it.
  useEffect(() => { if (chat.current) chat.current.scrollTop = chat.current.scrollHeight; }, [turns, busy]);

  const form = () => document.getElementById(formId) as HTMLFormElement | null;
  const field = (name: string) => form()?.elements.namedItem(name) as Field | null;

  const apply = (fields: Record<string, string>) => {
    const before: Record<string, string> = {};
    const filled: string[] = [];
    for (const [name, value] of Object.entries(fields)) {
      const el = field(name);
      if (!el) continue;
      before[name] = el.value;
      el.value = value;
      // A select keeps its old value when the new one is not among its options.
      if (el.value !== value) { el.value = before[name]; delete before[name]; continue; }
      el.classList.add('ai-filled');
      filled.push(LABELS[name]?.[lang === 'es' ? 0 : 1] ?? name);
    }
    if (filled.length) setUndo(before);
    return filled;
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const content = text.trim() || (photo ? t.photoSent : '');
    if (!content || busy) return;
    setError('');
    let image: string | undefined;
    if (photo) {
      try {
        image = await toBase64(await shrinkPhoto(photo));
      } catch {
        setError(t.photoBad);
        return;
      }
    }
    const next: Turn[] = [...turns, { role: 'user', content, photo: photo?.name }];
    setTurns(next);
    setText('');
    setPhoto(null);
    if (fileInput.current) fileInput.current.value = '';
    setBusy(true);
    const data = form() ? new FormData(form()!) : new FormData();
    const draft: Record<string, string> = {};
    for (const key of Object.keys(LABELS)) {
      const value = data.get(key);
      if (typeof value === 'string' && value) draft[key] = value;
    }
    try {
      const res = await fetch('/api/admin/product-assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ turns: next.map(({ role, content: c }) => ({ role, content: c })), draft, lang, image }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error === 'off' ? t.off : body.error === 'busy' ? t.busy : body.error === 'declined' ? t.declined : body.error === 'bad_image' ? t.photoBad : t.failed);
        return;
      }
      const filled = apply(body.fields ?? {});
      setTurns([...next, { role: 'assistant', content: body.reply, filled }]);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-card ai-panel" data-raw aria-label={t.title}>
      <h2><Icon name="spark" size="sm" /> {t.title}</h2>
      <p className="mini muted">{t.intro}</p>
      <div className="ai-chat" ref={chat} aria-live="polite">
        <p className="ai-msg ai-assistant">{t.hello}</p>
        {turns.map((turn, i) => (
          <div key={i} className={`ai-msg ai-${turn.role}`}>
            {turn.content}
            {turn.photo ? <small> · {turn.photo}</small> : null}
            {turn.filled?.length ? <small className="ai-filled-list">{t.filled} {turn.filled.join(', ')}</small> : null}
          </div>
        ))}
        {busy ? <p className="ai-msg ai-assistant muted">{t.thinking}</p> : null}
      </div>
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      {/* Not a nested form: the panel sits outside the product form. */}
      <form onSubmit={send}>
        <textarea
          className="textarea"
          rows={3}
          value={text}
          maxLength={5000}
          aria-label={t.placeholder}
          placeholder={t.placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
        />
        <div className="ai-actions">
          <label className="btn btn-light"><Icon name="camera" size="sm" /> {photo ? photo.name : t.photo}<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
          {undo ? <button type="button" className="btn btn-light" onClick={() => { for (const [name, value] of Object.entries(undo)) { const el = field(name); if (el) { el.value = value; el.classList.remove('ai-filled'); } } setUndo(null); }}>{t.undo}</button> : null}
          <button className="btn" disabled={busy || (!text.trim() && !photo)}>{t.send}</button>
        </div>
      </form>
      <p className="mini muted">{t.note}</p>
    </section>
  );
}
