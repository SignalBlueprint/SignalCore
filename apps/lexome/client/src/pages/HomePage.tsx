import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { booksApi, libraryApi } from '../services/api';
import type { Book, LibraryStats } from '../types';
import BookCard from '../components/BookCard';

export default function HomePage() {
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [booksRes, statsRes] = await Promise.all([
        booksApi.getPopular(1),
        libraryApi.getStats().catch(() => ({ data: null })),
      ]);
      setPopularBooks(booksRes.data.results.slice(0, 6));
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Lexome
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Your AI-enhanced e-reader with access to 70,000+ classic books from Project Gutenberg.
          Get intelligent context, annotations, and reading assistance powered by AI.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link to="/discover" className="btn btn-primary text-lg px-8 py-3">
            Discover Books
          </Link>
          <Link to="/library" className="btn btn-outline text-lg px-8 py-3">
            My Library
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      {stats && stats.totalBooks > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard
            label="Books in Library"
            value={stats.totalBooks}
            icon="📚"
          />
          <StatCard
            label="Currently Reading"
            value={stats.booksReading}
            icon="📖"
          />
          <StatCard
            label="Books Finished"
            value={stats.booksFinished}
            icon="✅"
          />
          <StatCard
            label="Avg Rating"
            value={stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
            icon="⭐"
          />
        </div>
      )}

      {/* Features Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Features
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon="🤖"
            title="AI-Powered Assistance"
            description="Get instant explanations, translations of archaic language, and contextual definitions as you read."
          />
          <FeatureCard
            icon="📝"
            title="Smart Annotations"
            description="Create notes with AI-generated context. Organize with tags and make them public or private."
          />
          <FeatureCard
            icon="📊"
            title="Reading Analytics"
            description="Track your reading progress, sessions, words read, and get personalized book recommendations."
          />
        </div>
      </div>

      {/* Popular Books */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Popular Books
          </h2>
          <Link to="/discover" className="text-primary-600 hover:text-primary-700 font-medium">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-64 animate-pulse bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {popularBooks.map((book) => (
              <BookCard key={book.id} book={book} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="card p-6 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {label}
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="card p-6">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}
