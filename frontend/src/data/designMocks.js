export const MOCK_STATS = {
  totalProjects: 247,
  totalInvestment: 850, // billions
  beneficiaries: 75, // millions
  investors: 156,
};

const featuredProjects = [
  {
    id: 'mock-1',
    title: 'Sindh Solar Power Initiative Phase II',
    organization: 'Sindh Energy Department',
    province: 'Sindh',
    sector: 'Energy',
    trl: 7,
    status: 'Under Implementation',
    cost: '35.0B',
    fundingGap: '15.8B',
    roi: '14.5%',
    accentColor: '#059669',
  },
  {
    id: 'mock-2',
    title: 'Karachi Metro Line 2',
    organization: 'Karachi Municipal Corporation',
    province: 'Sindh',
    sector: 'Transport',
    trl: 5,
    status: 'Approved',
    cost: '120.0B',
    fundingGap: '80.0B',
    roi: '12%',
    accentColor: '#3b82f6',
  },
  {
    id: 'mock-3',
    title: 'Punjab Health Initiative',
    organization: 'Punjab Health Department',
    province: 'Punjab',
    sector: 'Health',
    trl: 6,
    status: 'Approved',
    cost: '8.0B',
    fundingGap: '3.0B',
    roi: '8.5%',
    accentColor: '#ec4899',
  },
  {
    id: 'mock-4',
    title: 'Pakistan Water Supply Project',
    organization: 'WASA Pakistan',
    province: 'Pakistan',
    sector: 'Water',
    trl: 4,
    status: 'Planning',
    cost: '15.0B',
    fundingGap: '10.0B',
    roi: '10%',
    accentColor: '#f97316',
  },
  {
    id: 'mock-5',
    title: 'KPK Tech Hub',
    organization: 'KPK IT Board',
    province: 'Khyber Pakhtunkhwa',
    sector: 'Technology',
    trl: 3,
    status: 'Planning',
    cost: '5.0B',
    fundingGap: '2.5B',
    roi: '18%',
    accentColor: '#ef4444',
  },
  {
    id: 'mock-6',
    title: 'Islamabad Green Transport',
    organization: 'CDA Islamabad',
    province: 'Islamabad Capital Territory',
    sector: 'Transport',
    trl: 6,
    status: 'Under Implementation',
    cost: '25.0B',
    fundingGap: '15.0B',
    roi: '11.5%',
    accentColor: '#06b6d4',
  },
];

export const MOCK_FEATURED_PROJECTS = featuredProjects.map((project, idx) => ({
  ...project,
  total_cost: project.total_cost || project.cost || null,
  funding_gap: project.funding_gap || project.fundingGap || null,
  expected_roi: project.expected_roi || project.roi || null,
  jobs_created: project.jobs_created || null,
  district: project.district || project.province || "Pakistan",
  primary_sector: project.primary_sector || project.sector,
  status: project.status?.toLowerCase?.().replace(/ /g, '_') || "under_implementation",
  organization_name: project.organization || project.organization_name,
}));

export const MOCK_SECTORS = [
  { name: 'Energy', count: 42 },
  { name: 'Transport', count: 38 },
  { name: 'Health', count: 35 },
  { name: 'Education', count: 32 },
  { name: 'Water', count: 28 },
  { name: 'Technology', count: 22 },
  { name: 'Agriculture', count: 18 },
  { name: 'Industry', count: 15 },
];

export const PROVINCE_OPTIONS = [
  'All Provinces',
  'Sindh',
  'Punjab',
  'Khyber Pakhtunkhwa',
  'Pakistan',
  'Islamabad Capital Territory',
];

export const STATUS_OPTIONS = ['All Status', 'Under Review', 'Approved', 'Under Implementation', 'Completed', 'Archived'];
