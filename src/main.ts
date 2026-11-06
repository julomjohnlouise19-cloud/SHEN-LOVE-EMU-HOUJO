import './styles/main.css';
import { initStore, subscribe, getState, currentUser, exportBackup } from './store';
import { h, toast, button, download, modal } from './ui/dom';
import { shell, empty } from './ui/shell';
import { dashboard } from './ui/dashboard';
import { branchPage, islandPage, startDeck } from './ui/learn';
import { playPage } from './ui/play';
import { shopPage } from './ui/shop';
import { reviewPage, notebookPage, spinPage, questsPage, leaderboardPage, labPage } from './ui/extras';
import { adminPage } from './ui/admin';
import { authModal } from './ui/auth';
import { connectRenderer, go } from './ui/actions';
const app = document.querySelector<HTMLDivElement>('#app')!;
app.append(h('div', { class: 'loading-screen' }, h('span', { class: 'loading-flower' }, '✳'), h('h1', null, 'Getting your little lab ready…'), h('p', null, 'A little wonder is on its way.')));
let renderId = 0, scheduled = false;
async function render() {
  const id = ++renderId;
  const path = location.hash.slice(1).split('?')[0] || '/';
  let page: HTMLElement;
  try {
    if (!currentUser()) { page = empty('cat', 'Your little lab is waiting.', 'Sign in, join the lab, or keep exploring as a guest.', button('Sign in or join', () => authModal(), 'button primary')); }
    else if (path === '/') page = dashboard();
    else if (path === '/island') page = islandPage();
    else if (path.startsWith('/branch/')) page = branchPage(path.split('/')[2]);
    else if (path.startsWith('/play/')) page = await playPage(path.split('/')[2]);
    else if (path === '/review') page = await reviewPage();
    else if (path === '/notebook') page = await notebookPage();
    else if (path === '/shop') page = shopPage();
    else if (path === '/spin') page = spinPage();
    else if (path === '/quests') page = questsPage();
    else if (path === '/leaderboard') page = leaderboardPage();
    else if (path === '/experiment') page = labPage();
    else if (path === '/admin' || path === '/undo') page = await adminPage();
    else if (path.startsWith('/challenge/')) {
      const params = new URLSearchParams(location.hash.split('?')[1]), deck = path.split('/')[2], level = params.get('level') ?? 'medium', seed = Number(params.get('seed'));
      if (!['easy', 'medium', 'hard'].includes(level) || !Number.isSafeInteger(seed)) throw new Error('That challenge link is not valid.');
      page = empty('cat', 'A little challenge from a friend.', `${deck} · ${level}. Same science, same shuffle. Your usual daily cap applies.`, button('Accept this little challenge', async () => { try { await startDeck(deck, level as 'easy' | 'medium' | 'hard', 'practice', seed); } catch (e) { toast(e instanceof Error ? e.message : 'Please try again.'); } }, 'button primary'));
    } else page = empty('cat', 'A little detour.', 'That page isn’t on our science island. Let’s find your next discovery.', button('Back to my lab', () => go('/'), 'button primary'));
  } catch (e) { page = empty('cat', 'Let’s try that discovery again.', e instanceof Error ? e.message : 'A saved card could not be loaded. Your progress is safe.', button('Back to my lab', () => go('/'), 'button primary')); }
  if (id !== renderId) return;
  app.replaceChildren(shell(page, path));
  document.title = `${path === '/' ? 'My little lab' : path.startsWith('/play') ? 'A little discovery' : path === '/admin' ? 'SSC mission control' : path.split('/').pop()?.replaceAll('-', ' ')} · Cozy Science Lab`;
}
function schedule() { if (scheduled) return; scheduled = true; setTimeout(() => { scheduled = false; void render(); }, 0); }
connectRenderer(schedule);
window.addEventListener('hashchange', () => { window.scrollTo({ top: 0 }); schedule(); });
window.addEventListener('csl:quota', () => toast('Your little lab is out of storage. Export a backup before clearing old browser data.', { text: 'Export backup', run: () => download('cozy-science-backup.json', exportBackup()) }));
window.addEventListener('csl:recovery', e => toast(String((e as CustomEvent).detail), { text: 'Export backup', run: () => download('cozy-science-backup.json', exportBackup()) }));
window.addEventListener('offline', () => toast('You’re offline. Your saved lab and visited decks are still here.'));
window.addEventListener('online', () => toast('Back online. A whole island of science is ready.'));
try {
  await initStore(); subscribe(schedule); await render();
  if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => toast('Offline caching isn’t available in this browser. You can still use the lab online.'));
  // A route-independent reminder makes an interrupted eight-card session easy to resume.
  const run = getState().runs.find(r => r.userId === currentUser()?.id && !r.completed);
  if (run && !location.hash.includes('/play/')) toast('Your last little discovery is saved.', { text: 'Keep exploring', run: () => go(`/play/${run.id}`) });
} catch (e) {
  app.replaceChildren(h('div', { class: 'loading-screen' }, h('h1', null, 'Your lab needs a little space.'), h('p', null, e instanceof Error ? e.message : 'Browser storage could not be opened.'), button('Storage help', () => modal('Make a little room for science', [h('p', null, 'This local demo needs browser storage and Web Crypto. Allow site data and use an up-to-date browser on localhost or HTTPS. Reload after changing your browser settings.')]), 'button primary')));
}
