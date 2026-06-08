import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { interestsAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { formatCurrency } from '../../utils/constants';
import { Building2, MessageCircle, Send, Wallet, MapPin } from 'lucide-react';

const statusMeta = {
  owner_replied: { label: 'Owner replied', color: 'green' },
  closed: { label: 'Closed', color: 'gray' },
  pending: { label: 'Pending response', color: 'yellow' },
};

const formatRange = (min, max) => {
  if (!min && !max) return 'Not specified';
  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
};

export default function MyInterestsPage() {
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interestsAPI.getMine().then(r => setInterests(Array.isArray(r) ? r : r?.interests || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-pcpp-pine">My Interests</h1>
        <p className="text-sm text-ink-secondary">Projects you have expressed interest in</p>
      </div>

      {loading ? <p>Loading...</p> : interests.length === 0 ? (
        <div className="text-center py-20 text-ink-secondary bg-pcpp-card border border-pcpp-border rounded-card">
          <Send size={40} strokeWidth={1.75} className="mx-auto mb-4 text-ink-secondary" />
          <p className="font-medium text-ink">No interests yet</p>
          <Link to="/projects" className="text-pcpp-emerald hover:underline text-sm">Browse projects to invest</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {interests.map(i => {
            const meta = statusMeta[i.status] || statusMeta.pending;
            return (
              <div key={i.id} className="bg-pcpp-card border border-pcpp-border rounded-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-pcpp-emerald/10 rounded-control flex items-center justify-center text-pcpp-emerald shrink-0">
                      <Building2 size={20} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-ink leading-snug">{i.project_title || i.project?.title}</h3>
                        <Badge label={meta.label} color={meta.color} dot />
                      </div>
                      <p className="text-xs text-ink-secondary">{i.organization_name || 'Project owner'} • {i.primary_sector || 'Sector not set'}</p>
                      <p className="text-xs text-ink-tertiary mt-1 inline-flex items-center gap-1">
                        <MapPin size={13} strokeWidth={1.75} />
                        {[i.district, i.province].filter(Boolean).join(', ') || 'Pakistan'}
                      </p>
                    </div>
                  </div>
                  <Link to={`/projects/${i.project_id}`} className="text-sm border border-pcpp-border text-ink-secondary px-3 py-1.5 rounded-control hover:bg-pcpp-mist">View Project</Link>
                </div>

                <div className="grid md:grid-cols-4 gap-3 mt-4 text-sm">
                  <div className="border border-pcpp-border rounded-control p-3">
                    <p className="text-xs text-ink-secondary mb-1">Project Cost</p>
                    <p className="font-semibold text-ink">{formatCurrency(i.total_cost)}</p>
                  </div>
                  <div className="border border-pcpp-border rounded-control p-3">
                    <p className="text-xs text-ink-secondary mb-1">Funding Gap</p>
                    <p className="font-semibold text-pcpp-emerald">{formatCurrency(i.funding_gap)}</p>
                  </div>
                  <div className="border border-pcpp-border rounded-control p-3">
                    <p className="text-xs text-ink-secondary mb-1">My Range</p>
                    <p className="font-semibold text-ink">{formatRange(i.investment_range_min, i.investment_range_max)}</p>
                  </div>
                  <div className="border border-pcpp-border rounded-control p-3">
                    <p className="text-xs text-ink-secondary mb-1">Expressed</p>
                    <p className="font-semibold text-ink">{new Date(i.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {i.message && (
                  <div className="mt-4 bg-pcpp-mist rounded-control p-3">
                    <p className="text-xs font-medium text-ink-secondary mb-1 inline-flex items-center gap-1"><Wallet size={13} strokeWidth={1.75} /> My interest note</p>
                    <p className="text-sm text-ink-secondary whitespace-pre-line">{i.message}</p>
                  </div>
                )}

                {i.owner_response && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-control p-3">
                    <p className="text-xs font-medium text-emerald-700 mb-1 inline-flex items-center gap-1"><MessageCircle size={13} strokeWidth={1.75} /> Owner response</p>
                    <p className="text-sm text-emerald-900 whitespace-pre-line">{i.owner_response}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
