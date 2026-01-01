import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Layout() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Lexome</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-1">
              <NavLink to="/" active={isActive('/')}>Home</NavLink>
              <NavLink to="/discover" active={isActive('/discover')}>Discover</NavLink>
              <NavLink to="/library" active={isActive('/library')}>My Library</NavLink>
              <NavLink to="/annotations" active={isActive('/annotations')}>Annotations</NavLink>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex space-x-1 pb-3 overflow-x-auto">
            <NavLink to="/" active={isActive('/')} mobile>Home</NavLink>
            <NavLink to="/discover" active={isActive('/discover')} mobile>Discover</NavLink>
            <NavLink to="/library" active={isActive('/library')} mobile>Library</NavLink>
            <NavLink to="/annotations" active={isActive('/annotations')} mobile>Notes</NavLink>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Powered by <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">Project Gutenberg</a> - 70,000+ free books</p>
            <p className="mt-1">AI-enhanced reading experience with OpenAI GPT-4</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface NavLinkProps {
  to: string;
  active: boolean;
  children: React.ReactNode;
  mobile?: boolean;
}

function NavLink({ to, active, children, mobile }: NavLinkProps) {
  const baseClasses = mobile
    ? "px-3 py-1.5 text-sm rounded-md whitespace-nowrap"
    : "px-3 py-2 rounded-md text-sm font-medium";

  const activeClasses = active
    ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700";

  return (
    <Link to={to} className={`${baseClasses} ${activeClasses}`}>
      {children}
    </Link>
  );
}
