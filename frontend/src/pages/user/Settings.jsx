import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { settingsAPI } from '@/services/api'
import { useI18n } from '@/i18n'

export default function Settings(){
  const { t, locale, setLocale } = useI18n()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({})
  const [tab, setTab] = useState('profile')
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirm: '' })

  useEffect(()=>{ load() },[])

  async function load(){
    try{
      setLoading(true)
      const res = await settingsAPI.get()
      setSettings(res.data.settings || {})
      if(res.data.settings?.preferredLanguage) setLocale(res.data.settings.preferredLanguage)
    }catch(e){
      console.error(e)
    }finally{ setLoading(false) }
  }

  async function saveProfile(){
    await settingsAPI.update({
      name: settings.name,
      country: settings.country,
      phone: settings.phone,
      profilePicture: settings.profilePicture,
      preferredLanguage: locale
    })
    alert('Saved')
  }

  async function savePayment(){
    await settingsAPI.update({ paymentMethod: settings.paymentMethod, paymentAccount: settings.paymentAccount })
    alert('Saved')
  }

  async function saveNotifications(){
    // store locally for now; could be extended to backend
    localStorage.setItem('notifications', JSON.stringify(settings.notifications || {}))
    alert('Saved')
  }

  async function changePassword(){
    if(password.newPassword !== password.confirm){ return alert('Passwords do not match') }
    await settingsAPI.changePassword(password.currentPassword, password.newPassword)
    alert('Password changed')
    setPassword({ currentPassword: '', newPassword: '', confirm: '' })
  }

  if(loading) return <DashboardLayout><div className="p-6">Loading...</div></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
            <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
          </div>
          <div>
            <select value={locale} onChange={(e)=>{ setLocale(e.target.value); settings.preferredLanguage = e.target.value; settingsAPI.update({ preferredLanguage: e.target.value }) }} className="input">
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-64">
            <ul className="space-y-2">
              <li><button className={`w-full text-left ${tab==='profile'?'font-bold':''}`} onClick={()=>setTab('profile')}>{t('settings.profile')}</button></li>
              <li><button className={`w-full text-left ${tab==='security'?'font-bold':''}`} onClick={()=>setTab('security')}>{t('settings.security')}</button></li>
              <li><button className={`w-full text-left ${tab==='payment'?'font-bold':''}`} onClick={()=>setTab('payment')}>{t('settings.payment')}</button></li>
              <li><button className={`w-full text-left ${tab==='notifications'?'font-bold':''}`} onClick={()=>setTab('notifications')}>{t('settings.notifications')}</button></li>
            </ul>
          </div>

          <div className="flex-1">
            {tab==='profile' && (
              <div className="space-y-4">
                <div>
                  <label>Full name</label>
                  <input className="input" value={settings.name||''} onChange={(e)=>setSettings({...settings, name: e.target.value})} />
                </div>
                <div>
                  <label>Email</label>
                  <input className="input" value={settings.email||''} disabled />
                </div>
                <div>
                  <label>Username</label>
                  <input className="input" value={settings.username||''} onChange={(e)=>setSettings({...settings, username: e.target.value})} />
                </div>
                <div>
                  <label>Country</label>
                  <input className="input" value={settings.country||''} onChange={(e)=>setSettings({...settings, country: e.target.value})} />
                </div>
                <div>
                  <label>Phone number</label>
                  <input className="input" value={settings.phone||''} onChange={(e)=>setSettings({...settings, phone: e.target.value})} />
                </div>
                <div>
                  <label>Profile picture URL</label>
                  <input className="input" value={settings.profilePicture||''} onChange={(e)=>setSettings({...settings, profilePicture: e.target.value})} />
                </div>
                <div>
                  <button className="btn btn-primary" onClick={saveProfile}>{t('settings.save')}</button>
                </div>
              </div>
            )}

            {tab==='security' && (
              <div className="space-y-4">
                <div>
                  <label>Current password</label>
                  <input type="password" className="input" value={password.currentPassword} onChange={(e)=>setPassword({...password, currentPassword: e.target.value})} />
                </div>
                <div>
                  <label>New password</label>
                  <input type="password" className="input" value={password.newPassword} onChange={(e)=>setPassword({...password, newPassword: e.target.value})} />
                </div>
                <div>
                  <label>Confirm new password</label>
                  <input type="password" className="input" value={password.confirm} onChange={(e)=>setPassword({...password, confirm: e.target.value})} />
                </div>
                <div>
                  <button className="btn btn-primary" onClick={changePassword}>{t('settings.change_password')}</button>
                </div>
              </div>
            )}

            {tab==='payment' && (
              <div className="space-y-4">
                <div>
                  <label>Payment method</label>
                  <select className="input" value={settings.paymentMethod||''} onChange={(e)=>setSettings({...settings, paymentMethod: e.target.value})}>
                    <option value="">Select</option>
                    <option value="payoneer">Payoneer</option>
                    <option value="skrill">Skrill</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>
                <div>
                  <label>Account email / wallet</label>
                  <input className="input" value={settings.paymentAccount||''} onChange={(e)=>setSettings({...settings, paymentAccount: e.target.value})} />
                </div>
                <div>
                  <button className="btn btn-primary" onClick={savePayment}>{t('buttons.save')}</button>
                </div>
              </div>
            )}

            {tab==='notifications' && (
              <div className="space-y-4">
                <div>
                  <label><input type="checkbox" checked={(settings.notifications?.email ?? true)} onChange={(e)=>setSettings({...settings, notifications: {...settings.notifications, email: e.target.checked}})} /> Email notifications</label>
                </div>
                <div>
                  <label><input type="checkbox" checked={(settings.notifications?.payments ?? true)} onChange={(e)=>setSettings({...settings, notifications: {...settings.notifications, payments: e.target.checked}})} /> Payment alerts</label>
                </div>
                <div>
                  <label><input type="checkbox" checked={(settings.notifications?.offers ?? true)} onChange={(e)=>setSettings({...settings, notifications: {...settings.notifications, offers: e.target.checked}})} /> New offer alerts</label>
                </div>
                <div>
                  <button className="btn btn-primary" onClick={saveNotifications}>{t('buttons.save')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
