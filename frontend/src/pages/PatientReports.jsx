import { useState, useEffect } from 'react';
import { patientsAPI } from '../services/api';
import { PageHeader, Spinner, StatCard } from '../components/UI';
import { 
  Users, TrendingUp, UserCheck, AlertTriangle, 
  Calendar, PieChart as PieIcon, BarChart3, Activity
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B', '#10B981'];

export default function PatientReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientsAPI.analytics()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load analytics data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  // Prepare data for Recharts
  const genderData = Object.entries(data.gender_dist).map(([name, value]) => ({ name, value }));
  const ageData = Object.entries(data.age_dist).map(([name, value]) => ({ name, value }));
  const segmentData = Object.entries(data.segments)
    .filter(([name]) => name !== 'New (Last 30d)')
    .map(([name, value]) => ({ name, value }));

  const growthData = data.growth_trends;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Patient Population Analytics"
        subtitle="Insights and demographic segmentation for your clinic"
      />

      {/* KPI Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Total Registered" 
          value={data.total_patients} 
          icon={Users} 
          color="blue" 
        />
        <StatCard 
          label="New Patients (30d)" 
          value={data.segments['New (Last 30d)']} 
          icon={TrendingUp} 
          color="green" 
        />
        <StatCard 
          label="VIP Ratio" 
          value={`${data.total_patients > 0 ? ((data.segments.VIP / data.total_patients) * 100).toFixed(1) : 0}%`} 
          icon={UserCheck} 
          color="purple" 
        />
        <StatCard 
          label="High-Risk Alerts" 
          value={data.segments['High Risk']} 
          icon={AlertTriangle} 
          color="red" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Growth Momentum */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Acquisition Momentum (6 Months)</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Demographics */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Age Stratification</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{fontSize: 11, fontWeight: 600, fill: '#4B5563'}} />
                <Tooltip 
                  cursor={{fill: '#F9FAFB'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
              <PieIcon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Gender Mix</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clinical Segmentation */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Clinical Priority Segments</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                <Tooltip 
                  cursor={{fill: '#F9FAFB'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
