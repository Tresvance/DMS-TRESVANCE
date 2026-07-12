import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { clinicSettingsAPI, clinicHolidaysAPI } from '../services/api';
import { Calendar, Clock, Save, Plus, Trash2, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClinicSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settingsId, setSettingsId] = useState(null);
  
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  const defaultHours = DAYS.reduce((acc, day) => {
    acc[day] = { closed: day === 'SUN', start: '09:00', end: '17:00' };
    return acc;
  }, {});

  const [operatingHours, setOperatingHours] = useState(defaultHours);
  const [bufferTime, setBufferTime] = useState(10);
  const [maxAppointments, setMaxAppointments] = useState(20);

  // Holidays state
  const [holidays, setHolidays] = useState([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Settings
      const resSettings = await clinicSettingsAPI.list();
      if (resSettings.data && resSettings.data.length > 0) {
        const data = resSettings.data[0];
        setSettingsId(data.id);
        if (data.operating_hours) setOperatingHours(data.operating_hours);
        setBufferTime(data.buffer_time_minutes);
        setMaxAppointments(data.max_appointments_per_day_per_dentist);
      }

      // Fetch Holidays
      const resHolidays = await clinicHolidaysAPI.list();
      setHolidays(resHolidays.data);
    } catch (err) {
      toast.error('Failed to load clinic settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const payload = {
        operating_hours: operatingHours,
        buffer_time_minutes: bufferTime,
        max_appointments_per_day_per_dentist: maxAppointments
      };

      if (settingsId) {
        await clinicSettingsAPI.patch(settingsId, payload);
        toast.success('Settings updated successfully.');
      } else {
        const res = await clinicSettingsAPI.create(payload);
        setSettingsId(res.data.id);
        toast.success('Settings saved successfully.');
      }
    } catch (err) {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    try {
      const res = await clinicHolidaysAPI.create({
        name: newHolidayName,
        date: newHolidayDate
      });
      setHolidays([res.data, ...holidays]);
      setNewHolidayName('');
      setNewHolidayDate('');
      toast.success('Holiday added.');
    } catch (err) {
      toast.error('Failed to add holiday.');
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await clinicHolidaysAPI.delete(id);
      setHolidays(holidays.filter(h => h.id !== id));
      toast.success('Holiday deleted.');
    } catch (err) {
      toast.error('Failed to delete holiday.');
    }
  };

  const handleDayChange = (day, field, value) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinic Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your clinic's schedule, operating hours, and holidays.</p>
        </div>
        {activeTab === 'general' && (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </div>

      <div className="flex space-x-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" /> General Schedule
          </div>
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'holidays' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Public Holidays
          </div>
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">Operating Hours</h2>
              </div>
              <div className="p-6 space-y-4">
                {DAYS.map(day => {
                  const data = operatingHours[day];
                  return (
                    <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-24 font-medium text-gray-700">{day}</div>
                      <label className="flex items-center gap-2 cursor-pointer w-24">
                        <input
                          type="checkbox"
                          checked={!data.closed}
                          onChange={(e) => handleDayChange(day, 'closed', !e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">{data.closed ? 'Closed' : 'Open'}</span>
                      </label>
                      {!data.closed && (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={data.start}
                            onChange={(e) => handleDayChange(day, 'start', e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="time"
                            value={data.end}
                            onChange={(e) => handleDayChange(day, 'end', e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-medium text-gray-900">Appointment Rules</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Time (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={bufferTime}
                    onChange={(e) => setBufferTime(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. 10"
                  />
                  <p className="mt-1 text-xs text-gray-500">Rest time between consecutive appointments.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Appointments / Day</label>
                  <input
                    type="number"
                    min="0"
                    value={maxAppointments}
                    onChange={(e) => setMaxAppointments(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. 20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Maximum appointments a dentist can handle in one day. 0 for unlimited.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'holidays' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <form onSubmit={handleAddHoliday} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Holiday</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                  <input
                    type="text"
                    required
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Christmas Day"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Holiday
                </button>
              </div>
            </form>
          </div>
          
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Upcoming Holidays</h3>
                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  {holidays.length} total
                </span>
              </div>
              <div className="divide-y divide-gray-200">
                {holidays.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No holidays configured yet.
                  </div>
                ) : (
                  holidays.map(holiday => (
                    <div key={holiday.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="font-medium text-gray-900">{holiday.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
