import { currentUser, login, register, dispatch, logout, guestSession, exportBackup } from '../store';
import { button, field, h, input, modal, toast, download } from './dom';
import { mascot, icon } from './svg';
import { act, go, refresh } from './actions';
export function authModal(registerFirst = false) {
  let joining = registerFirst;
  const { dialog, close } = modal('A little space for your curiosity', []);
  const body = h('div'); dialog.append(body);
  function render() {
    const username = input('username', 'Your scientist name'), password = input('password', 'At least 8 characters', '', 'password');
    username.autocomplete = 'username'; password.autocomplete = joining ? 'new-password' : 'current-password';
    const name = input('name', 'What should we call you?'), section = input('section', 'e.g. SSC – Curiosity'); section.required = false;
    const grade = h('select', { name: 'grade', 'aria-label': 'Grade' }, ...[7, 8, 9, 10].map(g => h('option', { value: g }, `Grade ${g}`)));
    const error = h('p', { class: 'form-error', role: 'alert' });
    const submit = button(joining ? 'Make my little lab' : 'Welcome back', () => undefined, 'button primary full', { type: 'submit' });
    const form = h('form', { onSubmit: async (e: SubmitEvent) => { e.preventDefault(); submit.disabled = true; error.textContent = ''; try { if (joining) await register({ username: username.value, password: password.value, name: name.value, grade: Number(grade.value), section: section.value }); else await login(username.value, password.value); close(); go(currentUser()?.role === 'admin' ? '/admin' : '/'); toast(joining ? 'Welcome to your little science lab! 24 starter merits are yours.' : 'Welcome back, scientist.'); refresh(); } catch (e) { error.textContent = e instanceof Error ? e.message : 'Please try again.'; } finally { submit.disabled = false; } } },
      joining ? field('Your name', name) : null, field('Username', username), field('Password', password), joining ? h('div', { class: 'form-row' }, field('Grade', grade), field('Section (optional)', section)) : null, error, submit);
    body.replaceChildren(h('div', { class: 'auth-mascot' }, mascot('cat')), h('p', { class: 'muted center' }, joining ? 'Save your discoveries, grow your knowledge, and collect little rewards.' : 'Your next a-ha moment is waiting.'), h('div', { class: 'segmented' }, button('Sign in', () => { joining = false; render(); }, joining ? '' : 'selected'), button('Join the lab', () => { joining = true; render(); }, joining ? 'selected' : '')), form, h('p', { class: 'fine-print' }, 'Local demo account. Data stays in this browser; this is not production security.'), !joining ? h('div', { class: 'dev-hint' }, icon('flask', 16), h('span', null, 'Demo admin: ', h('strong', null, 'admin / admin123')), button('×', eDismiss, 'text-button', { 'aria-label': 'Dismiss demo credential hint' })) : h('span'));
    function eDismiss() { body.querySelector('.dev-hint')?.remove(); }
  }
  render();
}
export function profileModal() {
  const user = currentUser(); if (!user) { authModal(); return; }
  const name = input('name', '', user.name), section = input('section', 'Your section', user.section); section.required = false;
  const grade = h('select', { name: 'grade' }, ...[7, 8, 9, 10].map(g => h('option', { value: g, selected: g === user.grade }, `Grade ${g}`)));
  let avatar = user.avatar;
  const avatars = h('div', { class: 'avatar-options' }, ...['cat', 'sprout', 'flask', 'planet', 'atom'].map(a => button(mascot(a), () => { avatar = a; [...avatars.children].forEach(n => n.classList.toggle('selected', n.getAttribute('data-avatar') === a)); }, `avatar-choice ${a === avatar ? 'selected' : ''}`, { 'aria-label': `Choose ${a} avatar`, 'data-avatar': a })));
  const { close } = modal('Your scientist profile', [h('p', { class: 'muted' }, user.id === 'guest' ? 'You’re exploring as a guest. Join the lab to keep a separate scientist profile.' : `@${user.username} · Saved in this browser`), avatars, field('Name', name), h('div', { class: 'form-row' }, field('Grade', grade), field('Section', section)), button('Save my profile', act(async () => { await dispatch({ type: 'UpdateProfile', name: name.value, grade: Number(grade.value), section: section.value, avatar }); close(); toast('Looking good, scientist!'); }), 'button primary full'), h('div', { class: 'profile-actions' }, button('Export my lab backup', () => download('cozy-science-backup.json', exportBackup()), 'text-button'), user.id === 'guest' ? button('Create an account', () => { close(); authModal(true); }, 'text-button') : button('Sign out', act(async () => { await logout(); await guestSession(); close(); go('/'); toast('Signed out. You’re exploring as a guest.'); }), 'text-button'))]);
}
