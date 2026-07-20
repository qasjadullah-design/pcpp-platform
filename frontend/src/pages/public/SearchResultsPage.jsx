import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchAPI } from '../../services/api';

export default function SearchResultsPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState({ projects: [], documents: [] });
  const q = params.get('q') || '';
  useEffect(() => { if (q) searchAPI.search({ q }).then(setResults).catch(() => setResults({ projects: [], documents: [] })); }, [q]);
  return <div className="max-w-5xl mx-auto px-4 py-10"><h1 className="text-2xl font-bold mb-5">Search PCPP</h1><form onSubmit={e=>{e.preventDefault();setParams(query.trim()?{q:query.trim()}:{});}} className="flex gap-2 mb-8"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects and documents" className="flex-1 border rounded-lg px-4 py-2"/><button className="bg-emerald-700 text-white px-5 rounded-lg">Search</button></form>{q && <>{[['Projects',results.projects,'id','title'],['Documents',results.documents,'id','title']].map(([label,items,key,title])=><section key={label} className="mb-7"><h2 className="font-semibold mb-3">{label}</h2>{items?.map(item=><Link key={item[key]} to={`/projects/${item.project_id || item.id}`} className="block border rounded-xl p-4 mb-3"><div className="font-medium">{item[title] || item.file_name}</div><div className="text-sm text-gray-500">{item.project_title || item.primary_sector || item.province}</div><p className="text-sm text-gray-600 mt-2" dangerouslySetInnerHTML={{__html:item.snippet}} /></Link>)}{!items?.length&&<p className="text-sm text-gray-500">No matches.</p>}</section>)}</>}</div>;
}
