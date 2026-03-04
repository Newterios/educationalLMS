'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { getTranslations } from '@/i18n';
import { newsApi } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function NewsPage() {
  const { user, locale, isAdmin } = useStore();
  const t = getTranslations(locale);
  const tn = (t as any).news || {} as any;
  const { toast } = useToast();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', pinned: false });
  const [sending, setSending] = useState(false);

  const load = () => {
    newsApi.list().then((r) => { setArticles(r.news || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSending(true);
    try {
      await newsApi.create({
        title_en: form.title, title_ru: form.title, title_kk: form.title,
        content_en: form.content, content_ru: form.content, content_kk: form.content,
        author_id: user?.id || '', author_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        pinned: form.pinned,
      });
      toast('News published!', 'success');
      setForm({ title: '', content: '', pinned: false });
      setShowForm(false);
      load();
    } catch { toast('Failed to publish', 'error'); }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    try { await newsApi.delete(id); load(); } catch { toast('Failed to delete', 'error'); }
  };

  const getTitle = (a: any) => locale === 'ru' ? (a.title_ru || a.title_en) : locale === 'kk' ? (a.title_kk || a.title_en) : a.title_en;
  const getContent = (a: any) => locale === 'ru' ? (a.content_ru || a.content_en) : locale === 'kk' ? (a.content_kk || a.content_en) : a.content_en;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{tn.title || 'News'}</h1>
        {isAdmin() && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            {showForm ? (t.common.cancel) : `+ ${tn.create || 'Create News'}`}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{tn.title_label || 'Title'}</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Enter news title..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{tn.content || 'Content'}</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
              placeholder="Write news content..." />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> {tn.pinned || 'Pinned'}
            </label>
            <div className="flex-1" />
            <button onClick={handleCreate} disabled={sending || !form.title.trim() || !form.content.trim()}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
              {sending ? '...' : (tn.publish || 'Publish')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">{t.common.loading}</div>
      ) : articles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p className="text-slate-400">{tn.no_news || 'No news published yet'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((a: any) => (
            <article key={a._id} className={`bg-white border rounded-xl overflow-hidden transition hover:shadow-md ${a.pinned ? 'border-brand-300 ring-1 ring-brand-50' : 'border-slate-200'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {a.pinned && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                          {tn.pinned || 'Pinned'}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {new Date(a.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{getTitle(a)}</h2>
                  </div>
                  {isAdmin() && (
                    <button onClick={() => handleDelete(a._id)}
                      className="text-slate-400 hover:text-red-500 p-1 transition flex-shrink-0" title={t.common.delete}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">{getContent(a)}</p>
                <p className="text-xs text-slate-400 mt-3">
                  {tn.by || 'by'} <span className="font-medium text-slate-500">{a.author_name}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
