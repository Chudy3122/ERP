import { useEffect, useMemo, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Mail as MailIcon, Plus, Inbox, Send, FileText, Trash2, AlertCircle, Star,
  RefreshCw, Paperclip, X, Reply, Loader2, ChevronLeft, Server,
} from 'lucide-react';
import * as emailApi from '../api/email.api';
import type {
  EmailAccount, MailFolder, MessageSummary, MessageDetail,
} from '../types/email.types';

const LH_PRESET = { imap_host: 'mail-serwer296764.lh.pl', imap_port: 993, smtp_host: 'mail-serwer296764.lh.pl', smtp_port: 465 };

function folderIcon(f: MailFolder) {
  const su = (f.specialUse || '').toLowerCase();
  if (su.includes('sent')) return Send;
  if (su.includes('trash')) return Trash2;
  if (su.includes('draft')) return FileText;
  if (su.includes('junk')) return AlertCircle;
  if (f.path.toUpperCase() === 'INBOX') return Inbox;
  return MailIcon;
}

function folderLabel(f: MailFolder) {
  if (f.path.toUpperCase() === 'INBOX') return 'Odebrane';
  const su = (f.specialUse || '').toLowerCase();
  if (su.includes('sent')) return 'Wysłane';
  if (su.includes('trash')) return 'Kosz';
  if (su.includes('draft')) return 'Robocze';
  if (su.includes('junk')) return 'Spam';
  return f.name;
}

function addr(list: { name?: string; address?: string }[]) {
  if (!list?.length) return '—';
  return list.map((a) => a.name || a.address || '').filter(Boolean).join(', ');
}

function fmtDate(d: string | null) {
  if (!d) return '';
  const date = new Date(d);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Mail() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [folder, setFolder] = useState('INBOX');
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [openMsg, setOpenMsg] = useState<MessageDetail | null>(null);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

  const account = useMemo(() => accounts.find((a) => a.id === accountId) || null, [accounts, accountId]);

  // ── Load accounts ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const list = await emailApi.listAccounts();
        setAccounts(list);
        if (list.length && !accountId) setAccountId(list[0].id);
      } catch {
        toast.error('Nie udało się pobrać kont pocztowych');
      } finally {
        setLoadingAccounts(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load folders when account changes ─────────────────────────────────────--
  useEffect(() => {
    if (!accountId) return;
    setFolders([]); setFolder('INBOX'); setOpenMsg(null);
    (async () => {
      try {
        const f = await emailApi.listFolders(accountId);
        setFolders(f);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Nie udało się pobrać folderów');
      }
    })();
  }, [accountId]);

  // ── Load messages when account/folder/page changes ───────────────────────--
  useEffect(() => {
    if (!accountId) return;
    setLoadingList(true); setOpenMsg(null);
    (async () => {
      try {
        const data = await emailApi.listMessages(accountId, folder, page);
        setMessages(data.messages);
        setTotal(data.total);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Nie udało się pobrać wiadomości');
        setMessages([]); setTotal(0);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [accountId, folder, page]);

  const reloadList = async () => {
    if (!accountId) return;
    setLoadingList(true);
    try {
      const data = await emailApi.listMessages(accountId, folder, page);
      setMessages(data.messages); setTotal(data.total);
    } catch { /* ignore */ } finally { setLoadingList(false); }
  };

  const openMessage = async (uid: number) => {
    if (!accountId) return;
    setLoadingMsg(true);
    try {
      const msg = await emailApi.getMessage(accountId, folder, uid);
      setOpenMsg(msg);
      setMessages((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się otworzyć wiadomości');
    } finally {
      setLoadingMsg(false);
    }
  };

  const onDeleteMessage = async (uid: number) => {
    if (!accountId) return;
    try {
      await emailApi.deleteMessage(accountId, folder, uid);
      setMessages((prev) => prev.filter((m) => m.uid !== uid));
      if (openMsg?.uid === uid) setOpenMsg(null);
      toast.success('Wiadomość usunięta');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się usunąć');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D]">
              <MailIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Poczta</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Twoje skrzynki w jednym miejscu</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {accounts.length > 0 && (
              <button
                onClick={() => setShowCompose(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f]"
              >
                <Plus className="h-4 w-4" /> Nowa wiadomość
              </button>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Server className="h-4 w-4" /> Dodaj skrzynkę
            </button>
          </div>
        </div>

        {loadingAccounts ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F7941D]" /></div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center dark:border-gray-700 dark:bg-gray-800">
            <MailIcon className="mb-3 h-10 w-10 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Brak podpiętych skrzynek</h3>
            <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
              Dodaj swoją skrzynkę (np. LH), żeby czytać i wysyłać maile bezpośrednio w ERP.
            </p>
            <button onClick={() => setShowAdd(true)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f]">
              <Plus className="h-4 w-4" /> Dodaj skrzynkę
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {/* Left: accounts + folders */}
            <aside className="col-span-12 lg:col-span-3 space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setAccountId(a.id); setPage(1); }}
                    className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      a.id === accountId ? 'bg-[#F7941D]/10 text-[#F7941D]' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <MailIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{a.display_name || a.email}</span>
                    <Trash2
                      className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setDeleteAccountId(a.id); }}
                    />
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
                {folders.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-gray-400">Ładowanie folderów…</div>
                ) : (
                  folders.map((f) => {
                    const Icon = folderIcon(f);
                    return (
                      <button
                        key={f.path}
                        onClick={() => { setFolder(f.path); setPage(1); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          folder === f.path ? 'bg-gray-100 font-semibold text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{folderLabel(f)}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Middle: message list */}
            <section className={`col-span-12 ${openMsg ? 'hidden lg:block lg:col-span-4' : 'lg:col-span-9'}`}>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {folders.find((f) => f.path === folder) ? folderLabel(folders.find((f) => f.path === folder)!) : folder}
                    <span className="ml-2 text-xs font-normal text-gray-400">{total} wiad.</span>
                  </h3>
                  <button onClick={reloadList} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#F7941D] dark:hover:bg-gray-700" title="Odśwież">
                    <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingList ? (
                  <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#F7941D]" /></div>
                ) : messages.length === 0 ? (
                  <div className="px-4 py-16 text-center text-sm text-gray-400">Brak wiadomości w tym folderze.</div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {messages.map((m) => (
                      <li key={m.uid}>
                        <button
                          onClick={() => openMessage(m.uid)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            openMsg?.uid === m.uid ? 'bg-[#F7941D]/5' : ''
                          }`}
                        >
                          <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${m.seen ? 'bg-transparent' : 'bg-[#F7941D]'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`truncate text-sm ${m.seen ? 'text-gray-600 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white'}`}>
                                {folder.toLowerCase().includes('sent') ? addr(m.to) : addr(m.from)}
                              </span>
                              <span className="flex-shrink-0 text-xs text-gray-400">{fmtDate(m.date)}</span>
                            </div>
                            <div className={`truncate text-sm ${m.seen ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                              {m.subject}
                            </div>
                          </div>
                          {m.hasAttachments && <Paperclip className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />}
                          {m.flagged && <Star className="mt-1 h-3.5 w-3.5 flex-shrink-0 fill-amber-400 text-amber-400" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-xs dark:border-gray-700">
                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded px-2 py-1 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">‹ Nowsze</button>
                    <span className="text-gray-500">{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded px-2 py-1 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">Starsze ›</button>
                  </div>
                )}
              </div>
            </section>

            {/* Right: reader */}
            {openMsg && (
              <section className="col-span-12 lg:col-span-5">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                    <button onClick={() => setOpenMsg(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-700"><ChevronLeft className="h-4 w-4" /></button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowCompose(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" title="Odpowiedz"><Reply className="h-4 w-4" /> Odpowiedz</button>
                      <button onClick={() => onDeleteMessage(openMsg.uid)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="Usuń"><Trash2 className="h-4 w-4" /></button>
                      <button onClick={() => setOpenMsg(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-4 w-4" /></button>
                    </div>
                  </div>

                  {loadingMsg ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#F7941D]" /></div>
                  ) : (
                    <div className="flex max-h-[70vh] flex-col">
                      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{openMsg.subject}</h2>
                        <div className="mt-2 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <div><span className="font-semibold">Od:</span> {addr(openMsg.from)}</div>
                          <div><span className="font-semibold">Do:</span> {addr(openMsg.to)}</div>
                          {openMsg.cc.length > 0 && <div><span className="font-semibold">DW:</span> {addr(openMsg.cc)}</div>}
                          <div>{openMsg.date ? new Date(openMsg.date).toLocaleString('pl-PL') : ''}</div>
                        </div>
                        {openMsg.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {openMsg.attachments.map((att) => (
                              <button
                                key={att.index}
                                onClick={() => accountId && emailApi.downloadAttachment(accountId, folder, openMsg.uid, att.index, att.filename)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                <Paperclip className="h-3.5 w-3.5" /> {att.filename}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 overflow-auto">
                        {openMsg.html ? (
                          <iframe
                            title="Treść wiadomości"
                            sandbox=""
                            className="h-[55vh] w-full bg-white"
                            srcDoc={openMsg.html}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap break-words px-5 py-4 text-sm text-gray-800 dark:text-gray-200">{openMsg.text || '(pusta wiadomość)'}</pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <AddAccountModal
          onClose={() => setShowAdd(false)}
          onAdded={(acc) => { setAccounts((prev) => [...prev, acc]); setAccountId(acc.id); setShowAdd(false); }}
        />
      )}

      {showCompose && account && (
        <ComposeModal
          account={account}
          reply={openMsg}
          onClose={() => setShowCompose(false)}
          onSent={() => { setShowCompose(false); toast.success('Wiadomość wysłana'); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteAccountId}
        title="Usunąć skrzynkę?"
        message="Konto zostanie odłączone z ERP. Same maile na serwerze pozostają nienaruszone."
        confirmText="Usuń"
        onConfirm={async () => {
          if (!deleteAccountId) return;
          try {
            await emailApi.deleteAccount(deleteAccountId);
            setAccounts((prev) => prev.filter((a) => a.id !== deleteAccountId));
            if (accountId === deleteAccountId) { setAccountId(null); setOpenMsg(null); }
            toast.success('Skrzynka usunięta');
          } catch { toast.error('Nie udało się usunąć'); }
          setDeleteAccountId(null);
        }}
        onClose={() => setDeleteAccountId(null)}
      />
    </MainLayout>
  );
}

// ── Add account modal ─────────────────────────────────────────────────────────
function AddAccountModal({ onClose, onAdded }: { onClose: () => void; onAdded: (a: EmailAccount) => void }) {
  const [form, setForm] = useState({
    email: '', display_name: '', username: '', password: '',
    imap_host: '', imap_port: 993, smtp_host: '', smtp_port: 465,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const applyLH = () => setForm((f) => ({ ...f, ...LH_PRESET }));

  const submit = async () => {
    if (!form.email || !form.password || !form.imap_host || !form.smtp_host) {
      toast.error('Uzupełnij e-mail, hasło i adresy serwerów');
      return;
    }
    setSaving(true);
    try {
      const acc = await emailApi.addAccount({
        email: form.email,
        display_name: form.display_name || undefined,
        username: form.username || undefined,
        password: form.password,
        imap_host: form.imap_host,
        imap_port: Number(form.imap_port) || 993,
        imap_secure: true,
        smtp_host: form.smtp_host,
        smtp_port: Number(form.smtp_port) || 465,
        smtp_secure: true,
      });
      if (acc.smtpWarning) toast(acc.smtpWarning, { icon: '⚠️', duration: 8000 });
      else toast.success('Skrzynka dodana');
      onAdded(acc);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się dodać skrzynki');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const label = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dodaj skrzynkę</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <button onClick={applyLH} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Wypełnij dla LH</button>
            <span className="text-xs text-gray-400">Sprawdź adres serwera w panelu poczty (np. mail-serwerXXXXXX.lh.pl)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={label}>Adres e-mail *</label>
              <input className={input} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jan.kowalski@firma.pl" />
            </div>
            <div className="col-span-2">
              <label className={label}>Nazwa wyświetlana</label>
              <input className={input} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="Jan Kowalski" />
            </div>
            <div className="col-span-2">
              <label className={label}>Hasło *</label>
              <input type="password" className={input} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" />
            </div>
            <div className="col-span-2">
              <label className={label}>Login (jeśli inny niż e-mail)</label>
              <input className={input} value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="zwykle = adres e-mail" />
            </div>
            <div>
              <label className={label}>Serwer IMAP *</label>
              <input className={input} value={form.imap_host} onChange={(e) => set('imap_host', e.target.value)} placeholder="mail-serwerXXXXXX.lh.pl" />
            </div>
            <div>
              <label className={label}>Port IMAP</label>
              <input type="number" className={input} value={form.imap_port} onChange={(e) => set('imap_port', e.target.value)} />
            </div>
            <div>
              <label className={label}>Serwer SMTP *</label>
              <input className={input} value={form.smtp_host} onChange={(e) => set('smtp_host', e.target.value)} placeholder="mail-serwerXXXXXX.lh.pl" />
            </div>
            <div>
              <label className={label}>Port SMTP</label>
              <input type="number" className={input} value={form.smtp_port} onChange={(e) => set('smtp_port', e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-gray-400">Połączenia szyfrowane (SSL). Hasło jest zapisywane zaszyfrowane.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Anuluj</button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Dodaj i połącz
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compose modal ─────────────────────────────────────────────────────────────
function ComposeModal({
  account, reply, onClose, onSent,
}: { account: EmailAccount; reply: MessageDetail | null; onClose: () => void; onSent: () => void }) {
  const replyTo = reply?.from?.[0]?.address || '';
  const [to, setTo] = useState(reply ? replyTo : '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(reply ? `Re: ${reply.subject.replace(/^re:\s*/i, '')}` : '');
  const [text, setText] = useState(
    reply ? `\n\n----- Oryginalna wiadomość -----\nOd: ${replyTo}\nTemat: ${reply.subject}\n\n${reply.text || ''}` : '',
  );
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!to.trim()) { toast.error('Podaj odbiorcę'); return; }
    setSending(true);
    try {
      await emailApi.sendMail(account.id, {
        to, cc: cc || undefined, subject,
        text,
        inReplyTo: reply?.messageId || undefined,
        references: reply?.messageId || undefined,
        attachments: files,
      });
      onSent();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się wysłać');
    } finally {
      setSending(false);
    }
  };

  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{reply ? 'Odpowiedz' : 'Nowa wiadomość'}</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <div className="text-xs text-gray-400">Od: {account.display_name ? `${account.display_name} <${account.email}>` : account.email}</div>
          <input className={input} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Do (oddziel przecinkami)" />
          <input className={input} value={cc} onChange={(e) => setCc(e.target.value)} placeholder="DW (opcjonalnie)" />
          <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Temat" />
          <textarea className={`${input} min-h-[200px] resize-y`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Treść wiadomości…" />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  <Paperclip className="h-3 w-3" /> {f.name}
                  <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} />
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            <Paperclip className="h-4 w-4" /> Załącz
            <input type="file" multiple className="hidden" onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])} />
          </label>
          <button onClick={submit} disabled={sending} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-60">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Wyślij
          </button>
        </div>
      </div>
    </div>
  );
}
