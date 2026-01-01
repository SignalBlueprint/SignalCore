import { useState, useEffect } from 'react';
import { annotationsApi } from '../services/api';
import type { Annotation } from '../types';

export default function AnnotationsPage() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [filteredAnnotations, setFilteredAnnotations] = useState<Annotation[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnotations();
  }, []);

  useEffect(() => {
    filterAnnotations();
  }, [annotations, selectedTag, searchQuery]);

  const loadAnnotations = async () => {
    try {
      const [annotationsRes, tagsRes] = await Promise.all([
        annotationsApi.getAll(),
        annotationsApi.getTags(),
      ]);
      setAnnotations(annotationsRes.data);
      setTags(tagsRes.data);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAnnotations = () => {
    let filtered = [...annotations];

    if (selectedTag) {
      filtered = filtered.filter(a => a.tags.includes(selectedTag));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.textSelection.toLowerCase().includes(query) ||
        a.noteContent?.toLowerCase().includes(query)
      );
    }

    // Sort by most recent
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredAnnotations(filtered);
  };

  const handleDeleteAnnotation = async (id: string) => {
    if (!confirm('Delete this annotation?')) return;
    try {
      await annotationsApi.delete(id);
      await loadAnnotations();
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        My Annotations
      </h1>

      {/* Search and Filters */}
      <div className="card p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search annotations..."
            className="input"
          />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="input"
          >
            <option value="">All Tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {(selectedTag || searchQuery) && (
          <button
            onClick={() => {
              setSelectedTag('');
              setSearchQuery('');
            }}
            className="text-sm text-primary-600 hover:text-primary-700 mt-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {annotations.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Annotations
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {tags.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Unique Tags
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {annotations.filter(a => a.isPublic).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Public
          </div>
        </div>
      </div>

      {/* Annotations List */}
      {filteredAnnotations.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">
            {annotations.length === 0
              ? "No annotations yet. Start reading and highlight text to create annotations!"
              : "No annotations match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnotations.map((annotation) => (
            <AnnotationCard
              key={annotation.id}
              annotation={annotation}
              onDelete={handleDeleteAnnotation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AnnotationCardProps {
  annotation: Annotation;
  onDelete: (id: string) => void;
}

function AnnotationCard({ annotation, onDelete }: AnnotationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-6">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {annotation.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
            {annotation.isPublic && (
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                Public
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(annotation.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={() => onDelete(annotation.id)}
          className="text-gray-400 hover:text-red-600 transition-colors"
          aria-label="Delete annotation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Selected Text */}
      <blockquote className="border-l-4 border-primary-500 pl-4 py-2 mb-3 bg-gray-50 dark:bg-gray-800">
        <p className="text-gray-900 dark:text-white italic">
          "{annotation.textSelection}"
        </p>
      </blockquote>

      {/* User Note */}
      {annotation.noteContent && (
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            My Note:
          </h4>
          <p className="text-gray-900 dark:text-white">
            {annotation.noteContent}
          </p>
        </div>
      )}

      {/* AI Context (Expandable) */}
      {annotation.aiContext && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            {expanded ? '▼' : '▶'} AI Context
          </button>
          {expanded && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-gray-900 dark:text-white">
                {annotation.aiContext}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
