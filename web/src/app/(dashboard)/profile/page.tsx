'use client';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { getTranslations, localeNames, type Locale } from '@/i18n';
import { userApi, mediaApi } from '@/lib/api';
import { useToast } from '@/lib/toast';

const COUNTRY_CODES = [
  { code: '+7', country: 'KZ', flag: 'KZ' },
  { code: '+7', country: 'RU', flag: 'RU' },
  { code: '+998', country: 'UZ', flag: 'UZ' },
  { code: '+996', country: 'KG', flag: 'KG' },
  { code: '+993', country: 'TM', flag: 'TM' },
  { code: '+1', country: 'US', flag: 'US' },
  { code: '+44', country: 'UK', flag: 'GB' },
  { code: '+49', country: 'DE', flag: 'DE' },
  { code: '+86', country: 'CN', flag: 'CN' },
  { code: '+82', country: 'KR', flag: 'KR' },
];

export default function ProfilePage() {
  const { user, locale, setLocale, setUser } = useStore();
  const t = getTranslations(locale);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [countryCode, setCountryCode] = useState(user?.country_code || '+7');
  const [birthDate, setBirthDate] = useState(user?.birth_date || '');
  const [iin, setIin] = useState(user?.iin || '');
  const [groupId, setGroupId] = useState(user?.group_id || '');
  const [groups, setGroups] = useState<any[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const avatarUrl = avatarPreview || user?.avatar_url;

  useEffect(() => {
    userApi.groups().then(r => setGroups(r.groups || [])).catch(() => {});
    if (user?.id) {
      userApi.get(user.id).then((p: any) => {
        if (p.phone) setPhone(p.phone);
        if (p.country_code) setCountryCode(p.country_code);
        if (p.birth_date) setBirthDate(p.birth_date);
        if (p.iin) setIin(p.iin);
        if (p.group_id) setGroupId(p.group_id);
      }).catch(() => {});
    }
  }, [user?.id]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast(locale === 'ru' ? 'Выберите изображение' : 'Please select an image', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast(locale === 'ru' ? 'Макс. размер 5MB' : 'Max size 5MB', 'error');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      let newAvatarUrl = user.avatar_url;
      if (avatarFile) {
        const uploadRes = await userApi.uploadAvatar(user.id, avatarFile);
        newAvatarUrl = mediaApi.getFileUrl((uploadRes as any).id);
      }
      await userApi.updateProfile(user.id, {
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
        country_code: countryCode,
        birth_date: birthDate || undefined,
        iin: iin || undefined,
        avatar_url: newAvatarUrl,
      });
      setUser({ ...user, first_name: firstName, last_name: lastName, avatar_url: newAvatarUrl,
        phone, country_code: countryCode, birth_date: birthDate, iin });
      setAvatarFile(null);
      setAvatarPreview(null);
      toast(locale === 'ru' ? 'Профиль сохранён' : locale === 'kk' ? 'Профиль сақталды' : 'Profile saved', 'success');
    } catch {
      toast(locale === 'ru' ? 'Ошибка сохранения' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  const groupName = groups.find(g => g.id === groupId)?.name;

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">{t.nav.profile}</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-100">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200" />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-sm">
                {user?.first_name?.[0] || 'U'}{user?.last_name?.[0] || ''}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{user?.first_name} {user?.last_name}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-brand-600 font-medium">{user?.role_name}</span>
              {groupName && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{groupName}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t.auth.first_name}</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t.auth.last_name}</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.auth.email}</label>
            <input type="email" defaultValue={user?.email} disabled
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {locale === 'ru' ? 'Телефон' : locale === 'kk' ? 'Телефон' : 'Phone number'}
            </label>
            <div className="flex gap-2">
              <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                className="w-28 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {COUNTRY_CODES.map((cc, i) => (
                  <option key={`${cc.country}-${i}`} value={cc.code}>{cc.flag} {cc.code}</option>
                ))}
              </select>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="7001234567"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {locale === 'ru' ? 'Дата рождения' : locale === 'kk' ? 'Туған күні' : 'Date of birth'}
            </label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {locale === 'ru' ? 'ИИН' : locale === 'kk' ? 'ЖСН' : 'IIN (Individual ID)'}
            </label>
            <input type="text" value={iin} onChange={(e) => setIin(e.target.value.replace(/[^\d]/g, '').slice(0, 12))}
              placeholder="000000000000" maxLength={12}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono tracking-wider" />
            {iin && iin.length !== 12 && iin.length > 0 && (
              <p className="text-xs text-red-500 mt-1">{locale === 'ru' ? 'ИИН должен содержать 12 цифр' : 'IIN must be 12 digits'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {locale === 'ru' ? 'Группа' : locale === 'kk' ? 'Топ' : 'Group'}
            </label>
            <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 flex items-center justify-between">
              {groupName ? (
                <span className="text-slate-900 font-medium">{groupName}</span>
              ) : (
                <span>{locale === 'ru' ? 'Не назначена' : 'Not assigned'}</span>
              )}
              <span className="text-[10px] text-slate-400">{locale === 'ru' ? 'Назначается администратором' : 'Assigned by admin'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.common.language}</label>
            <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {Object.entries(localeNames).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}
            </select>
          </div>

          <div className="pt-2">
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition disabled:opacity-50">
              {saving ? (locale === 'ru' ? 'Сохранение...' : 'Saving...') : t.common.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
