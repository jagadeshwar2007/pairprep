'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Subject, ResourceCategory, ResourceItem } from '@/types';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { Input } from '@/components/ui/Input';
import {
  Search,
  FileText,
  Upload,
} from 'lucide-react';

interface SubjectResourceViewProps {
  subject: Subject;
  resources: ResourceItem[];
}

export function SubjectResourceView({ subject, resources }: SubjectResourceViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: Array<{ id: ResourceCategory | 'all'; label: string; count: number }> = [
    { id: 'all', label: 'All Resources', count: resources.length },
    ...(Object.keys(CATEGORY_LABELS) as ResourceCategory[])
      .map((id) => ({ id, label: CATEGORY_LABELS[id].label, count: resources.filter((r) => r.category === id).length }))
      // Hide empty categories so the filter row stays short; always keep the active one visible.
      .filter((c) => c.count > 0 || c.id === selectedCategory),
  ];

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const matchesCategory =
        selectedCategory === 'all' || r.category === selectedCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesQuery;
    });
  }, [resources, selectedCategory, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Filter and Search Bar */}
      <div className="space-y-4">
        {/* Search input & contribution CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search notes, PYQs, topics (e.g. Trees, 2024 Midsem)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>

          <Link href={`/submit?subject=${subject.id}`}>
            <Button variant="primary" size="md" className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-2" />
              Submit Notes for this Course
            </Button>
          </Link>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-indigo-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resources Grid or Empty State */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => (
            <ResourceCard key={res.id} resource={res} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            <FileText className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              No resources found for this category
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Be the first MNNITian to share class notes, previous midsem papers, or tutorial solutions for {subject.name}!
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            {selectedCategory !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setSelectedCategory('all')}>
                Show All Categories ({resources.length})
              </Button>
            )}
            <Link href={`/submit?subject=${subject.id}`}>
              <Button variant="primary" size="sm">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Submit Resource Now
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
