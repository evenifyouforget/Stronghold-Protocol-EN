// Planned maintenance bar: `sys.maintenance { at, closed, serverNow }` (server/maintenance.js, set by the operator with
// scripts/maintenance.mjs) shows a bar at the top of every screen — a live countdown to the maintenance time on the
// server's clock (store.js serverNow, corrected from the ping samples) and, while the server is closed to new matches,
// that no new simulation can start. `at` null and `closed` false clears it.

import { useEffect, useState } from '../../vendor/hooks.module.js';
import { html, Icon } from './components.js';
import { store, useStore, serverNow } from '../store.js';
import { t } from '../../../shared/i18n.js';

/** Store the latest sys.maintenance (null when cleared). */
export function applyMaintenance(msg) {
  const at = Number.isFinite(msg?.at) ? msg.at : null;
  const closed = msg?.closed === true;
  store.set({ maintenance: at != null || closed ? { at, closed } : null });
}

/** "1:05:09" / "9:42" / "0:07" for a remaining time in ms (rounded up to the second). */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * The bar's text for a state at server time `now`.
 * @param {{ at: number | null, closed: boolean } | null} m
 * @param {number} now
 * @returns {string | null}
 */
export function maintenanceText(m, now) {
  if (!m) return null;
  const parts = [];
  if (m.at != null) {
    parts.push(m.at > now ? t('服务器将在 {time} 后维护', { time: formatCountdown(m.at - now) }) : t('服务器维护即将开始'));
  } else {
    parts.push(t('服务器即将维护'));
  }
  if (m.closed) parts.push(t('暂不开始新的模拟'));
  return parts.join(' · ');
}

/** Mount once near the root (main.js App). */
export function MaintenanceBar() {
  const m = useStore((s) => s.maintenance);
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!m?.at) return undefined;
    setNow(serverNow());
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(id);
  }, [m?.at]);
  const text = maintenanceText(m, now);
  // the bar takes the top edge where toasts start: css/components.css moves them below it while it shows
  useEffect(() => {
    const root = globalThis.document?.documentElement;
    root?.classList.toggle('has-maint-bar', !!text);
    return () => root?.classList.remove('has-maint-bar');
  }, [!!text]);
  if (!text) return null;
  return html`<div class="maint-bar" role="status"><${Icon} name="warn" /><span class="num">${text}</span></div>`;
}
