import { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { FormField } from './UI';

export default function AdvancedSearch({ onSearch, onClear, placeholder = "Global search..." }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [filters, setFilters] = useState({
    patient_id: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    status: '',
  });

  const handleGlobalChange = (e) => {
    const val = e.target.value;
    setGlobalSearch(val);
    onSearch({ search: val, ...filters });
  };

  const handleFilterChange = (field) => (e) => {
    const newFilters = { ...filters, [field]: e.target.value };
    setFilters(newFilters);
    onSearch({ search: globalSearch, ...newFilters });
  };

  const clearAll = () => {
    setGlobalSearch('');
    const emptyFilters = { patient_id: '', phone: '', email: '', date_of_birth: '', gender: '', status: '' };
    setFilters(emptyFilters);
    onClear();
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || globalSearch !== '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200">
      <div className="p-4 flex items-center gap-3 bg-gray-50/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
            placeholder={placeholder}
            value={globalSearch}
            onChange={handleGlobalChange}
          />
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isExpanded ? 'bg-blue-50 text-blue-600' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4 text-gray-600" />
          Advanced
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear all filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-gray-100 bg-white animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <FormField label="Patient ID">
              <input
                type="text"
                className="input-field py-1.5 text-xs truncate"
                placeholder="PAT-XXXX"
                value={filters.patient_id}
                onChange={handleFilterChange('patient_id')}
              />
            </FormField>
            <FormField label="Phone">
              <input
                type="text"
                className="input-field py-1.5 text-xs"
                placeholder="Search phone..."
                value={filters.phone}
                onChange={handleFilterChange('phone')}
              />
            </FormField>
            <FormField label="Email">
              <input
                type="text"
                className="input-field py-1.5 text-xs"
                placeholder="Search email..."
                value={filters.email}
                onChange={handleFilterChange('email')}
              />
            </FormField>
            <FormField label="Date of Birth">
              <input
                type="date"
                className="input-field py-1.5 text-xs"
                value={filters.date_of_birth}
                onChange={handleFilterChange('date_of_birth')}
              />
            </FormField>
            <FormField label="Gender">
              <select
                className="input-field py-1.5 text-xs text-red-500"
                value={filters.gender}
                onChange={handleFilterChange('gender')}
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </FormField>
            <FormField label="Status">
              <select
                className="input-field py-1.5 text-xs"
                value={filters.status}
                onChange={handleFilterChange('status')}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TRANSFERRED">Transferred</option>
                <option value="DECEASED">Deceased</option>
              </select>
            </FormField>
          </div>
        </div>
      )}
    </div>
  );
}





