// Must match the projects.province ENUM in the DB exactly (values are validated server-side).
export const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
  'Islamabad Capital Territory',
];

export const DISTRICTS = [
  'Quetta','Gwadar','Turbat','Khuzdar','Kalat','Chaman','Zhob',
  'Loralai','Sibi','Dera Bugti','Bolan','Mastung','Panjgur','Washuk',
  'Awaran','Kech','Lasbela','Jhal Magsi','Kharan','Nushki','Chaghi',
  'Qilla Saifullah','Qilla Abdullah','Pishin','Ziarat','Harnai',
  'Kohlu','Musakhel','Barkhan','Sherani','Dukki','Jaffarabad',
  'Nasirabad','Jhal Magsi','Sohbatpur','Usta Muhammad'
];

export const SECTORS = [
  'Energy & Power','Water & Sanitation','Agriculture & Food','Health & Medical',
  'Education & Training','Transport & Logistics','Technology & IT','Infrastructure',
  'Housing & Real Estate','Industry & Manufacturing','Tourism & Hospitality',
  'Environment & Climate','Finance & Banking','Telecoms & Communications',
  'Retail & Commerce','Construction','Arts & Culture','Media & Entertainment',
  'Social Services','Research & Development','Defense & Security','Sports & Recreation',
  'Mining & Minerals','Fisheries & Coastal','CPEC Infrastructure','Other'
];

export const SDG_GOALS = [
  { id: 1, name: 'No Poverty', color: '#e5243b' },
  { id: 2, name: 'Zero Hunger', color: '#dda63a' },
  { id: 3, name: 'Good Health', color: '#4c9f38' },
  { id: 4, name: 'Quality Education', color: '#c5192d' },
  { id: 5, name: 'Gender Equality', color: '#ff3a21' },
  { id: 6, name: 'Clean Water', color: '#26bde2' },
  { id: 7, name: 'Affordable Energy', color: '#fcc30b' },
  { id: 8, name: 'Decent Work', color: '#a21942' },
  { id: 9, name: 'Industry & Innovation', color: '#fd6925' },
  { id: 10, name: 'Reduced Inequalities', color: '#dd1367' },
  { id: 11, name: 'Sustainable Cities', color: '#fd9d24' },
  { id: 12, name: 'Responsible Consumption', color: '#bf8b2e' },
  { id: 13, name: 'Climate Action', color: '#3f7e44' },
  { id: 14, name: 'Life Below Water', color: '#0a97d9' },
  { id: 15, name: 'Life on Land', color: '#56c02b' },
  { id: 16, name: 'Peace & Justice', color: '#00689d' },
  { id: 17, name: 'Partnerships', color: '#19486a' },
];

export const TRL_LEVELS = [
  { level: 1, name: 'Basic Principles', desc: 'Basic scientific principles observed and reported.' },
  { level: 2, name: 'Concept Formulated', desc: 'Technology concept and potential application formulated.' },
  { level: 3, name: 'Proof of Concept', desc: 'Experimental proof of concept demonstrated.' },
  { level: 4, name: 'Lab Validated', desc: 'Technology validated in a laboratory environment.' },
  { level: 5, name: 'Relevant Environment', desc: 'Technology validated in a relevant (real-world) environment.' },
  { level: 6, name: 'Prototype', desc: 'Prototype demonstrated in a relevant environment.' },
  { level: 7, name: 'System Complete', desc: 'System prototype demonstrated in an operational environment.' },
  { level: 8, name: 'Proven', desc: 'Actual system completed and qualified through testing.' },
  { level: 9, name: 'Operational', desc: 'Actual system proven in a full operational environment.' },
];

export const CURRENCIES = ['PKR','USD','EUR','GBP','CNY','AED','SAR','JPY'];

// A3 — Carbon-market readiness
export const CARBON_STANDARDS = ['Verra (VCS)','Gold Standard','CDM','Article 6.2','Article 6.4','Plan Vivo','Other','None'];
export const CARBON_CREDIT_STATUS = ['Not started','Under validation','Validated','Registered','Issuing'];

// A4 — Feasibility
export const FEASIBILITY_STATUS = ['Not started','In progress','Completed'];

// B3 — Water-Energy-Food nexus
export const WEF_NEXUS = ['Water','Energy','Food'];

// B4 — line ministry / sponsoring body
export const LINE_MINISTRIES = [
  'Ministry of Climate Change & Environmental Coordination',
  'Ministry of Water Resources',
  'Ministry of Energy (Power Division)',
  'Ministry of Energy (Petroleum Division)',
  'Ministry of National Food Security & Research',
  'Ministry of Planning, Development & Special Initiatives',
  'Ministry of Industries & Production',
  'Ministry of Science & Technology',
  'Ministry of National Health Services, Regulations & Coordination',
  'Ministry of Federal Education & Professional Training',
  'Ministry of Communications',
  'Ministry of Maritime Affairs',
  'Ministry of Housing & Works',
  'Provincial Government Department',
  'Other',
];

export const PARTNER_TYPES = ['Donor','Implementing','Technical','Financial','Government','Private Sector','Academic','Other'];

export const STATUS_COLORS = {
  draft: 'gray', under_review: 'yellow', approved: 'green',
  rejected: 'red', changes_requested: 'orange',
  under_implementation: 'blue', completed: 'purple',
  archived: 'gray',
};

export const UPDATE_TYPES = ['milestone','progress','funding','construction','team','issue','announcement','general'];
