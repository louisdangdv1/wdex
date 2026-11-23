import { ex } from '../engine/exchange';

export default function Toasts() {
  return (
    <div className="toasts">
      {ex.toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>
      ))}
    </div>
  );
}
