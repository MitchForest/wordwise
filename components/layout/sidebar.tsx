'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Plus, 
  Search,
  MoreVertical,
  FileText,
  Sparkles,
  Settings,
  LogOut,
  ChevronUp,
  Star,
  Trash2,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession, signOut } from '@/lib/auth/client';
import type { Document } from '@/lib/db/schema';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onDocumentTitleChange?: (documentId: string, newTitle: string) => void;
}

export function Sidebar({ collapsed, onToggle, onDocumentTitleChange }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Refresh documents when pathname changes (navigating between documents)
  useEffect(() => {
    if (pathname.startsWith('/doc/')) {
      // Debounce to avoid too many requests
      const timer = setTimeout(() => {
        fetchDocuments();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        
        // If we're currently viewing the deleted document, redirect to home
        if (pathname === `/doc/${documentId}`) {
          router.push('/');
        }
      } else {
        console.error('Failed to delete document');
        alert('Failed to delete document. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleStarDocument = async (documentId: string, starred: boolean) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ starred }),
      });

      if (response.ok) {
        // Update local state
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? { ...doc, starred } 
              : doc
          )
        );
      } else {
        console.error('Failed to update document star status');
      }
    } catch (error) {
      console.error('Error updating document star status:', error);
    }
  };

  const handleRenameDocument = async (documentId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      newTitle = 'Untitled Document';
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        // Update local state
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? { ...doc, title: newTitle } 
              : doc
          )
        );

        // Notify parent component if callback provided
        if (onDocumentTitleChange) {
          onDocumentTitleChange(documentId, newTitle);
        }
      } else {
        console.error('Failed to rename document');
      }
    } catch (error) {
      console.error('Error renaming document:', error);
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Documents are already sorted by the API (starred first, then by updatedAt)
  const sortedDocs = filteredDocs;

  const handleSignOut = async () => {
    try {
      await signOut();
      // Clear any local storage
      if (typeof window !== 'undefined') {
        // Clear all document drafts
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('doc_') && key.endsWith('_draft')) {
            localStorage.removeItem(key);
          }
        });
      }
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      // Force redirect even if sign out fails
      router.push('/');
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-white border-r border-neutral-200 flex flex-col h-full relative z-10 flex-shrink-0"
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-neutral-200 h-16 flex items-center justify-between">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-neutral-900">WordWise</span>
          </motion.div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "h-8 w-8 hover:bg-neutral-100",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* New Document Button */}
      <div className="p-4">
        <Button
          onClick={() => router.push('/new')}
          className={cn(
            "bg-blue-600 hover:bg-blue-700 text-white",
            collapsed 
              ? "w-8 h-8 p-0 justify-center" 
              : "w-full justify-start gap-2"
          )}
          variant="default"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>New Document</span>}
        </Button>
      </div>

      {/* Search Button (collapsed) or Search Input (expanded) */}
      {collapsed ? (
        <div className="px-4 pb-4 space-y-2">
          <Button
            onClick={onToggle}
            variant="ghost"
            className="w-8 h-8 p-0 justify-center hover:bg-neutral-100"
            title="Search documents"
          >
            <Search className="h-4 w-4 text-neutral-500" />
          </Button>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm border-neutral-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto px-2">
        {!collapsed ? (
          loading ? (
            <div className="space-y-2 p-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : sortedDocs.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {sortedDocs.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  collapsed={collapsed}
                  isActive={pathname === `/doc/${doc.id}`}
                  onNavigate={() => router.push(`/doc/${doc.id}`)}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onDelete={handleDeleteDocument}
                  onStar={handleStarDocument}
                  onRename={handleRenameDocument}
                />
              ))}
            </AnimatePresence>
          ) : (
            <p className="text-sm text-gray-500 p-4">No documents yet</p>
          )
        ) : (
          // Spacer when collapsed to keep avatar at bottom
          <div />
        )}
      </div>

      {/* User Section */}
      <UserDropdown 
        collapsed={collapsed}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        user={session?.user}
        onSignOut={handleSignOut}
      />
    </motion.aside>
  );
}

// Document Item Component
function DocumentItem({ 
  document, 
  collapsed, 
  isActive,
  onNavigate,
  openMenuId,
  setOpenMenuId,
  onDelete,
  onStar,
  onRename
}: { 
  document: Document;
  collapsed: boolean;
  isActive: boolean;
  onNavigate: () => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onDelete: (id: string) => void;
  onStar: (id: string, starred: boolean) => void;
  onRename: (id: string, title: string) => void;
}) {
  const showMenu = openMenuId === document.id;
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(document.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Update title when document prop changes
  useEffect(() => {
    setTitle(document.title);
  }, [document.title]);

  // Close menu when navigating to different document
  const handleNavigate = () => {
    setOpenMenuId(null);
    onNavigate();
  };

  // Calculate menu position when opening
  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (showMenu) {
      setOpenMenuId(null);
    } else {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.right - 160 // Adjusted for wider menu
        });
      }
      setOpenMenuId(document.id);
    }
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStar(document.id, !document.starred);
  };

  const handleRenameSubmit = () => {
    const newTitle = title.trim() || 'Untitled Document';
    onRename(document.id, newTitle);
    setIsEditing(false);
  };

  // Close menu when clicking outside or on escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };

    if (showMenu) {
      window.document.addEventListener('mousedown', handleClickOutside);
      window.document.addEventListener('keydown', handleEscape);
      return () => {
        window.document.removeEventListener('mousedown', handleClickOutside);
        window.document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showMenu, setOpenMenuId]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ x: collapsed ? 0 : 4 }}
      className={cn(
        "group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors mb-1",
        isActive ? "bg-blue-50 border border-blue-200" : "hover:bg-neutral-50",
        collapsed && "justify-center"
      )}
      onClick={handleNavigate}
    >
      {/* Icon */}
      <FileText className={cn(
        "h-4 w-4 flex-shrink-0",
        isActive ? "text-blue-600" : "text-neutral-500"
      )} />

      {!collapsed && (
        <>
          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRenameSubmit();
                  }
                  if (e.key === 'Escape') {
                    setTitle(document.title);
                    setIsEditing(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-1 py-0.5 text-sm bg-white border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <div>
                <div className="flex items-center gap-1">
                  <p className={cn(
                    "text-sm truncate",
                    isActive ? "text-blue-900 font-medium" : "text-neutral-700"
                  )}>{title}</p>
                  {document.starred && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(document.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleStarClick}
              className="p-1 hover:bg-neutral-100 rounded transition-colors"
              title={document.starred ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={cn(
                "h-3 w-3",
                document.starred 
                  ? "text-yellow-500 fill-yellow-500" 
                  : "text-neutral-400"
              )} />
            </button>
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={handleMenuToggle}
                className="p-1 hover:bg-neutral-100 rounded transition-colors relative"
              >
                <MoreVertical className="h-3 w-3 text-neutral-400" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-16 bg-neutral-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 flex items-center gap-1">
          {document.title}
          {document.starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
        </div>
      )}

      {/* Portal-based Dropdown Menu */}
      {showMenu && typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="fixed rounded-lg shadow-xl border border-neutral-200 py-1 min-w-[160px]"
            style={{ 
              backgroundColor: '#ffffff',
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 99999
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStar(document.id, !document.starred);
                setOpenMenuId(null);
              }}
              className="px-3 py-1.5 text-sm hover:bg-neutral-50 w-full text-left transition-colors flex items-center gap-2"
            >
              <Star className={cn(
                "h-4 w-4",
                document.starred 
                  ? "text-yellow-500 fill-yellow-500" 
                  : "text-neutral-400"
              )} />
              {document.starred ? 'Remove Star' : 'Add Star'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setOpenMenuId(null);
              }}
              className="px-3 py-1.5 text-sm hover:bg-neutral-50 w-full text-left transition-colors flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4 text-neutral-400" />
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(null);
                onDelete(document.id);
              }}
              className="px-3 py-1.5 text-sm hover:bg-red-50 w-full text-left text-red-600 transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </motion.div>
        </AnimatePresence>,
        window.document.body
      )}
    </motion.div>
  );
}

// User Dropdown Component
function UserDropdown({ 
  collapsed, 
  showUserMenu, 
  setShowUserMenu,
  user,
  onSignOut
}: { 
  collapsed: boolean;
  showUserMenu: boolean;
  setShowUserMenu: (show: boolean) => void;
  user?: {
    name?: string;
    email?: string;
  };
  onSignOut: () => void;
}) {
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [userMenuPosition, setUserMenuPosition] = useState({ top: 0, left: 0 });

  // Handle user menu toggle
  const handleUserMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (showUserMenu) {
      setShowUserMenu(false);
    } else {
      if (userButtonRef.current) {
        const rect = userButtonRef.current.getBoundingClientRect();
        setUserMenuPosition({
          top: rect.top - 120, // Position above the button
          left: collapsed ? rect.right + 8 : rect.left
        });
      }
      setShowUserMenu(true);
    }
  };

  // Close menu when clicking outside or on escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserMenu(false);
    };

    if (showUserMenu) {
      window.document.addEventListener('mousedown', handleClickOutside);
      window.document.addEventListener('keydown', handleEscape);
      return () => {
        window.document.removeEventListener('mousedown', handleClickOutside);
        window.document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showUserMenu, setShowUserMenu]);

  const userInitial = user?.name?.[0] || user?.email?.[0] || 'U';
  const userName = user?.name || 'User';
  const userEmail = user?.email || '';

  return (
    <div className="p-4 border-t border-neutral-200">
      <button
        ref={userButtonRef}
        onClick={handleUserMenuToggle}
        className={cn(
          "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition-colors",
          collapsed && "justify-center p-1"
        )}
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white font-medium">
          {userInitial.toUpperCase()}
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 text-left text-sm">
              <p className="font-medium text-neutral-900">{userName}</p>
              <p className="text-neutral-500 text-xs truncate">{userEmail}</p>
            </div>
            <ChevronUp className={cn(
              "h-4 w-4 text-neutral-400 transition-transform",
              showUserMenu && "rotate-180"
            )} />
          </>
        )}
      </button>

      {/* Portal-based User Menu */}
      {showUserMenu && typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            ref={userMenuRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed rounded-lg shadow-xl border border-neutral-200 py-2 min-w-[200px]"
            style={{ 
              backgroundColor: '#ffffff',
              top: userMenuPosition.top,
              left: userMenuPosition.left,
              zIndex: 99999
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Info Header */}
            <div className="px-4 py-2 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {userInitial.toUpperCase()}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium text-neutral-900">{userName}</p>
                  <p className="text-neutral-500 text-xs truncate">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(false);
                  // Settings logic here
                  console.log('Settings clicked');
                }}
                className="w-full px-4 py-2 text-sm hover:bg-neutral-50 text-left transition-colors flex items-center gap-3"
              >
                <Settings className="h-4 w-4 text-neutral-500" />
                Settings
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(false);
                  onSignOut();
                }}
                className="w-full px-4 py-2 text-sm hover:bg-red-50 text-left text-red-600 transition-colors flex items-center gap-3"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        </AnimatePresence>,
        window.document.body
      )}
    </div>
  );
} 